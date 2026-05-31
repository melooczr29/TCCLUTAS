/**
 * ============================================================================
 * PresencaController - Registro e consulta de presença
 * ----------------------------------------------------------------------------
 * - O `body`/`query` já chegam validados e tipados pelo middleware Zod
 *   (`validate`), portanto qualquer payload malicioso/malformado foi rejeitado
 *   antes de chegar aqui (defesa contra injeção de dados inválidos).
 * - O `alunoId` é derivado SEMPRE do token autenticado (`req.user.id`), nunca
 *   do corpo da requisição: isso impede que um aluno registre presença em nome
 *   de outro (proteção contra IDOR / OWASP A01).
 * - Exceções são lançadas como AppError e tratadas pelo handler global, que
 *   nunca vaza detalhes internos.
 * ============================================================================
 */
import type { Request, Response } from 'express';
import { PresencaService } from '../services/PresencaService';
import { AppError } from '../utils/AppError';
import { generateQrToken } from '../utils/qrToken';
import type { RegistrarPresencaInput } from '../schemas/presenca.schema';

export class PresencaController {
  /**
   * POST /api/presencas/qr — o Sensei/Gestor gera o QR Code assinado da aula.
   * Restrito por RBAC à Role SENSEI/GESTOR (ver rotas). O token expira em 2h.
   */
  static async gerarQr(req: Request, res: Response): Promise<void> {
    if (!req.user) throw AppError.unauthorized();

    const dataAula = new Date();
    const qrToken = generateQrToken(req.user.id, dataAula);

    res.status(201).json({
      status: 'success',
      data: { qrToken, senseiId: req.user.id, dataAula },
    });
  }

  /** POST /api/presencas — o aluno autenticado registra a própria presença. */
  static async registrar(req: Request, res: Response): Promise<void> {
    if (!req.user) throw AppError.unauthorized();

    const body = req.body as RegistrarPresencaInput;

    const presenca = await PresencaService.registrar({
      // alunoId vem do token: blindagem contra falsificação de identidade.
      alunoId: req.user.id,
      senseiId: body.senseiId,
      dataAula: body.dataAula,
      qrToken: body.qrToken,
      status: body.status,
      observacao: body.observacao,
    });

    res.status(201).json({
      status: 'success',
      data: {
        id: presenca.id,
        status: presenca.status,
        dataAula: presenca.dataAula,
      },
    });
  }

  /** GET /api/presencas — lista as presenças do aluno autenticado. */
  static async listar(req: Request, res: Response): Promise<void> {
    if (!req.user) throw AppError.unauthorized();

    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const result = await PresencaService.listarDoAluno(req.user.id, page, limit);

    res.status(200).json({ status: 'success', data: result });
  }
}
