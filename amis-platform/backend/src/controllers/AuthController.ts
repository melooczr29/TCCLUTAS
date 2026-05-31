/**
 * ============================================================================
 * AuthController - Cadastro, Login e Perfil
 * ----------------------------------------------------------------------------
 * Os controllers são finos: validação fica no middleware `validate` (Zod) e a
 * regra de negócio no `AuthService`. Aqui apenas orquestramos e formatamos a
 * resposta HTTP.
 * ============================================================================
 */
import type { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { AppError } from '../utils/AppError';
import type { LoginInput, RegisterInput } from '../schemas/auth.schema';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    const data = req.body as RegisterInput;
    const result = await AuthService.register(data);
    res.status(201).json({ status: 'success', data: result });
  }

  static async login(req: Request, res: Response): Promise<void> {
    const data = req.body as LoginInput;
    const result = await AuthService.login(data);
    res.status(200).json({ status: 'success', data: result });
  }

  static async me(req: Request, res: Response): Promise<void> {
    if (!req.user) throw AppError.unauthorized();
    const user = await AuthService.getProfile(req.user.id);
    res.status(200).json({ status: 'success', data: { user } });
  }
}
