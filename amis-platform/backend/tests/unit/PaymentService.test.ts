/**
 * Testes do PaymentService com Prisma e Stripe MOCKADOS.
 * Validam o fluxo PCI-DSS: criação de Customer idempotente, criação do
 * PaymentIntent e persistência do gatewayRefId, retornando o client_secret.
 */
jest.mock('../../src/config/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), update: jest.fn() },
    pagamento: { create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  },
}));

jest.mock('../../src/config/stripe', () => ({
  stripe: {
    customers: { create: jest.fn() },
    paymentIntents: { create: jest.fn() },
  },
}));

import { prisma } from '../../src/config/prisma';
import { stripe } from '../../src/config/stripe';
import { PaymentService } from '../../src/services/PaymentService';

const p = prisma as unknown as {
  user: { findUnique: jest.Mock; update: jest.Mock };
  pagamento: { create: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
};
const s = stripe as unknown as {
  customers: { create: jest.Mock };
  paymentIntents: { create: jest.Mock };
};

const userId = '44444444-4444-4444-4444-444444444444';

describe('PaymentService.createPaymentIntent', () => {
  it('cria customer (quando ausente), gera PaymentIntent e retorna client_secret', async () => {
    p.user.findUnique.mockResolvedValue({
      id: userId,
      nome: 'Aluno',
      email: 'aluno@amis.local',
      stripeCustomerId: null,
    });
    s.customers.create.mockResolvedValue({ id: 'cus_123' });
    p.user.update.mockResolvedValue({});
    p.pagamento.create.mockResolvedValue({ id: 'pag_1' });
    s.paymentIntents.create.mockResolvedValue({
      id: 'pi_abc',
      client_secret: 'pi_abc_secret_xyz',
    });
    p.pagamento.update.mockResolvedValue({});

    const result = await PaymentService.createPaymentIntent({ userId, valor: 149.9 });

    expect(s.customers.create).toHaveBeenCalledTimes(1);
    expect(result.clientSecret).toBe('pi_abc_secret_xyz');
    expect(result.paymentIntentId).toBe('pi_abc');

    // Converteu reais -> centavos corretamente.
    const piArg = s.paymentIntents.create.mock.calls[0][0];
    expect(piArg.amount).toBe(14990);
    expect(piArg.currency).toBe('brl');

    // Persistiu o gatewayRefId no registro local.
    expect(p.pagamento.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { gatewayRefId: 'pi_abc' } }),
    );
  });

  it('reutiliza o stripeCustomerId existente (idempotência de cliente)', async () => {
    p.user.findUnique.mockResolvedValue({
      id: userId,
      nome: 'Aluno',
      email: 'aluno@amis.local',
      stripeCustomerId: 'cus_existing',
    });
    p.pagamento.create.mockResolvedValue({ id: 'pag_2' });
    s.paymentIntents.create.mockResolvedValue({
      id: 'pi_def',
      client_secret: 'pi_def_secret',
    });
    p.pagamento.update.mockResolvedValue({});

    await PaymentService.createPaymentIntent({ userId, valor: 50 });

    expect(s.customers.create).not.toHaveBeenCalled();
    const piArg = s.paymentIntents.create.mock.calls[0][0];
    expect(piArg.customer).toBe('cus_existing');
  });

  it('marca pagamento como FALHOU quando a Stripe lança erro', async () => {
    p.user.findUnique.mockResolvedValue({
      id: userId,
      nome: 'Aluno',
      email: 'aluno@amis.local',
      stripeCustomerId: 'cus_existing',
    });
    p.pagamento.create.mockResolvedValue({ id: 'pag_3' });
    s.paymentIntents.create.mockRejectedValue(new Error('stripe down'));
    p.pagamento.update.mockResolvedValue({});

    await expect(
      PaymentService.createPaymentIntent({ userId, valor: 80 }),
    ).rejects.toMatchObject({ code: 'PAYMENT_INIT_FAILED' });

    expect(p.pagamento.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'FALHOU' } }),
    );
  });
});

describe('PaymentService.updateStatusByGatewayRef', () => {
  it('atualiza o status pelo gatewayRefId', async () => {
    p.pagamento.updateMany.mockResolvedValue({ count: 1 });
    await PaymentService.updateStatusByGatewayRef('pi_abc', 'PAGO');
    expect(p.pagamento.updateMany).toHaveBeenCalledWith({
      where: { gatewayRefId: 'pi_abc' },
      data: { status: 'PAGO' },
    });
  });
});
