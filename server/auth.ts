import jwt from 'jsonwebtoken';
import { User, Role } from './types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'entrifa_secret_key_production_grade_998811';

export interface TokenPayload {
  userId: string;
  tenantId: string | null;
  role: Role;
  name: string;
  email: string;
  isImpersonating?: boolean;
  originalAdminId?: string;
}

export function generateToken(user: User, isImpersonating = false, originalAdminId?: string): string {
  const payload: TokenPayload = {
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
    name: user.name,
    email: user.email,
    isImpersonating,
    originalAdminId,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
}
