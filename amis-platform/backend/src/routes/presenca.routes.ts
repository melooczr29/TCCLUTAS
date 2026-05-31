import { Router } from 'express';
import { PresencaController } from '../controllers/PresencaController';
import { authenticate, authorize } from '../middlewares/authMiddleware';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../utils/asyncHandler';
import {
  listarPresencaQuerySchema,
  registrarPresencaSchema,
} from '../schemas/presenca.schema';

const router = Router();

// Toda rota de presença exige autenticação.
router.use(authenticate);

// Geração do QR Code da aula: somente SENSEI ou GESTOR (RBAC).
router.post('/qr', authorize('SENSEI', 'GESTOR'), asyncHandler(PresencaController.gerarQr));

// Registro de presença: qualquer usuário autenticado registra a PRÓPRIA presença.
router.post(
  '/',
  validate({ body: registrarPresencaSchema }),
  asyncHandler(PresencaController.registrar),
);

router.get(
  '/',
  validate({ query: listarPresencaQuerySchema }),
  asyncHandler(PresencaController.listar),
);

export default router;
