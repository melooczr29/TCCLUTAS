/**
 * ============================================================================
 * Cliente Stripe (Singleton)
 * ----------------------------------------------------------------------------
 * Encapsula a inicialização do SDK oficial da Stripe. A chave secreta nunca
 * trafega para o cliente/mobile: ela só existe no servidor, lida via env.
 * Fixamos a `apiVersion` para garantir comportamento determinístico mesmo que
 * a Stripe evolua a API no futuro (evita quebras silenciosas).
 * ============================================================================
 */
import Stripe from 'stripe';
import { env } from './env';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  // Fixada para comportamento determinístico. O cast evita acoplar o build a
  // uma versão exata do literal de tipo gerado pelo SDK.
  apiVersion: '2024-10-28.acacia' as Stripe.LatestApiVersion,
  appInfo: {
    name: 'AMIS Platform',
    version: '1.0.0',
  },
  // Reduz falhas transitórias de rede sem mascarar erros reais de negócio.
  maxNetworkRetries: 2,
  timeout: 15_000,
});
