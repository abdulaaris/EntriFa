import { Router, Response } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest, authenticate, requireSuperAdmin, recordActivity } from '../middleware.js';
import { Tenant, User, Plan, SubscriptionPayment } from '../types.js';

const router = Router();

// Apply Super Admin authentication to all admin routes
router.use(authenticate);
router.use(requireSuperAdmin);

// Dashboard Statistics & Analytics
router.get('/dashboard', (req: AuthenticatedRequest, res: Response) => {
  const tenants = db.getTenants();
  const users = db.getUsers();
  const payments = db.getSubscriptionPayments();
  const logs = db.getActivityLogs();

  const totalClients = tenants.length;
  const activeClients = tenants.filter(t => t.status === 'ACTIVE').length;
  const inactiveClients = tenants.filter(t => t.status === 'INACTIVE').length;
  const trialClients = tenants.filter(t => t.status === 'TRIAL').length;
  const suspendedClients = tenants.filter(t => t.status === 'SUSPENDED').length;
  const totalUsers = users.length;

  // Active subscriptions
  const now = new Date();
  const activeSubscriptions = tenants.filter(t => new Date(t.subscriptionEndDate) >= now && t.status === 'ACTIVE').length;

  // Revenue calculation
  const totalRevenue = payments
    .filter(p => p.status === 'PAID')
    .reduce((sum, p) => sum + p.amount, 0);

  const thisMonthStr = now.toISOString().slice(0, 7);
  const monthlyRevenue = payments
    .filter(p => p.status === 'PAID' && p.paymentDate.startsWith(thisMonthStr))
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingPayments = payments
    .filter(p => p.status === 'PENDING')
    .reduce((sum, p) => sum + p.amount, 0);

  // Charts
  const clientGrowth = [
    { month: 'Apr', clients: 8 },
    { month: 'May', clients: 12 },
    { month: 'Jun', clients: 16 },
    { month: 'Jul', clients: 21 },
    { month: 'Aug', clients: 27 },
    { month: 'Sep', clients: Math.max(34, totalClients) },
  ];

  const monthlyRevenueChart = [
    { month: 'Apr', revenue: 7500 },
    { month: 'May', revenue: 12400 },
    { month: 'Jun', revenue: 16800 },
    { month: 'Jul', revenue: 21500 },
    { month: 'Aug', revenue: 28900 },
    { month: 'Sep', revenue: Math.max(35000, monthlyRevenue * 10) },
  ];

  const moduleUsage = db.getModules().map(m => ({
    id: m.id,
    name: m.name,
    count: tenants.filter(t => t.enabledModules.includes(m.id)).length,
  }));

  const transactionVolume = [
    { month: 'Apr', txns: 1200 },
    { month: 'May', txns: 2450 },
    { month: 'Jun', txns: 3900 },
    { month: 'Jul', txns: 5600 },
    { month: 'Aug', txns: 7800 },
    { month: 'Sep', txns: 9400 },
  ];

  const recentLogs = logs.slice(0, 8);

  return res.json({
    kpis: {
      totalClients,
      activeClients,
      inactiveClients,
      trialClients,
      suspendedClients,
      totalUsers,
      activeSubscriptions,
      monthlyRevenue,
      totalRevenue,
      pendingPayments,
    },
    charts: {
      clientGrowth,
      monthlyRevenueChart,
      moduleUsage,
      transactionVolume,
    },
    recentLogs,
  });
});

