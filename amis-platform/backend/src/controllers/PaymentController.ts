/**
 * ============================================================================
 * PaymentController - Cobranças e Webhook da Stripe
 * ----------------------------------------------------------------------------
 * - createIntent: rota protegida por RBAC (apenas GESTOR pode emitir cobranças).
 *   Retorna o `client_secret` para o mobile finalizar o pagamento na SDK
 *   nativa da Stripe (o backend nunca vê dados de cartão -> PCI-DSS).
 * - webhook: recebe eventos da Stripe. A AUTENTICIDADE é verificada via
 *   assinatura (`stripe-signature`) + STRIPE_WEBHOOK_SECRET. É a fonte da
 *   verdade do status do pagamento: nunca confiamos apenas no cliente.
 * ============================================================================
 */
import type { Request, Response } from 'express';
import type Stripe from 'stripe';
import { PaymentService } from '../services/PaymentService';
import { stripe } from '../config/stripe';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { AppError } from '../utils/AppError';
import type { CriarPagamentoInput } from '../schemas/payment.schema';

export class PaymentController {
  /** POST /api/pagamentos/intent — cria uma intenção de pagamento. */
  static async createIntent(req: Request, res: Response): Promise<void> {
    const body = req.body as CriarPagamentoInput;

    const result = await PaymentService.createPaymentIntent({
      userId: body.userId,
      valor: body.valor,
      descricao: body.descricao,
    });

    res.status(201).json({
      status: 'success',
      data: {
        clientSecret: result.clientSecret,
        pagamentoId: result.pagamentoId,
      },
    });
  }

  /** GET /api/pagamentos — histórico do usuário autenticado. */
  static async listMine(req: Request, res: Response): Promise<void> {
    if (!req.user) throw AppError.unauthorized();
    const pagamentos = await PaymentService.listByUser(req.user.id);
    res.status(200).json({ status: 'success', data: { pagamentos } });
  }

  /**
   * POST /api/pagamentos/webhook — recebe eventos da Stripe.
   * IMPORTANTE: esta rota usa o corpo BRUTO (raw), pois a verificação de
   * assinatura depende dos bytes exatos do payload (ver server.ts).
   */
  static async webhook(req: Request, res: Response): Promise<void> {
    const signature = req.headers['stripe-signature'];

    if (!env.STRIPE_WEBHOOK_SECRET || !signature) {
      // Sem segredo configurado não há como confiar no evento.
      res.status(400).json({ status: 'error', message: 'Webhook não configurado.' });
      return;
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body as Buffer,
        signature as string,
        env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      logger.warn('Assinatura de webhook inválida', {
        message: err instanceof Error ? err.message : String(err),
      });
      res.status(400).json({ status: 'error', message: 'Assinatura inválida.' });
      return;
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await PaymentService.updateStatusByGatewayRef(pi.id, 'PAGO');
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await PaymentService.updateStatusByGatewayRef(pi.id, 'FALHOU');
        break;
      }
      default:
        logger.debug('Evento de webhook ignorado', { type: event.type });
    }

    // Sempre 200 rapidamente para a Stripe não reenviar desnecessariamente.
    res.status(200).json({ received: true });
  }
}
