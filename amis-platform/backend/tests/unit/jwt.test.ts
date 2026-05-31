import jwt from 'jsonwebtoken';
import { signToken, verifyToken } from '../../src/utils/jwt';
import { AppError } from '../../src/utils/AppError';

describe('jwt utils', () => {
  const payload = { sub: '11111111-1111-1111-1111-111111111111', role: 'ALUNO' as const };

  it('assina e verifica um token válido (roundtrip)', () => {
    const token = signToken(payload);
    const decoded = verifyToken(token);
    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.role).toBe('ALUNO');
  });

  it('lança TOKEN_EXPIRED para token expirado', () => {
    // Cria um token já expirado usando o mesmo segredo/issuer.
    const expired = jwt.sign(payload, process.env.JWT_SECRET as string, {
      issuer: 'amis-platform',
      expiresIn: -10,
    });
    try {
      verifyToken(expired);
      throw new Error('deveria ter lançado');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).code).toBe('TOKEN_EXPIRED');
      expect((err as AppError).statusCode).toBe(401);
    }
  });

  it('lança TOKEN_INVALID para token corrompido', () => {
    expect(() => verifyToken('not-a-real-token')).toThrow(AppError);
  });

  it('rejeita token assinado com outro segredo', () => {
    const foreign = jwt.sign(payload, 'segredo-totalmente-diferente-aqui-1234', {
      issuer: 'amis-platform',
    });
    expect(() => verifyToken(foreign)).toThrow(AppError);
  });
});
