import { Router, Response } from 'express';
import { db } from '../db.js';
import { generateToken } from '../auth.js';
import { AuthenticatedRequest, authenticate, requireSuperAdmin, recordActivity } from '../middleware.js';

const router = Router();

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username/Email and Password are required.' });
  }

  const user = db.getUsers().find(
    u => (u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === username.toLowerCase())
  );

  if (!user || user.passwordHash !== password) {
    return res.status(401).json({ error: 'Invalid credentials. Please verify your email/username and password.' });
  }

  if (user.status !== 'ACTIVE') {
    return res.status(403).json({ error: `Your account is ${user.status.toLowerCase()}. Please contact support.` });
  }

  // If user belongs to a tenant, verify tenant status
  let tenant = null;
  if (user.tenantId) {
    tenant = db.getTenants().find(t => t.id === user.tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Associated business tenant not found.' });
    }
    if (tenant.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'Your business account has been suspended by the platform administrator.' });
    }
  }

  const token = generateToken(user);

  recordActivity(
    { user: { userId: user.id, tenantId: user.tenantId, role: user.role, name: user.name, email: user.email }, tenantId: user.tenantId || undefined, headers: req.headers, ip: req.ip, socket: req.socket } as any,
    'USER_LOGIN',
    'Authentication',
    { email: user.email, role: user.role }
  );

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      mobile: user.mobile,
      role: user.role,
      tenantId: user.tenantId,
      permissions: user.permissions,
    },
    tenant: tenant ? {
      id: tenant.id,
      name: tenant.name,
      ownerName: tenant.ownerName,
      logo: tenant.logo,
      currency: tenant.currency,
      enabledModules: tenant.enabledModules,
      planId: tenant.planId,
      status: tenant.status,
      subscriptionEndDate: tenant.subscriptionEndDate,
    } : null,
  });
});

// Get Current User profile
router.get('/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = db.getUsers().find(u => u.id === req.user?.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  let tenant = null;
  if (req.user?.tenantId) {
    tenant = db.getTenants().find(t => t.id === req.user?.tenantId);
  }

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      mobile: user.mobile,
      role: user.role,
      tenantId: req.user?.tenantId,
      permissions: user.permissions,
      isImpersonating: req.user?.isImpersonating || false,
    },
    tenant: tenant ? {
      id: tenant.id,
      name: tenant.name,
      ownerName: tenant.ownerName,
      logo: tenant.logo,
      currency: tenant.currency,
      enabledModules: tenant.enabledModules,
      planId: tenant.planId,
      status: tenant.status,
      subscriptionEndDate: tenant.subscriptionEndDate,
    } : null,
  });
});

// Super Admin "Login as Client" (Impersonation)
router.post('/impersonate/:tenantId', authenticate, requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { tenantId } = req.params;
  const tenant = db.getTenants().find(t => t.id === tenantId);
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found.' });
  }

  // Find Client Admin for this tenant
  const clientAdmin = db.getUsers().find(u => u.tenantId === tenantId && u.role === 'CLIENT_ADMIN');
  if (!clientAdmin) {
    return res.status(404).json({ error: 'No Client Admin found for this tenant.' });
  }

  const impersonationToken = generateToken(clientAdmin, true, req.user?.userId);

  recordActivity(
    req,
    'SUPERADMIN_IMPERSONATION',
    'Clients',
    { targetTenantId: tenant.id, targetTenantName: tenant.name, clientAdminId: clientAdmin.id }
  );

  return res.json({
    token: impersonationToken,
    user: {
      id: clientAdmin.id,
      name: clientAdmin.name,
      email: clientAdmin.email,
      username: clientAdmin.username,
      mobile: clientAdmin.mobile,
      role: clientAdmin.role,
      tenantId: tenant.id,
      isImpersonating: true,
    },
    tenant: {
      id: tenant.id,
      name: tenant.name,
      ownerName: tenant.ownerName,
      logo: tenant.logo,
      currency: tenant.currency,
      enabledModules: tenant.enabledModules,
      planId: tenant.planId,
      status: tenant.status,
      subscriptionEndDate: tenant.subscriptionEndDate,
    },
  });
});

// Demo account switcher helper
router.post('/demo-switch', (req, res) => {
  const { role } = req.body;
  let targetUser;

  if (role === 'SUPER_ADMIN') {
    targetUser = db.getUsers().find(u => u.role === 'SUPER_ADMIN');
  } else if (role === 'CLIENT_ADMIN') {
    targetUser = db.getUsers().find(u => u.role === 'CLIENT_ADMIN' && u.tenantId === 'tenant_ifa_traders');
  } else if (role === 'STAFF') {
    targetUser = db.getUsers().find(u => u.role === 'STAFF' && u.tenantId === 'tenant_ifa_traders');
  }

  if (!targetUser) {
    return res.status(404).json({ error: 'Demo user not found.' });
  }

  const token = generateToken(targetUser);
  const tenant = targetUser.tenantId ? db.getTenants().find(t => t.id === targetUser.tenantId) : null;

  return res.json({
    token,
    user: {
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      username: targetUser.username,
      mobile: targetUser.mobile,
      role: targetUser.role,
      tenantId: targetUser.tenantId,
      permissions: targetUser.permissions,
    },
    tenant: tenant ? {
      id: tenant.id,
      name: tenant.name,
      ownerName: tenant.ownerName,
      logo: tenant.logo,
      currency: tenant.currency,
      enabledModules: tenant.enabledModules,
      planId: tenant.planId,
      status: tenant.status,
      subscriptionEndDate: tenant.subscriptionEndDate,
    } : null,
  });
});

export default router;
