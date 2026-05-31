/**
 * Testes do AuthService com Prisma MOCKADO (sem banco real).
 * Validam regras de segurança: hash de senha, não-vazamento do hash, mensagem
 * genérica de credenciais e bloqueio de e-mail duplicado.
 */
import bcrypt from 'bcryptjs';

// Mock do wrapper do Prisma ANTES de importar o serviço.
jest.mock('../../src/config/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import { prisma } from '../../src/config/prisma';
import { AuthService } from '../../src/services/AuthService';
import { AppError } from '../../src/utils/AppError';

const mockedPrisma = prisma as unknown as {
  user: { findUnique: jest.Mock; create: jest.Mock };
};

const baseUser = {
  id: '33333333-3333-3333-3333-333333333333',
  nome: 'Aluno Teste',
  email: 'aluno@amis.local',
  role: 'ALUNO',
  telefone: null,
  ativo: true,
  stripeCustomerId: null,
  criadoEm: new Date(),
  atualizadoEm: new Date(),
};

describe('AuthService', () => {
  describe('register', () => {
    it('cadastra novo usuário e NUNCA retorna o passwordHash', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue(null);
      mockedPrisma.user.create.mockImplementation(async ({ data }: { data: { passwordHash: string } }) => ({
        ...baseUser,
        passwordHash: data.passwordHash,
      }));

      const result = await AuthService.register({
        nome: 'Aluno Teste',
        email: 'aluno@amis.local',
        senha: 'SenhaForte1',
        role: 'ALUNO',
      });

      expect(result.token).toEqual(expect.any(String));
      expect((result.user as Record<string, unknown>).passwordHash).toBeUndefined();
      // A senha persistida deve ser um hash, não o texto puro.
      const createArg = mockedPrisma.user.create.mock.calls[0][0];
      expect(createArg.data.passwordHash).not.toBe('SenhaForte1');
    });

    it('rejeita e-mail já cadastrado (409)', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash: 'x' });
      await expect(
        AuthService.register({
          nome: 'Aluno Teste',
          email: 'aluno@amis.local',
          senha: 'SenhaForte1',
          role: 'ALUNO',
        }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe('login', () => {
    it('autentica com credenciais corretas', async () => {
      const passwordHash = await bcrypt.hash('SenhaForte1', 10);
      mockedPrisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash });

      const result = await AuthService.login({ email: 'aluno@amis.local', senha: 'SenhaForte1' });
      expect(result.token).toEqual(expect.any(String));
    });

    it('rejeita senha incorreta com mensagem genérica', async () => {
      const passwordHash = await bcrypt.hash('OutraSenha9', 10);
      mockedPrisma.user.findUnique.mockResolvedValue({ ...baseUser, passwordHash });

      await expect(
        AuthService.login({ email: 'aluno@amis.local', senha: 'SenhaErrada1' }),
      ).rejects.toThrow('Credenciais inválidas.');
    });

    it('rejeita usuário inexistente sem revelar a ausência do e-mail', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        AuthService.login({ email: 'naoexiste@amis.local', senha: 'QualquerSenha1' }),
      ).rejects.toThrow(AppError);
    });
  });
});
