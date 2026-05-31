/**
 * Schemas Zod para o registro de presença. Note o uso de `.uuid()` para
 * garantir que os IDs recebidos sejam UUIDs válidos antes de tocar o banco.
 */
import { z } from 'zod';

export const registrarPresencaSchema = z.object({
  // Token assinado lido do QR Code apresentado na aula.
  qrToken: z.string().trim().min(10, 'QR token inválido.').max(512),
  senseiId: z.string().uuid('senseiId deve ser um UUID válido.'),
  dataAula: z.coerce.date({ invalid_type_error: 'dataAula deve ser uma data válida.' }),
  status: z.enum(['PRESENTE', 'FALTA', 'JUSTIFICADO']).optional().default('PRESENTE'),
  observacao: z.string().trim().max(255).optional(),
});

export const listarPresencaQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type RegistrarPresencaInput = z.infer<typeof registrarPresencaSchema>;
