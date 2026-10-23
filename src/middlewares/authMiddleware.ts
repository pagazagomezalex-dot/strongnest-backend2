import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export const authenticateJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, decoded: any) => {
      if (err) {
        return res.status(403).json({ error: 'Token inválido o expirado' });
      }

      req.user = decoded;
      next();
    });
  } else {
    return res.status(401).json({ error: 'Acceso no autorizado: Token no proporcionado' });
  }
};