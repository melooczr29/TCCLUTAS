import { Router } from 'express';
import { PaymentController } from '../controllers/PaymentController';
import { authenticate, authorize } from '../middlewares/authMiddleware';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { criarPagamentoSchema } from '../schemas/payment.schema';

const router = Router();

// Criação de cobrança: rota financeira restrita ao GESTOR (RBAC).
router.post(
  '/intent',
  authenticate,
  authorize('GESTOR'),
  validate({ body: criarPagamentoSchema }),
  asyncHandler(PaymentController.createIntent),
);

// Histórico de pagamentos do próprio usuário autenticado.
router.get('/', authenticate, asyncHandler(PaymentController.listMine));

export default router;
