import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from './auth.js';
import { db } from './db.js';
import { Role } from './types.js';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
  tenantId?: string;
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  req.user = payload;
  if (payload.tenantId) {
    req.tenantId = payload.tenantId;
  }
  next();
}

export function requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Access denied. EntriFa Super Admin authorization required.' });
  }
  next();
}

export function requireTenant(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || !req.user.tenantId) {
    return res.status(403).json({ error: 'Access denied. User does not belong to a valid client workspace.' });
  }

  // Check if tenant is active
  const tenant = db.getTenants().find(t => t.id === req.user?.tenantId);
  if (!tenant) {
    return res.status(404).json({ error: 'Client tenant not found.' });
  }

  if (tenant.status === 'SUSPENDED') {
    return res.status(403).json({
      error: 'This business workspace has been suspended by the platform administrator.',
      tenantStatus: 'SUSPENDED'
    });
  }

  if (tenant.status === 'INACTIVE') {
    return res.status(403).json({
      error: 'This business workspace is currently inactive.',
      tenantStatus: 'INACTIVE'
    });
  }

  // Check subscription expiry
  const now = new Date();
  const endDate = new Date(tenant.subscriptionEndDate);
  if (endDate < now && !req.user.isImpersonating) {
    // Flag or restrict if expired
    (req as any).subscriptionExpired = true;
  }

  req.tenantId = tenant.id;
  next();
}

export function requireModule(moduleId: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.tenantId) {
      return res.status(400).json({ error: 'Tenant context missing.' });
    }

    const tenant = db.getTenants().find(t => t.id === req.tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found.' });
    }

    const isEnabled = tenant.enabledModules.includes(moduleId);
    if (!isEnabled) {
      return res.status(403).json({
        error: `Module '${moduleId}' is not enabled for your business plan. Contact EntriFa Super Admin to activate this module.`,
        moduleId,
        isModuleBlocked: true
      });
    }

    next();
  };
}

export function requirePermission(moduleId: string, action: 'view' | 'add' | 'edit' | 'delete' | 'export') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    // Super Admin or Client Admin has full access to all enabled modules
    if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'CLIENT_ADMIN') {
      return next();
    }

    // If STAFF, verify specific permission
    if (req.user.role === 'STAFF') {
      const user = db.getUsers().find(u => u.id === req.user?.userId);
      if (!user || !user.permissions) {
        return res.status(403).json({ error: 'Staff account has no permissions configured.' });
      }

      const modPerms = user.permissions[moduleId];
      if (!modPerms || !modPerms[action]) {
        return res.status(403).json({
          error: `You do not have permission to ${action} ${moduleId}. Contact your Business Admin.`
        });
      }
    }

    next();
  };
}

export function recordActivity(
  req: AuthenticatedRequest,
  action: string,
  moduleName: string,
  details?: Record<string, any>
) {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 8);

  const tenant = req.tenantId ? db.getTenants().find(t => t.id === req.tenantId) : null;

  const logEntry = {
    id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    userId: req.user ? req.user.userId : 'system',
    userName: req.user ? req.user.name : 'System',
    role: req.user ? req.user.role : ('SUPER_ADMIN' as Role),
    action,
    module: moduleName,
    tenantId: req.tenantId || null,
    tenantName: tenant ? tenant.name : undefined,
    date: dateStr,
    time: timeStr,
    ip: req.ip || req.socket.remoteAddress,
    device: req.headers['user-agent']?.slice(0, 50),
    details,
    createdAt: now.toISOString(),
  };

  db.raw.activityLogs.unshift(logEntry);
  // Keep last 500 logs to prevent unbounded growth
  if (db.raw.activityLogs.length > 500) {
    db.raw.activityLogs.length = 500;
  }
  db.save();
}
