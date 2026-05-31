/**
 * ============================================================================
 * asyncHandler
 * ----------------------------------------------------------------------------
 * Wrapper que captura rejeições de Promises em controllers `async` e as
 * encaminha para o middleware global de erros via `next(err)`. Sem isso, uma
 * Promise rejeitada não tratada poderia derrubar o processo ou deixar a
 * requisição pendurada.
 * ============================================================================
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';

export function asyncHandler(handler: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
