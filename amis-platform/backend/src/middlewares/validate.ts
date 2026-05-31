/**
 * ============================================================================
 * validate - Middleware de validação com Zod
 * ----------------------------------------------------------------------------
 * Valida e SANITIZA `body`, `params` e `query` ANTES de chegar ao controller.
 * Benefícios de segurança:
 *  - Rejeita payloads malformados/maliciosos (defesa contra injeção e mass
 *    assignment): apenas campos declarados no schema passam adiante.
 *  - Coerção/normalização de tipos evita comportamento indefinido.
 *  - Como o Prisma usa queries parametrizadas e os dados são validados aqui,
 *    fechamos a porta para SQL Injection (OWASP A03).
 *
 * O resultado parseado substitui os valores originais em `req`, garantindo
 * que o controller só veja dados já validados.
 * ============================================================================
 */
import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { AppError } from '../utils/AppError';

interface ValidationSchemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) {
        // `req.query` é somente-leitura em alguns setups; reescreve com segurança.
        Object.defineProperty(req, 'query', {
          value: schemas.query.parse(req.query),
          writable: true,
          configurable: true,
        });
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.issues.map((i) => ({
          campo: i.path.join('.') || '(raiz)',
          mensagem: i.message,
        }));
        // 422 Unprocessable Entity: payload sintaticamente ok, semanticamente inválido.
        const appErr = new AppError('Dados inválidos.', 422, 'VALIDATION_ERROR');
        (appErr as AppError & { details?: unknown }).details = details;
        next(appErr);
        return;
      }
      next(err);
    }
  };
}
