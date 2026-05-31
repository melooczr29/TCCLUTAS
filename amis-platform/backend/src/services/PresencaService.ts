/**
 * ============================================================================
 * PresencaService - Regras de negócio do check-in de presença
 * ----------------------------------------------------------------------------
 * - Valida o QR token assinado (anti-fraude) antes de gravar.
 * - Garante que o Sensei do token bate com o informado e que o Sensei tem a
 *   Role correta.
 * - A unicidade (alunoId + dataAula) é reforçada no banco (@@unique), evitando
 *   presença duplicada mesmo sob concorrência.
 * ============================================================================
 */
import type { Presenca, StatusPresenca } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { verifyQrToken } from '../utils/qrToken';

export interface RegistrarPresencaParams {
  alunoId: string;
  senseiId: string;
  dataAula: Date;
  qrToken: string;
  status: StatusPresenca;
  observacao?: string;
}

export class PresencaService {
  static async registrar(params: RegistrarPresencaParams): Promise<Presenca> {
    const { alunoId, senseiId, dataAula, qrToken, status, observacao } = params;

    // 1) Valida a assinatura/expiração do QR Code.
    const verification = verifyQrToken(qrToken);
    if (!verification.valid || !verification.payload) {
      throw AppError.badRequest(
        verification.reason ?? 'QR Code inválido.',
        'INVALID_QR_TOKEN',
      );
    }

    // 2) O token precisa pertencer ao Sensei informado (defesa anti-falsificação).
    if (verification.payload.senseiId !== senseiId) {
      throw AppError.badRequest('QR Code não corresponde ao Sensei informado.', 'QR_SENSEI_MISMATCH');
    }

    // 3) Confirma que o Sensei existe e tem a Role correta.
    const sensei = await prisma.user.findUnique({ where: { id: senseiId } });
    if (!sensei || (sensei.role !== 'SENSEI' && sensei.role !== 'GESTOR')) {
      throw AppError.badRequest('Sensei inválido.', 'INVALID_SENSEI');
    }

    // 4) Persiste. O @@unique(alunoId, dataAula) bloqueia duplicidade (P2002),
    //    tratado pelo errorHandler como 409.
    try {
      return await prisma.presenca.create({
        data: {
          alunoId,
          senseiId,
          dataAula,
          qrToken,
          status,
          observacao: observacao ?? null,
        },
      });
    } catch (err) {
      // Reaproveita o tratamento de P2002, mas com mensagem de domínio clara.
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code?: string }).code === 'P2002'
      ) {
        throw AppError.conflict('Presença já registrada para esta aula.', 'PRESENCA_DUPLICADA');
      }
      throw err;
    }
  }

  static async listarDoAluno(alunoId: string, page: number, limit: number) {
    const [items, total] = await Promise.all([
      prisma.presenca.findMany({
        where: { alunoId },
        orderBy: { dataAula: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          status: true,
          dataAula: true,
          observacao: true,
          sensei: { select: { id: true, nome: true } },
        },
      }),
      prisma.presenca.count({ where: { alunoId } }),
    ]);

    return { items, total, page, limit };
  }
}