// Clients List
router.get('/clients', (req: AuthenticatedRequest, res: Response) => {
  const { search, plan, status } = req.query;
  let tenants = db.getTenants();
  const users = db.getUsers();
  const plans = db.getPlans();

  if (search) {
    const q = (search as string).toLowerCase();
    tenants = tenants.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.ownerName.toLowerCase().includes(q) ||
      t.mobile.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q)
    );
  }

  if (plan && plan !== 'ALL') {
    tenants = tenants.filter(t => t.planId === plan);
  }

  if (status && status !== 'ALL') {
    tenants = tenants.filter(t => t.status === status);
  }

  const enriched = tenants.map(t => {
    const planObj = plans.find(p => p.id === t.planId);
    const clientAdmin = users.find(u => u.tenantId === t.id && u.role === 'CLIENT_ADMIN');
    return {
      ...t,
      planName: planObj ? planObj.name : t.planId,
      planCode: planObj ? planObj.code : 'BASIC',
      adminEmail: clientAdmin ? clientAdmin.email : t.email,
      adminUsername: clientAdmin ? clientAdmin.username : t.email,
    };
  });

  return res.json(enriched);
});

// Get Single Client Details
router.get('/clients/:id', (req: AuthenticatedRequest, res: Response) => {
  const tenant = db.getTenants().find(t => t.id === req.params.id);
  if (!tenant) {
    return res.status(404).json({ error: 'Client not found.' });
  }

  const plan = db.getPlans().find(p => p.id === tenant.planId);
  const clientAdmin = db.getUsers().find(u => u.tenantId === tenant.id && u.role === 'CLIENT_ADMIN');
  const staffCount = db.getUsers().filter(u => u.tenantId === tenant.id && u.role === 'STAFF').length;
  const customerCount = db.getCustomers(tenant.id).length;
  const transactionCount = db.getTransactions(tenant.id).length;

  return res.json({
    tenant,
    plan,
    clientAdmin: clientAdmin ? {
      id: clientAdmin.id,
      name: clientAdmin.name,
      email: clientAdmin.email,
      username: clientAdmin.username,
      mobile: clientAdmin.mobile,
      status: clientAdmin.status,
    } : null,
    metrics: {
      staffCount,
      customerCount,
      transactionCount,
    },
  });
});

// Add New Client (Full Automated Provisioning)
router.post('/clients', (req: AuthenticatedRequest, res: Response) => {
  const {
    businessName,
    ownerName,
    mobile,
    email,
    address,
    city,
    state,
    country = 'India',
    gstNumber,
    logo,
    username,
    password,
    planId,
    subscriptionStartDate,
    subscriptionEndDate,
    status = 'ACTIVE',
    enabledModules,
  } = req.body;

  if (!businessName || !ownerName || !email || !mobile || !password || !planId) {
    return res.status(400).json({ error: 'Missing required business or administrator credentials.' });
  }

  // Check email uniqueness
  const existingUser = db.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase() || (username && u.username.toLowerCase() === username.toLowerCase()));
  if (existingUser) {
    return res.status(400).json({ error: 'A user with this email or username already exists.' });
  }

  const now = new Date().toISOString();
  const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

  // Default modules from plan if not provided
  const selectedPlan = db.getPlans().find(p => p.id === planId);
  const modulesToEnable = enabledModules && enabledModules.length > 0
    ? enabledModules
    : (selectedPlan ? selectedPlan.defaultModules : ['dashboard', 'customers', 'ledger', 'transactions', 'reports']);

  const newTenant: Tenant = {
    id: tenantId,
    name: businessName,
    ownerName,
    mobile,
    email,
    address: address || '',
    city: city || '',
    state: state || '',
    country,
    gstNumber: gstNumber || '',
    logo: logo || '',
    planId,
    status,
    enabledModules: modulesToEnable,
    subscriptionStartDate: subscriptionStartDate || now.slice(0, 10),
    subscriptionEndDate: subscriptionEndDate || new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    currency: '₹',
    createdAt: now,
    updatedAt: now,
  };

  const newClientAdmin: User = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    tenantId: newTenant.id,
    name: ownerName,
    email,
    mobile,
    username: username || email,
    passwordHash: password,
    role: 'CLIENT_ADMIN',
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  };

  // Add to database
  db.raw.tenants.push(newTenant);
  db.raw.users.push(newClientAdmin);

  // Initial welcome notification
  db.raw.notifications.push({
    id: `notif_${Date.now()}`,
    tenantId: newTenant.id,
    title: `Welcome to EntriFa!`,
    message: `Your business workspace ${newTenant.name} has been activated with ${modulesToEnable.length} enabled modules.`,
    type: 'SYSTEM',
    read: false,
    createdAt: now,
  });

  db.save();

  recordActivity(req, 'CREATED_CLIENT', 'Clients', {
    tenantId: newTenant.id,
    tenantName: newTenant.name,
    planId: newTenant.planId,
    modulesCount: modulesToEnable.length,
  });

  return res.status(201).json({
    message: 'Client provisioned successfully.',
    tenant: newTenant,
    admin: {
      id: newClientAdmin.id,
      email: newClientAdmin.email,
      username: newClientAdmin.username,
    },
  });
});

