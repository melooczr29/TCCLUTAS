/**
 * ============================================================================
 * PaymentService - Integração segura com a Stripe (PCI-DSS)
 * ----------------------------------------------------------------------------
 * FLUXO (Payment Sheet / PaymentIntent):
 *
 *   [Mobile] pede cobrança --> [Backend] cria PaymentIntent na Stripe -->
 *   [Stripe] devolve `client_secret` --> [Backend] repassa ao mobile -->
 *   [Mobile] usa @stripe/stripe-react-native para coletar o cartão e
 *   confirmar o pagamento DIRETAMENTE com a Stripe.
 *
 * Por que isso é PCI-DSS Compliant:
 *  - O número do cartão (PAN), CVV e validade JAMAIS passam pelo nosso backend
 *    nem são persistidos. A coleta acontece na SDK nativa da Stripe.
 *  - Guardamos apenas o `stripeCustomerId` e o `gatewayRefId` (id do
 *    PaymentIntent), que são referências opacas — não são dados de cartão.
 *
 * Robustez:
 *  - Idempotência: garantimos um Customer Stripe por usuário (cria 1x e
 *    persiste o id), evitando clientes duplicados em chamadas concorrentes.
 *  - Valor convertido para a menor unidade monetária (centavos) exigida pela
 *    Stripe, com arredondamento explícito para evitar erros de ponto flutuante.
 *  - Registro local do Pagamento em estado PENDENTE; o status final é
 *    confirmado via webhook (ver webhookController), nunca confiando apenas no
 *    cliente.
 * ============================================================================
 */
import type { StatusPagamento } from '@prisma/client';
import { prisma } from '../config/prisma';
import { stripe } from '../config/stripe';
import { AppError } from '../utils/AppError';
import { logger } from '../config/logger';

export interface CreatePaymentParams {
  /** UUID do usuário que será cobrado. */
  userId: string;
  /** Valor em reais (ex.: 149.90). */
  valor: number;
  /** Descrição opcional (ex.: "Mensalidade Judô - Junho/2026"). */
  descricao?: string;
}

export interface CreatePaymentResult {
  /** Segredo usado pelo mobile para confirmar o pagamento na SDK da Stripe. */
  clientSecret: string;
  /** ID do nosso registro de Pagamento (UUID). */
  pagamentoId: string;
  /** ID do PaymentIntent na Stripe (gatewayRefId). */
  paymentIntentId: string;
  /** Chave publicável NÃO é retornada aqui; o app já a possui via env própria. */
}

const CURRENCY = 'brl';

export class PaymentService {
  /**
   * Garante que o usuário possua um Customer na Stripe. Se ainda não tiver,
   * cria e persiste o `stripeCustomerId`. Operação idempotente do ponto de
   * vista do nosso domínio (1 customer por usuário).
   */
  private static async ensureStripeCustomer(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw AppError.notFound('Usuário não encontrado.', 'USER_NOT_FOUND');
    }

    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    const customer = await stripe.customers.create({
      email: user.email,
      name: user.nome,
      // metadata ajuda a reconciliar no painel da Stripe sem expor PII sensível.
      metadata: { appUserId: user.id },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customer.id },
    });

    logger.info('Stripe customer criado', { appUserId: user.id });
    return customer.id;
  }

  /**
   * Cria uma Intenção de Pagamento (PaymentIntent) e o registro local.
   * Retorna o `client_secret` para o app finalizar o pagamento.
   */
  static async createPaymentIntent(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const { userId, valor, descricao } = params;

    const customerId = await this.ensureStripeCustomer(userId);

    // Stripe trabalha com a menor unidade monetária (centavos para BRL).
    const amountInCents = Math.round(valor * 100);
    if (amountInCents <= 0) {
      throw AppError.badRequest('Valor de cobrança inválido.', 'INVALID_AMOUNT');
    }

    // 1) Registro local PENDENTE primeiro, para termos rastreabilidade mesmo
    //    que a chamada à Stripe falhe parcialmente.
    const pagamento = await prisma.pagamento.create({
      data: {
        userId,
        valor,
        status: 'PENDENTE',
        descricao: descricao ?? null,
      },
    });

    try {
      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: amountInCents,
          currency: CURRENCY,
          customer: customerId,
          description: descricao ?? 'Pagamento AMIS',
          // Habilita métodos automáticos (cartão, etc.) configurados no painel.
          automatic_payment_methods: { enabled: true },
          // Vincula a transação ao nosso registro para reconciliação no webhook.
          metadata: {
            pagamentoId: pagamento.id,
            appUserId: userId,
          },
        },
        {
          // Idempotência da Stripe: reenvios não criam intents duplicados.
          idempotencyKey: `pi_${pagamento.id}`,
        },
      );

      if (!paymentIntent.client_secret) {
        throw new Error('Stripe não retornou client_secret.');
      }

      // 2) Persiste a referência da Stripe no nosso registro.
      await prisma.pagamento.update({
        where: { id: pagamento.id },
        data: { gatewayRefId: paymentIntent.id },
      });

      logger.info('PaymentIntent criado', {
        pagamentoId: pagamento.id,
        paymentIntentId: paymentIntent.id,
      });

      return {
        clientSecret: paymentIntent.client_secret,
        pagamentoId: pagamento.id,
        paymentIntentId: paymentIntent.id,
      };
    } catch (err) {
      // Marca o pagamento como FALHOU para não deixar registros "fantasmas".
      await prisma.pagamento
        .update({ where: { id: pagamento.id }, data: { status: 'FALHOU' } })
        .catch(() => undefined);

      logger.error('Falha ao criar PaymentIntent', {
        pagamentoId: pagamento.id,
        message: err instanceof Error ? err.message : String(err),
      });
      throw AppError.badRequest(
        'Não foi possível iniciar o pagamento. Tente novamente.',
        'PAYMENT_INIT_FAILED',
      );
    }
  }

  /**
   * Atualiza o status de um pagamento a partir do `gatewayRefId`.
   * Chamado pelo webhook da Stripe (fonte da verdade do status financeiro).
   */
  static async updateStatusByGatewayRef(
    gatewayRefId: string,
    status: StatusPagamento,
  ): Promise<void> {
    const result = await prisma.pagamento.updateMany({
      where: { gatewayRefId },
      data: { status },
    });

    if (result.count === 0) {
      logger.warn('Webhook referenciou pagamento inexistente', { gatewayRefId });
    } else {
      logger.info('Status de pagamento atualizado', { gatewayRefId, status });
    }
  }

  static async listByUser(userId: string) {
    return prisma.pagamento.findMany({
      where: { userId },
      orderBy: { dataCriacao: 'desc' },
      select: {
        id: true,
        valor: true,
        status: true,
        descricao: true,
        gatewayRefId: true,
        dataCriacao: true,
      },
    });
  }
}
