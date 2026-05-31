/**
 * ============================================================================
 * AMIS API - Construção do app Express (blindado)
 * ----------------------------------------------------------------------------
 * Este módulo APENAS monta e configura o app Express e o exporta. NÃO chama
 * `listen()` — isso fica em `server.ts`. Essa separação é o que permite testar
 * a aplicação com Supertest sem abrir uma porta de rede real.
 *
 * Camadas de segurança aplicadas:
 *  - helmet(): cabeçalhos HTTP seguros (mitiga XSS, clickjacking, MIME sniffing).
 *  - cors() restrito: apenas origens em CORS_ORIGINS são aceitas.
 *  - express-rate-limit: limita requisições por IP (anti brute-force/DoS).
 *  - body parser com limite de tamanho (anti payload gigante / DoS).
 *  - Webhook da Stripe com corpo BRUTO (raw) ANTES do JSON parser.
 *  - errorHandler global: nunca vaza stack trace/detalhes internos.
 * ============================================================================
 */
import express, { type Application } from 'express';
import helmet from 'helmet';
import cors, { type CorsOptions } from 'cors';
import rateLimit from 'express-rate-limit';

import { env } from './config/env';
import apiRoutes from './routes';
import { PaymentController } from './controllers/PaymentController';
import { asyncHandler } from './utils/asyncHandler';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

export function createApp(): Application {
  const app = express();

  // Confiar no proxy reverso (rate-limit por IP atrás de proxy).
  app.set('trust proxy', 1);

  // 1) Cabeçalhos de segurança
  app.use(helmet());
  app.disable('x-powered-by');

  // 2) CORS restrito a origens conhecidas
  const corsOptions: CorsOptions = {
    origin(origin, callback) {
      // Permite requisições sem origin (apps mobile nativos, curl, health checks).
      if (!origin || env.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origem não permitida pela política de CORS.'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86_400,
  };
  app.use(cors(corsOptions));

  // 3) Webhook da Stripe (corpo BRUTO, antes do JSON parser)
  app.post(
    '/api/pagamentos/webhook',
    express.raw({ type: 'application/json' }),
    asyncHandler(PaymentController.webhook),
  );

  // 4) Parsers com limite de tamanho (anti-DoS por payload gigante)
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  // 5) Rate limiting global (mitiga brute-force e abuso)
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: 'error',
      code: 'RATE_LIMITED',
      message: 'Muitas requisições. Tente mais tarde.',
    },
  });
  app.use(globalLimiter);

  // Rate limit mais rígido para autenticação (anti brute-force).
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: 'error',
      code: 'RATE_LIMITED',
      message: 'Muitas tentativas. Aguarde alguns minutos.',
    },
  });
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);

  // 6) Rotas da aplicação
  app.use('/api', apiRoutes);

  // 7) 404 + Handler global de erros (sempre por último)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
