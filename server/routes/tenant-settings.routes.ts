import { Router, Response } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest, authenticate, requireTenant, recordActivity } from '../middleware.js';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

// Get tenant profile and subscription details
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const tenant = db.getTenants().find(t => t.id === req.tenantId);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found.' });

  const plan = db.getPlans().find(p => p.id === tenant.planId);
  const now = new Date();
  const endDate = new Date(tenant.subscriptionEndDate);
  const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return res.json({
    tenant,
    plan,
    daysRemaining: Math.max(0, diffDays),
    isExpiringSoon: diffDays <= 15 && diffDays >= 0,
    isExpired: diffDays < 0,
  });
});

// Update tenant profile
router.put('/', (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'CLIENT_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Only Business Admin can modify business profile settings.' });
  }

  const tenant = db.raw.tenants.find(t => t.id === req.tenantId);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found.' });

  const { name, ownerName, mobile, email, address, city, state, country, gstNumber, logo, currency } = req.body;
  if (name) tenant.name = name;
  if (ownerName) tenant.ownerName = ownerName;
  if (mobile) tenant.mobile = mobile;
  if (email) tenant.email = email;
  if (address !== undefined) tenant.address = address;
  if (city !== undefined) tenant.city = city;
  if (state !== undefined) tenant.state = state;
  if (country !== undefined) tenant.country = country;
  if (gstNumber !== undefined) tenant.gstNumber = gstNumber;
  if (logo !== undefined) tenant.logo = logo;
  if (currency) tenant.currency = currency;
  tenant.updatedAt = new Date().toISOString();

  db.save();
  recordActivity(req, 'UPDATED_BUSINESS_PROFILE', 'Settings', { business: tenant.name });

  return res.json({ message: 'Business settings updated successfully.', tenant });
});

// Tenant's isolated activity logs
router.get('/logs', (req: AuthenticatedRequest, res: Response) => {
  const logs = db.getActivityLogs(req.tenantId);
  return res.json(logs);
});

export default router;
