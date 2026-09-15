import { Router, Response } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest, authenticate, requireTenant, requireModule, recordActivity } from '../middleware.js';
import { User, StaffPermissions } from '../types.js';

const router = Router();

router.use(authenticate);
router.use(requireTenant);
router.use(requireModule('staff'));

// Ensure only Client Admin (or Super Admin) can manage staff
router.use((req: AuthenticatedRequest, res: Response, next) => {
  if (req.user?.role !== 'CLIENT_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Only Business Admin can manage staff members and permissions.' });
  }
  next();
});

// List staff
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const staff = db.getUsers().filter(u => u.tenantId === req.tenantId && u.role === 'STAFF');
  return res.json(staff);
});

// Create Staff
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  const { name, mobile, email, username, password, permissions } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, Email, and Password are required.' });
  }

  // Check plan staff quota
  const tenant = db.getTenants().find(t => t.id === req.tenantId);
  const plan = tenant ? db.getPlans().find(p => p.id === tenant.planId) : null;
  const currentStaffCount = db.getUsers().filter(u => u.tenantId === req.tenantId && u.role === 'STAFF').length;

  if (plan && currentStaffCount >= plan.maxStaff) {
    return res.status(403).json({
      error: `Staff account limit reached for your ${plan.name} (${plan.maxStaff} staff max). Upgrade plan to add more.`,
    });
  }

  // Check email uniqueness
  const existing = db.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'User with this email already exists.' });
  }

  const now = new Date().toISOString();
  const defaultPermissions: StaffPermissions = permissions || {
    customers: { view: true, add: true, edit: false, delete: false, export: true },
    transactions: { view: true, add: true, edit: false, delete: false, export: true },
    ledger: { view: true, add: true, edit: false, delete: false, export: true },
    suppliers: { view: true, add: false, edit: false, delete: false, export: false },
    expenses: { view: false, add: false, edit: false, delete: false, export: false },
    income: { view: false, add: false, edit: false, delete: false, export: false },
    products: { view: true, add: false, edit: false, delete: false, export: false },
    inventory: { view: true, add: false, edit: false, delete: false, export: false },
    invoices: { view: true, add: true, edit: false, delete: false, export: true },
    reports: { view: false, add: false, edit: false, delete: false, export: false },
  };

  const newStaff: User = {
    id: `usr_staff_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    tenantId: req.tenantId!,
    name,
    email,
    mobile: mobile || '',
    username: username || email,
    passwordHash: password,
    role: 'STAFF',
    status: 'ACTIVE',
    permissions: defaultPermissions,
    createdAt: now,
    updatedAt: now,
  };

  db.raw.users.push(newStaff);
  db.save();

  recordActivity(req, 'CREATED_STAFF', 'Staff', { staffId: newStaff.id, name: newStaff.name, email: newStaff.email });

  return res.status(201).json(newStaff);
});

// Update Staff & Permissions Matrix
router.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const staff = db.raw.users.find(u => u.tenantId === req.tenantId && u.id === req.params.id && u.role === 'STAFF');
  if (!staff) return res.status(404).json({ error: 'Staff member not found.' });

  const { name, mobile, email, status, permissions, password } = req.body;
  if (name) staff.name = name;
  if (mobile !== undefined) staff.mobile = mobile;
  if (email) staff.email = email;
  if (status) staff.status = status;
  if (permissions) staff.permissions = permissions;
  if (password) staff.passwordHash = password;
  staff.updatedAt = new Date().toISOString();

  db.save();
  recordActivity(req, 'UPDATED_STAFF_PERMISSIONS', 'Staff', { staffId: staff.id, name: staff.name });

  return res.json(staff);
});

// Delete Staff
router.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const index = db.raw.users.findIndex(u => u.tenantId === req.tenantId && u.id === req.params.id && u.role === 'STAFF');
  if (index === -1) return res.status(404).json({ error: 'Staff member not found.' });

  const deleted = db.raw.users.splice(index, 1)[0];
  db.save();
  recordActivity(req, 'DELETED_STAFF', 'Staff', { staffId: deleted.id, name: deleted.name });

  return res.json({ message: 'Staff member deleted successfully.' });
});

export default router;
