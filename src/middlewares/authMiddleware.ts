import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'strongnest_secret_key_2026';

// 1. Exportación de la interfaz que piden alertController y geofenceController
export interface AuthenticatedRequest extends Request {
  user?: any;
}

// 2. Middleware principal de autenticación
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Acceso no autorizado: Token no proporcionado' });
    return;
  }

  const tokenParts = authHeader.split(' ');
  const token = tokenParts[1];

  if (!token) {
    res.status(401).json({ error: 'Token no válido' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as AuthenticatedRequest).user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

// 3. Alias exportados para total compatibilidad con alertRoutes y geofenceRoutes
export const authenticateJWT = authMiddleware;
export default authMiddleware;
