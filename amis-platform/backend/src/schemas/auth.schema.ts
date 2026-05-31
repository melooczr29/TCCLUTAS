/**
 * Schemas Zod para autenticação. A validação de senha forte e e-mail
 * normalizado acontece aqui, antes de qualquer acesso ao banco.
 */
import { z } from 'zod';

export const registerSchema = z.object({
  nome: z.string().trim().min(3, 'Nome deve ter ao menos 3 caracteres.').max(120),
  email: z.string().trim().toLowerCase().email('E-mail inválido.').max(180),
  senha: z
    .string()
    .min(8, 'A senha deve ter no mínimo 8 caracteres.')
    .max(72, 'A senha deve ter no máximo 72 caracteres.') // limite do bcrypt
    .regex(/[A-Z]/, 'A senha deve conter ao menos uma letra maiúscula.')
    .regex(/[a-z]/, 'A senha deve conter ao menos uma letra minúscula.')
    .regex(/[0-9]/, 'A senha deve conter ao menos um número.'),
  // Por padrão cadastra-se como ALUNO; SENSEI/GESTOR exigem fluxo aprovado.
  role: z.enum(['ALUNO', 'SENSEI']).optional().default('ALUNO'),
  telefone: z.string().trim().min(8).max(20).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
  senha: z.string().min(1, 'Senha obrigatória.'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
