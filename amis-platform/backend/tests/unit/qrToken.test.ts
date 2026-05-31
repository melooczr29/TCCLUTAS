import { generateQrToken, verifyQrToken } from '../../src/utils/qrToken';

describe('qrToken (assinatura de check-in)', () => {
  const senseiId = '22222222-2222-2222-2222-222222222222';

  it('gera e valida um token íntegro', () => {
    const token = generateQrToken(senseiId, new Date());
    const result = verifyQrToken(token);
    expect(result.valid).toBe(true);
    expect(result.payload?.senseiId).toBe(senseiId);
  });

  it('rejeita token com assinatura adulterada', () => {
    const token = generateQrToken(senseiId, new Date());
    const [body] = token.split('.');
    const tampered = `${body}.assinatura_falsa`;
    const result = verifyQrToken(tampered);
    expect(result.valid).toBe(false);
  });

  it('rejeita token expirado', () => {
    // ttl negativo => exp no passado.
    const token = generateQrToken(senseiId, new Date(), -1);
    const result = verifyQrToken(token);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/expirado/i);
  });

  it('rejeita formato inválido', () => {
    expect(verifyQrToken('abc').valid).toBe(false);
  });
});
