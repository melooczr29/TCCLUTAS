/**
 * ============================================================================
 * AppError - Erros operacionais controlados
 * ----------------------------------------------------------------------------
 * Diferencia erros "esperados/operacionais" (ex.: 401, 403, 404, 409) de bugs
 * inesperados. O handler global de erros usa `isOperational` para decidir se
 * pode expor a mensagem ao cliente OU se deve responder com 500 genérico,
 * evitando vazar stack traces / detalhes internos do banco (OWASP A05).
 * ============================================================================
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string | undefined;

  constructor(message: string, statusCode = 400, code?: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code?: string) {
    return new AppError(message, 400, code);
  }
  static unauthorized(message = 'Não autenticado.', code?: string) {
    return new AppError(message, 401, code);
  }
  static forbidden(message = 'Acesso negado.', code?: string) {
    return new AppError(message, 403, code);
  }
  static notFound(message = 'Recurso não encontrado.', code?: string) {
    return new AppError(message, 404, code);
  }
  static conflict(message: string, code?: string) {
    return new AppError(message, 409, code);
  }
}
