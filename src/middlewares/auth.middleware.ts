import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Interface pour étendre la requête avec l'utilisateur
export interface AuthRequest extends Request {
  user?: { id: number; email: string };
}

export const authenticateJWT = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'Authentification requise' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
      id: number;
      email: string;
    };

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token invalide ou expiré' });
  }
};