// Update Client
router.put('/clients/:id', (req: AuthenticatedRequest, res: Response) => {
  const tenant = db.raw.tenants.find(t => t.id === req.params.id);
  if (!tenant) {
    return res.status(404).json({ error: 'Client not found.' });
  }

  const {
    name,
    ownerName,
    mobile,
    email,
    address,
    city,
    state,
    country,
    gstNumber,
    logo,
    planId,
    status,
    subscriptionStartDate,
    subscriptionEndDate,
    currency,
  } = req.body;

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
  if (planId) tenant.planId = planId;
  if (status) tenant.status = status;
  if (subscriptionStartDate) tenant.subscriptionStartDate = subscriptionStartDate;
  if (subscriptionEndDate) tenant.subscriptionEndDate = subscriptionEndDate;
  if (currency) tenant.currency = currency;
  tenant.updatedAt = new Date().toISOString();

  db.save();

  recordActivity(req, 'UPDATED_CLIENT', 'Clients', { tenantId: tenant.id, tenantName: tenant.name });

  return res.json({ message: 'Client updated successfully.', tenant });
});

// Activate / Deactivate / Suspend Client Status
router.post('/clients/:id/status', (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.body;
  if (!['ACTIVE', 'INACTIVE', 'SUSPENDED', 'TRIAL'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status provided.' });
  }

  const tenant = db.raw.tenants.find(t => t.id === req.params.id);
  if (!tenant) {
    return res.status(404).json({ error: 'Client not found.' });
  }

  tenant.status = status;
  tenant.updatedAt = new Date().toISOString();

  // Also update user status if suspended
  if (status === 'SUSPENDED') {
    db.raw.users.filter(u => u.tenantId === tenant.id).forEach(u => {
      u.status = 'SUSPENDED';
    });
  } else if (status === 'ACTIVE') {
    db.raw.users.filter(u => u.tenantId === tenant.id).forEach(u => {
      u.status = 'ACTIVE';
    });
  }

  db.save();

  recordActivity(req, `CLIENT_${status}`, 'Clients', { tenantId: tenant.id, status });

  return res.json({ message: `Client status updated to ${status}.`, tenant });
});

// Delete Client
router.delete('/clients/:id', (req: AuthenticatedRequest, res: Response) => {
  const index = db.raw.tenants.findIndex(t => t.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Client not found.' });
  }

  const tenantId = req.params.id;
  const deletedTenant = db.raw.tenants.splice(index, 1)[0];

  // Clean up all isolated tenant records
  db.raw.users = db.raw.users.filter(u => u.tenantId !== tenantId);
  db.raw.customers = db.raw.customers.filter(c => c.tenantId !== tenantId);
  db.raw.suppliers = db.raw.suppliers.filter(s => s.tenantId !== tenantId);
  db.raw.transactions = db.raw.transactions.filter(t => t.tenantId !== tenantId);
  db.raw.expenses = db.raw.expenses.filter(e => e.tenantId !== tenantId);
  db.raw.income = db.raw.income.filter(i => i.tenantId !== tenantId);
  db.raw.products = db.raw.products.filter(p => p.tenantId !== tenantId);
  db.raw.stockAdjustments = db.raw.stockAdjustments.filter(sa => sa.tenantId !== tenantId);
  db.raw.invoices = db.raw.invoices.filter(inv => inv.tenantId !== tenantId);
  db.raw.notifications = db.raw.notifications.filter(n => n.tenantId !== tenantId);

  db.save();

  recordActivity(req, 'DELETED_CLIENT', 'Clients', { tenantId, tenantName: deletedTenant.name });

  return res.json({ message: 'Client and all tenant data deleted successfully.' });
});

// Client Module Matrix: Get all clients with their modules
router.get('/module-matrix', (req: AuthenticatedRequest, res: Response) => {
  const modules = db.getModules();
  const matrix = db.getTenants().map(t => ({
    tenantId: t.id,
    name: t.name,
    planId: t.planId,
    status: t.status,
    enabledModules: t.enabledModules,
  }));

  return res.json({
    modules,
    matrix,
  });
});

// Toggle or Update Modules for specific Client
router.put('/clients/:id/modules', (req: AuthenticatedRequest, res: Response) => {
  const { enabledModules, moduleId, enabled } = req.body;
  const tenant = db.raw.tenants.find(t => t.id === req.params.id);
  if (!tenant) {
    return res.status(404).json({ error: 'Client not found.' });
  }

  if (Array.isArray(enabledModules)) {
    tenant.enabledModules = enabledModules;
  } else if (moduleId && typeof enabled === 'boolean') {
    if (enabled) {
      if (!tenant.enabledModules.includes(moduleId)) {
        tenant.enabledModules.push(moduleId);
      }
    } else {
      tenant.enabledModules = tenant.enabledModules.filter(m => m !== moduleId);
    }
  } else {
    return res.status(400).json({ error: 'Invalid module update payload.' });
  }

  tenant.updatedAt = new Date().toISOString();
  db.save();

  recordActivity(req, 'UPDATED_CLIENT_MODULES', 'Modules', {
    tenantId: tenant.id,
    tenantName: tenant.name,
    modules: tenant.enabledModules,
  });

  return res.json({
    message: 'Client modules updated successfully.',
    enabledModules: tenant.enabledModules,
  });
});

// Modules Management
router.get('/modules', (req: AuthenticatedRequest, res: Response) => {
  const modules = db.getModules();
  const tenants = db.getTenants();

  const enriched = modules.map(m => ({
    ...m,
    activeClientCount: tenants.filter(t => t.enabledModules.includes(m.id)).length,
  }));

  return res.json(enriched);
});

// Plans Management
router.get('/plans', (req: AuthenticatedRequest, res: Response) => {
  return res.json(db.getPlans());
});

router.post('/plans', (req: AuthenticatedRequest, res: Response) => {
  const { name, code, price, billingPeriod, maxCustomers, maxStaff, maxTransactions, defaultModules, description } = req.body;
  const newPlan: Plan = {
    id: `plan_${Date.now()}`,
    name,
    code: code || 'CUSTOM',
    price: Number(price) || 0,
    billingPeriod: billingPeriod || 'MONTHLY',
    maxCustomers: Number(maxCustomers) || 100,
    maxStaff: Number(maxStaff) || 2,
    maxTransactions: Number(maxTransactions) || 1000,
    defaultModules: defaultModules || ['dashboard', 'customers', 'ledger', 'transactions', 'reports'],
    description: description || '',
    status: 'ACTIVE',
  };

  db.raw.plans.push(newPlan);
  db.save();
  recordActivity(req, 'CREATED_PLAN', 'Plans', { planId: newPlan.id, planName: newPlan.name });

  return res.status(201).json(newPlan);
});

router.put('/plans/:id', (req: AuthenticatedRequest, res: Response) => {
  const plan = db.raw.plans.find(p => p.id === req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found.' });

  const { name, price, billingPeriod, maxCustomers, maxStaff, maxTransactions, defaultModules, description, status } = req.body;
  if (name) plan.name = name;
  if (price !== undefined) plan.price = Number(price);
  if (billingPeriod) plan.billingPeriod = billingPeriod;
  if (maxCustomers !== undefined) plan.maxCustomers = Number(maxCustomers);
  if (maxStaff !== undefined) plan.maxStaff = Number(maxStaff);
  if (maxTransactions !== undefined) plan.maxTransactions = Number(maxTransactions);
  if (defaultModules) plan.defaultModules = defaultModules;
  if (description !== undefined) plan.description = description;
  if (status) plan.status = status;

  db.save();
  recordActivity(req, 'UPDATED_PLAN', 'Plans', { planId: plan.id });
  return res.json(plan);
});

// Subscription Payments
router.get('/payments', (req: AuthenticatedRequest, res: Response) => {
  return res.json(db.getSubscriptionPayments());
});

router.post('/payments', (req: AuthenticatedRequest, res: Response) => {
  const { tenantId, planId, amount, paymentDate, paymentMethod, transactionId, status, notes } = req.body;
  const tenant = db.getTenants().find(t => t.id === tenantId);
  const plan = db.getPlans().find(p => p.id === planId);

  const payment: SubscriptionPayment = {
    id: `subpay_${Date.now()}`,
    tenantId: tenantId || '',
    tenantName: tenant ? tenant.name : 'Unknown Tenant',
    planId: planId || '',
    planName: plan ? plan.name : 'Subscription',
    amount: Number(amount) || 0,
    paymentDate: paymentDate || new Date().toISOString().slice(0, 10),
    paymentMethod: paymentMethod || 'UPI',
    transactionId: transactionId || `TXN_${Date.now()}`,
    status: status || 'PAID',
    notes: notes || '',
    createdAt: new Date().toISOString(),
  };

  db.raw.subscriptionPayments.unshift(payment);
  db.save();
  recordActivity(req, 'RECORDED_SUBSCRIPTION_PAYMENT', 'Payments', { paymentId: payment.id, amount });

  return res.status(201).json(payment);
});

// Platform Activity Logs
router.get('/logs', (req: AuthenticatedRequest, res: Response) => {
  const { module, role, search } = req.query;
  let logs = db.getActivityLogs();

  if (module && module !== 'ALL') {
    logs = logs.filter(l => l.module === module);
  }

  if (role && role !== 'ALL') {
    logs = logs.filter(l => l.role === role);
  }

  if (search) {
    const q = (search as string).toLowerCase();
    logs = logs.filter(l =>
      l.userName.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      (l.tenantName && l.tenantName.toLowerCase().includes(q))
    );
  }

  return res.json(logs);
});

// System Settings
router.get('/settings', (req: AuthenticatedRequest, res: Response) => {
  return res.json(db.getSettings());
});

router.put('/settings', (req: AuthenticatedRequest, res: Response) => {
  const settings = db.raw.systemSettings;
  const { appName, tagline, logo, defaultCurrency, defaultModules, maintenanceMode, contactEmail, contactPhone } = req.body;

  if (appName) settings.appName = appName;
  if (tagline) settings.tagline = tagline;
  if (logo !== undefined) settings.logo = logo;
  if (defaultCurrency) settings.defaultCurrency = defaultCurrency;
  if (defaultModules) settings.defaultModules = defaultModules;
  if (maintenanceMode !== undefined) settings.maintenanceMode = maintenanceMode;
  if (contactEmail) settings.contactEmail = contactEmail;
  if (contactPhone) settings.contactPhone = contactPhone;

  db.save();
  recordActivity(req, 'UPDATED_SYSTEM_SETTINGS', 'Settings');
  return res.json({ message: 'System settings updated successfully.', settings });
});

export default router;
