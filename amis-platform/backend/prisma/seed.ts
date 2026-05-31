/**
 * ============================================================================
 * Seed do banco - dados de demonstração para a banca/TCC
 * ----------------------------------------------------------------------------
 * Cria um Gestor, um Sensei e um Aluno com senhas já hasheadas (Bcrypt).
 * Idempotente: usa `upsert`, então pode ser executado múltiplas vezes.
 * Execute com:  npm run db:seed
 * ============================================================================
 */
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const senha = await bcrypt.hash('Amis@2026', 12);

  const usuarios = [
    { nome: 'Gestor AMIS', email: 'gestor@amis.local', role: Role.GESTOR },
    { nome: 'Sensei Tanaka', email: 'sensei@amis.local', role: Role.SENSEI },
    { nome: 'Aluno Silva', email: 'aluno@amis.local', role: Role.ALUNO },
  ];

  for (const u of usuarios) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { nome: u.nome, email: u.email, passwordHash: senha, role: u.role },
    });
  }

  // eslint-disable-next-line no-console
  console.log('Seed concluído. Senha padrão de todos: Amis@2026');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
