import { AppError } from '../../src/utils/AppError';

describe('AppError', () => {
  it('cria erro genérico com statusCode padrão 400 e isOperational true', () => {
    const err = new AppError('falhou');
    expect(err.statusCode).toBe(400);
    expect(err.isOperational).toBe(true);
    expect(err.message).toBe('falhou');
  });

  it('factory methods definem o statusCode correto', () => {
    expect(AppError.unauthorized().statusCode).toBe(401);
    expect(AppError.forbidden().statusCode).toBe(403);
    expect(AppError.notFound().statusCode).toBe(404);
    expect(AppError.conflict('x').statusCode).toBe(409);
    expect(AppError.badRequest('x', 'CODE').code).toBe('CODE');
  });
});
