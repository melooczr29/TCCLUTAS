/**
 * Agregador de rotas da API (prefixo /api). Mantém o server.ts limpo e
 * facilita o versionamento futuro (ex.: /api/v1).
 */
import { Router } from 'express';
import authRoutes from './auth.routes';
import presencaRoutes from './presenca.routes';
import paymentRoutes from './payment.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'amis-api', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/presencas', presencaRoutes);
router.use('/pagamentos', paymentRoutes);

export default router;
