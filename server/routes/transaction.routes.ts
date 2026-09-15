import { Router, Response } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest, authenticate, requireTenant, requireModule, requirePermission, recordActivity } from '../middleware.js';
import { Transaction, TransactionType, PaymentMethod } from '../types.js';

const router = Router();

router.use(authenticate);
router.use(requireTenant);
router.use(requireModule('transactions'));

// List transactions
router.get('/', requirePermission('transactions', 'view'), (req: AuthenticatedRequest, res: Response) => {
  const { customerId, supplierId, type, startDate, endDate } = req.query;
  let transactions = db.getTransactions(req.tenantId!);

  if (customerId) {
    transactions = transactions.filter(t => t.customerId === customerId);
  }

  if (supplierId) {
    transactions = transactions.filter(t => t.supplierId === supplierId);
  }

  if (type && (type === 'GIVE' || type === 'GET')) {
    transactions = transactions.filter(t => t.type === type);
  }

  if (startDate) {
    transactions = transactions.filter(t => t.date >= (startDate as string));
  }

  if (endDate) {
    transactions = transactions.filter(t => t.date <= (endDate as string));
  }

  // Enrich with customer or supplier name
  const customers = db.getCustomers(req.tenantId!);
  const suppliers = db.getSuppliers(req.tenantId!);

  const enriched = transactions.map(t => {
    const cust = t.customerId ? customers.find(c => c.id === t.customerId) : null;
    const supp = t.supplierId ? suppliers.find(s => s.id === t.supplierId) : null;
    return {
      ...t,
      partyName: cust ? cust.name : (supp ? supp.name : 'Unknown Party'),
      partyMobile: cust ? cust.mobile : (supp ? supp.mobile : ''),
    };
  });

  enriched.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json(enriched);
});

// Record new transaction (GIVE or GET)
router.post('/', requirePermission('transactions', 'add'), (req: AuthenticatedRequest, res: Response) => {
  const {
    customerId,
    supplierId,
    type,
    amount,
    date,
    paymentMethod = 'CASH',
    description,
    notes,
    attachment,
  } = req.body;

  if (!type || !['GIVE', 'GET'].includes(type)) {
    return res.status(400).json({ error: 'Valid transaction type (GIVE or GET) is required.' });
  }

  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ error: 'Please enter a valid amount greater than 0.' });
  }

  if (!customerId && !supplierId) {
    return res.status(400).json({ error: 'Either Customer or Supplier must be selected.' });
  }

  // Check plan transaction quota
  const tenant = db.getTenants().find(t => t.id === req.tenantId);
  const plan = tenant ? db.getPlans().find(p => p.id === tenant.planId) : null;
  const currentCount = db.getTransactions(req.tenantId!).length;

  if (plan && currentCount >= plan.maxTransactions) {
    return res.status(403).json({
      error: `Monthly transaction limit reached for your ${plan.name} (${plan.maxTransactions} txns). Upgrade plan to proceed.`,
    });
  }

  const now = new Date().toISOString();
  const txnDate = date || now.slice(0, 10);
  let runningBalance = 0;
  let partyName = '';

  // Handle Customer Ledger update
  if (customerId) {
    const customer = db.raw.customers.find(c => c.tenantId === req.tenantId && c.id === customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    partyName = customer.name;

    if (type === 'GIVE') {
      // We gave credit/goods -> Customer owes us more
      customer.currentBalance += numAmount;
      customer.totalCredit += numAmount;
    } else {
      // GET: We received payment -> Customer owes us less (or goes into advance)
      customer.currentBalance -= numAmount;
      customer.totalPayments += numAmount;
    }

    customer.lastTransactionDate = txnDate;
    customer.updatedAt = now;
    runningBalance = customer.currentBalance;
  }
  // Handle Supplier Ledger update
  else if (supplierId) {
    const supplier = db.raw.suppliers.find(s => s.tenantId === req.tenantId && s.id === supplierId);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found.' });
    }

    partyName = supplier.name;

    if (type === 'GIVE') {
      // In supplier context: GIVE = payment given to supplier -> reduces our payable
      supplier.currentBalance -= numAmount;
      supplier.totalPayments += numAmount;
    } else {
      // GET = goods received on credit from supplier -> increases our payable
      supplier.currentBalance += numAmount;
      supplier.totalCredit += numAmount;
    }

    supplier.lastTransactionDate = txnDate;
    supplier.updatedAt = now;
    runningBalance = supplier.currentBalance;
  }

  const newTxn: Transaction = {
    id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    tenantId: req.tenantId!,
    customerId,
    supplierId,
    type: type as TransactionType,
    amount: numAmount,
    runningBalance,
    paymentMethod: paymentMethod as PaymentMethod,
    description: description || (type === 'GET' ? 'Payment Received' : 'Credit Given'),
    date: txnDate,
    notes,
    attachment,
    createdBy: req.user?.name || 'Staff',
    createdAt: now,
  };

  db.raw.transactions.push(newTxn);

  // If payment received, add in-app notification
  if (type === 'GET' && customerId) {
    db.raw.notifications.push({
      id: `notif_${Date.now()}`,
      tenantId: req.tenantId!,
      title: 'Payment Received',
      message: `Received ${tenant?.currency || '₹'}${numAmount.toLocaleString()} from ${partyName} via ${paymentMethod}.`,
      type: 'PAYMENT',
      read: false,
      link: `/customers/${customerId}`,
      createdAt: now,
    });
  }

  db.save();

  recordActivity(req, 'RECORDED_TRANSACTION', 'Transactions', {
    txnId: newTxn.id,
    type,
    amount: numAmount,
    party: partyName,
  });

  return res.status(201).json({
    transaction: newTxn,
    newBalance: runningBalance,
  });
});

export default router;
