import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const authenticateJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
    const secret = process.env.JWT_SECRET || 'mi_secreto_super_seguro_strongnest_2026';

    jwt.verify(token, secret, (err: any, user: any) => {
      if (err) {
        return res.status(403).json({ error: 'Token inválido o expirado' });
      }
      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ error: 'Acceso denegado. No se proporcionó Token' });
  }
};
