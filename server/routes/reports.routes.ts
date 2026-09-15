import { Router, Response } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest, authenticate, requireTenant, requireModule, requirePermission } from '../middleware.js';

const router = Router();

router.use(authenticate);
router.use(requireTenant);
router.use(requireModule('reports'));
router.use(requirePermission('reports', 'view'));

// Day Book: Chronological timeline of all ledger transactions, expenses, income for a specific day or date range
router.get('/daybook', (req: AuthenticatedRequest, res: Response) => {
  const { date = new Date().toISOString().slice(0, 10) } = req.query;
  const tenantId = req.tenantId!;

  const txns = db.getTransactions(tenantId).filter(t => t.date === date);
  const exps = db.getExpenses(tenantId).filter(e => e.date === date);
  const incs = db.getIncome(tenantId).filter(i => i.date === date);
  const customers = db.getCustomers(tenantId);
  const suppliers = db.getSuppliers(tenantId);

  const entries: any[] = [];

  txns.forEach(t => {
    const cust = t.customerId ? customers.find(c => c.id === t.customerId) : null;
    const supp = t.supplierId ? suppliers.find(s => s.id === t.supplierId) : null;
    entries.push({
      id: t.id,
      type: 'TRANSACTION',
      subType: t.type, // GIVE or GET
      amount: t.amount,
      partyName: cust ? cust.name : (supp ? supp.name : 'Unknown'),
      paymentMethod: t.paymentMethod,
      description: t.description,
      createdAt: t.createdAt,
    });
  });

  exps.forEach(e => {
    entries.push({
      id: e.id,
      type: 'EXPENSE',
      subType: e.category,
      amount: e.amount,
      partyName: e.category,
      paymentMethod: e.paymentMethod,
      description: e.description,
      createdAt: e.createdAt,
    });
  });

  incs.forEach(i => {
    entries.push({
      id: i.id,
      type: 'INCOME',
      subType: i.category,
      amount: i.amount,
      partyName: i.category,
      paymentMethod: i.paymentMethod,
      description: i.description,
      createdAt: i.createdAt,
    });
  });

  entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalInflow = entries
    .filter(e => (e.type === 'TRANSACTION' && e.subType === 'GET') || e.type === 'INCOME')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalOutflow = entries
    .filter(e => (e.type === 'TRANSACTION' && e.subType === 'GIVE') || e.type === 'EXPENSE')
    .reduce((sum, e) => sum + e.amount, 0);

  return res.json({
    date,
    entries,
    totalInflow,
    totalOutflow,
    netCashFlow: totalInflow - totalOutflow,
  });
});

// Profit & Loss Report
router.get('/pnl', (req: AuthenticatedRequest, res: Response) => {
  const { startDate, endDate } = req.query;
  const tenantId = req.tenantId!;

  let expenses = db.getExpenses(tenantId);
  let income = db.getIncome(tenantId);

  if (startDate) {
    expenses = expenses.filter(e => e.date >= (startDate as string));
    income = income.filter(i => i.date >= (startDate as string));
  }

  if (endDate) {
    expenses = expenses.filter(e => e.date <= (endDate as string));
    income = income.filter(i => i.date <= (endDate as string));
  }

  const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalIncome - totalExpense;

  const expenseByCategory: Record<string, number> = {};
  expenses.forEach(e => {
    expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
  });

  const incomeByCategory: Record<string, number> = {};
  income.forEach(i => {
    incomeByCategory[i.category] = (incomeByCategory[i.category] || 0) + i.amount;
  });

  return res.json({
    totalIncome,
    totalExpense,
    netProfit,
    incomeByCategory,
    expenseByCategory,
  });
});

// Customer Ledger Statement Report
router.get('/customer-ledger/:customerId', (req: AuthenticatedRequest, res: Response) => {
  const { customerId } = req.params;
  const { startDate, endDate } = req.query;
  const tenantId = req.tenantId!;

  const customer = db.getCustomers(tenantId).find(c => c.id === customerId);
  if (!customer) return res.status(404).json({ error: 'Customer not found.' });

  let txns = db.getTransactions(tenantId).filter(t => t.customerId === customerId);
  if (startDate) txns = txns.filter(t => t.date >= (startDate as string));
  if (endDate) txns = txns.filter(t => t.date <= (endDate as string));

  txns.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return res.json({
    customer,
    transactions: txns,
    openingBalance: customer.openingBalance,
    closingBalance: customer.currentBalance,
    totalCredit: customer.totalCredit,
    totalPayments: customer.totalPayments,
  });
});

// Receivable Report (All customers owing money)
router.get('/receivable', (req: AuthenticatedRequest, res: Response) => {
  const customers = db.getCustomers(req.tenantId!)
    .filter(c => c.currentBalance > 0)
    .sort((a, b) => b.currentBalance - a.currentBalance);

  const totalReceivable = customers.reduce((sum, c) => sum + c.currentBalance, 0);

  return res.json({ customers, totalReceivable });
});

// Payable Report (All suppliers to whom money is owed)
router.get('/payable', (req: AuthenticatedRequest, res: Response) => {
  const suppliers = db.getSuppliers(req.tenantId!)
    .filter(s => s.currentBalance > 0)
    .sort((a, b) => b.currentBalance - a.currentBalance);

  const totalPayable = suppliers.reduce((sum, s) => sum + s.currentBalance, 0);

  return res.json({ suppliers, totalPayable });
});

export default router;
