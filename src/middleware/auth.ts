import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check for token in multiple places
    let token: string | undefined;

    // Check Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      console.log('[Auth Middleware] Token found in Authorization header');
    }

    // Check cookie
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
      console.log('[Auth Middleware] Token found in cookie');
    }

    // No token found
    if (!token) {
      console.log('[Auth Middleware] No token found');
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    req.userId = decoded.userId;
    req.userEmail = decoded.email;

    console.log('[Auth Middleware] Token verified for user:', decoded.email);

    next();
  } catch (err: any) {
    console.error('[Auth Middleware] Token verification failed:', err.message);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    return res.status(403).json({ error: 'Invalid token' });
  }
};