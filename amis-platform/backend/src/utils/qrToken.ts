/**
 * ============================================================================
 * QR Token - Assinatura digital de check-in (anti-fraude de presença)
 * ----------------------------------------------------------------------------
 * O Sensei gera, no início da aula, um token assinado com HMAC-SHA256 contendo
 * { senseiId, dataAula, nonce, exp }. O QR Code exibido na sala carrega esse
 * token. Quando o aluno escaneia e envia para a API, validamos:
 *   - a assinatura (impede que alguém forje um token válido);
 *   - a expiração (impede reuso de tokens antigos / "presença remota");
 *   - a vinculação ao Sensei e à data corretos.
 *
 * Como a chave HMAC só existe no servidor, o token é inforjável pelo cliente.
 * Usamos comparação em tempo constante (timingSafeEqual) contra timing attacks.
 * ============================================================================
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env';

interface QrPayload {
  senseiId: string;
  dataAula: string; // ISO
  nonce: string;
  exp: number; // epoch ms
}

function sign(data: string): string {
  return createHmac('sha256', env.JWT_SECRET).update(data).digest('base64url');
}

/** Gera um token de check-in válido por `ttlMinutes` minutos. */
export function generateQrToken(senseiId: string, dataAula: Date, ttlMinutes = 120): string {
  const payload: QrPayload = {
    senseiId,
    dataAula: dataAula.toISOString(),
    nonce: randomBytes(8).toString('hex'),
    exp: Date.now() + ttlMinutes * 60_000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(body);
  return `${body}.${signature}`;
}

export interface QrVerification {
  valid: boolean;
  reason?: string;
  payload?: QrPayload;
}

/** Valida assinatura, expiração e integridade do token. */
export function verifyQrToken(token: string): QrVerification {
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false, reason: 'Formato inválido.' };

  const [body, signature] = parts;
  const expected = sign(body);

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, reason: 'Assinatura inválida.' };
  }

  let payload: QrPayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as QrPayload;
  } catch {
    return { valid: false, reason: 'Payload corrompido.' };
  }

  if (Date.now() > payload.exp) {
    return { valid: false, reason: 'QR Code expirado.' };
  }

  return { valid: true, payload };
}
