import { Router, Response } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest, authenticate, requireTenant, requireModule, requirePermission, recordActivity } from '../middleware.js';
import { Expense, Income, PaymentMethod } from '../types.js';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

// --- EXPENSES ---
router.get('/expenses', requireModule('expenses'), requirePermission('expenses', 'view'), (req: AuthenticatedRequest, res: Response) => {
  const { category, startDate, endDate } = req.query;
  let expenses = db.getExpenses(req.tenantId!);

  if (category && category !== 'ALL') {
    expenses = expenses.filter(e => e.category === category);
  }

  if (startDate) {
    expenses = expenses.filter(e => e.date >= (startDate as string));
  }

  if (endDate) {
    expenses = expenses.filter(e => e.date <= (endDate as string));
  }

  expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Metrics
  const todayStr = new Date().toISOString().slice(0, 10);
  const thisMonthStr = todayStr.slice(0, 7);

  const todayExpense = expenses
    .filter(e => e.date === todayStr)
    .reduce((sum, e) => sum + e.amount, 0);

  const monthlyExpense = expenses
    .filter(e => e.date.startsWith(thisMonthStr))
    .reduce((sum, e) => sum + e.amount, 0);

  // Category breakdown
  const categoryBreakdown: Record<string, number> = {};
  expenses.forEach(e => {
    categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + e.amount;
  });

  return res.json({
    expenses,
    todayExpense,
    monthlyExpense,
    categoryBreakdown,
  });
});

router.post('/expenses', requireModule('expenses'), requirePermission('expenses', 'add'), (req: AuthenticatedRequest, res: Response) => {
  const { category, amount, date, paymentMethod = 'CASH', description, notes, attachment } = req.body;

  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ error: 'Please enter a valid expense amount.' });
  }

  const now = new Date().toISOString();
  const newExpense: Expense = {
    id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    tenantId: req.tenantId!,
    category: category || 'Other',
    amount: numAmount,
    date: date || now.slice(0, 10),
    paymentMethod: paymentMethod as PaymentMethod,
    description: description || '',
    notes,
    attachment,
    createdBy: req.user?.name || 'Staff',
    createdAt: now,
  };

  db.raw.expenses.unshift(newExpense);
  db.save();

  recordActivity(req, 'RECORDED_EXPENSE', 'Expenses', { category: newExpense.category, amount: numAmount });

  return res.status(201).json(newExpense);
});

router.delete('/expenses/:id', requireModule('expenses'), requirePermission('expenses', 'delete'), (req: AuthenticatedRequest, res: Response) => {
  const index = db.raw.expenses.findIndex(e => e.tenantId === req.tenantId && e.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Expense not found.' });
  }

  const expense = db.raw.expenses.splice(index, 1)[0];
  db.save();
  recordActivity(req, 'DELETED_EXPENSE', 'Expenses', { expenseId: expense.id, amount: expense.amount });

  return res.json({ message: 'Expense deleted successfully.' });
});

// --- INCOME ---
router.get('/income', requireModule('income'), requirePermission('income', 'view'), (req: AuthenticatedRequest, res: Response) => {
  const { category, startDate, endDate } = req.query;
  let incomeList = db.getIncome(req.tenantId!);

  if (category && category !== 'ALL') {
    incomeList = incomeList.filter(i => i.category === category);
  }

  if (startDate) {
    incomeList = incomeList.filter(i => i.date >= (startDate as string));
  }

  if (endDate) {
    incomeList = incomeList.filter(i => i.date <= (endDate as string));
  }

  incomeList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const todayStr = new Date().toISOString().slice(0, 10);
  const thisMonthStr = todayStr.slice(0, 7);

  const todayIncome = incomeList
    .filter(i => i.date === todayStr)
    .reduce((sum, i) => sum + i.amount, 0);

  const monthlyIncome = incomeList
    .filter(i => i.date.startsWith(thisMonthStr))
    .reduce((sum, i) => sum + i.amount, 0);

  const categoryBreakdown: Record<string, number> = {};
  incomeList.forEach(i => {
    categoryBreakdown[i.category] = (categoryBreakdown[i.category] || 0) + i.amount;
  });

  return res.json({
    income: incomeList,
    todayIncome,
    monthlyIncome,
    categoryBreakdown,
  });
});

router.post('/income', requireModule('income'), requirePermission('income', 'add'), (req: AuthenticatedRequest, res: Response) => {
  const { category, amount, date, paymentMethod = 'CASH', description, notes } = req.body;

  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ error: 'Please enter a valid income amount.' });
  }

  const now = new Date().toISOString();
  const newIncome: Income = {
    id: `inc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    tenantId: req.tenantId!,
    category: category || 'Sales',
    amount: numAmount,
    date: date || now.slice(0, 10),
    paymentMethod: paymentMethod as PaymentMethod,
    description: description || '',
    notes,
    createdBy: req.user?.name || 'Staff',
    createdAt: now,
  };

  db.raw.income.unshift(newIncome);
  db.save();

  recordActivity(req, 'RECORDED_INCOME', 'Income', { category: newIncome.category, amount: numAmount });

  return res.status(201).json(newIncome);
});

router.delete('/income/:id', requireModule('income'), requirePermission('income', 'delete'), (req: AuthenticatedRequest, res: Response) => {
  const index = db.raw.income.findIndex(i => i.tenantId === req.tenantId && i.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Income record not found.' });
  }

  const inc = db.raw.income.splice(index, 1)[0];
  db.save();
  recordActivity(req, 'DELETED_INCOME', 'Income', { incomeId: inc.id, amount: inc.amount });

  return res.json({ message: 'Income record deleted successfully.' });
});

export default router;
