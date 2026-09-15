import { Router, Response } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest, authenticate, requireTenant, requireModule, requirePermission, recordActivity } from '../middleware.js';
import { Customer } from '../types.js';

const router = Router();

router.use(authenticate);
router.use(requireTenant);
router.use(requireModule('customers'));

// List customers
router.get('/', requirePermission('customers', 'view'), (req: AuthenticatedRequest, res: Response) => {
  const { search, filter } = req.query;
  let customers = db.getCustomers(req.tenantId!);

  if (search) {
    const q = (search as string).toLowerCase();
    customers = customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.mobile.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  }

  if (filter === 'RECEIVABLE') {
    // Customer owes money (balance > 0)
    customers = customers.filter(c => c.currentBalance > 0);
  } else if (filter === 'ADVANCE') {
    // Advance paid (balance < 0)
    customers = customers.filter(c => c.currentBalance < 0);
  } else if (filter === 'SETTLED') {
    customers = customers.filter(c => c.currentBalance === 0);
  }

  // Sort by last transaction date or name
  customers.sort((a, b) => (b.lastTransactionDate || b.createdAt).localeCompare(a.lastTransactionDate || a.createdAt));

  return res.json(customers);
});

// Get single customer with ledger history
router.get('/:id', requirePermission('customers', 'view'), (req: AuthenticatedRequest, res: Response) => {
  const customer = db.getCustomers(req.tenantId!).find(c => c.id === req.params.id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  // Fetch transactions for this customer
  const transactions = db.getTransactions(req.tenantId!)
    .filter(t => t.customerId === customer.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json({
    customer,
    transactions,
  });
});

// Create Customer
router.post('/', requirePermission('customers', 'add'), (req: AuthenticatedRequest, res: Response) => {
  const { name, mobile, email, address, openingBalance = 0, notes } = req.body;

  if (!name || !mobile) {
    return res.status(400).json({ error: 'Customer Name and Mobile Number are required.' });
  }

  // Check quota
  const tenant = db.getTenants().find(t => t.id === req.tenantId);
  const plan = tenant ? db.getPlans().find(p => p.id === tenant.planId) : null;
  const currentCount = db.getCustomers(req.tenantId!).length;

  if (plan && currentCount >= plan.maxCustomers) {
    return res.status(403).json({
      error: `Customer quota reached for your ${plan.name} (${plan.maxCustomers} max). Please upgrade your plan.`,
    });
  }

  const now = new Date().toISOString();
  const initialBal = Number(openingBalance) || 0;

  const newCustomer: Customer = {
    id: `cust_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    tenantId: req.tenantId!,
    name,
    mobile,
    email: email || '',
    address: address || '',
    openingBalance: initialBal,
    currentBalance: initialBal,
    totalCredit: initialBal > 0 ? initialBal : 0,
    totalPayments: initialBal < 0 ? Math.abs(initialBal) : 0,
    status: 'ACTIVE',
    notes: notes || '',
    createdAt: now,
    updatedAt: now,
  };

  db.raw.customers.push(newCustomer);

  // If opening balance != 0, create an initial opening transaction
  if (initialBal !== 0) {
    db.raw.transactions.push({
      id: `txn_${Date.now()}_op`,
      tenantId: req.tenantId!,
      customerId: newCustomer.id,
      type: initialBal > 0 ? 'GIVE' : 'GET',
      amount: Math.abs(initialBal),
      runningBalance: initialBal,
      paymentMethod: 'OTHER',
      description: 'Opening Balance',
      date: now.slice(0, 10),
      createdBy: req.user?.name || 'Admin',
      createdAt: now,
    });
    newCustomer.lastTransactionDate = now.slice(0, 10);
  }

  db.save();

  recordActivity(req, 'CREATED_CUSTOMER', 'Customers', { customerId: newCustomer.id, name: newCustomer.name });

  return res.status(201).json(newCustomer);
});

// Update Customer
router.put('/:id', requirePermission('customers', 'edit'), (req: AuthenticatedRequest, res: Response) => {
  const customer = db.raw.customers.find(c => c.tenantId === req.tenantId && c.id === req.params.id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  const { name, mobile, email, address, notes, status } = req.body;
  if (name) customer.name = name;
  if (mobile) customer.mobile = mobile;
  if (email !== undefined) customer.email = email;
  if (address !== undefined) customer.address = address;
  if (notes !== undefined) customer.notes = notes;
  if (status) customer.status = status;
  customer.updatedAt = new Date().toISOString();

  db.save();
  recordActivity(req, 'UPDATED_CUSTOMER', 'Customers', { customerId: customer.id, name: customer.name });

  return res.json(customer);
});

// Delete Customer
router.delete('/:id', requirePermission('customers', 'delete'), (req: AuthenticatedRequest, res: Response) => {
  const index = db.raw.customers.findIndex(c => c.tenantId === req.tenantId && c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  const customer = db.raw.customers.splice(index, 1)[0];
  // Remove related transactions
  db.raw.transactions = db.raw.transactions.filter(t => !(t.tenantId === req.tenantId && t.customerId === customer.id));

  db.save();
  recordActivity(req, 'DELETED_CUSTOMER', 'Customers', { customerId: customer.id, name: customer.name });

  return res.json({ message: 'Customer deleted successfully.' });
});

export default router;
