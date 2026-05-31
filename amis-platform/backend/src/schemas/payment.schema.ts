/**
 * Schemas Zod para pagamentos. O valor é validado como número positivo com no
 * máximo 2 casas decimais (centavos). Nenhum dado de cartão é aceito pela API
 * (custódia 100% delegada à Stripe) -> conformidade PCI-DSS.
 */
import { z } from 'zod';

export const criarPagamentoSchema = z.object({
  userId: z.string().uuid('userId deve ser um UUID válido.'),
  // Valor em reais (ex.: 150.00). Limites evitam abusos/overflow.
  valor: z
    .number()
    .positive('O valor deve ser positivo.')
    .max(100_000, 'Valor acima do limite permitido.')
    .refine((v) => Number((v * 100).toFixed(0)) / 100 === v, {
      message: 'O valor deve ter no máximo 2 casas decimais.',
    }),
  descricao: z.string().trim().max(255).optional(),
});

export type CriarPagamentoInput = z.infer<typeof criarPagamentoSchema>;
