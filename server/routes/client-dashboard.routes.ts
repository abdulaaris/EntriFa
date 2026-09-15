import { Router, Response } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest, authenticate, requireTenant, requireModule } from '../middleware.js';

const router = Router();

router.use(authenticate);
router.use(requireTenant);
router.use(requireModule('dashboard'));

router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const tenant = db.getTenants().find(t => t.id === tenantId);
  const customers = db.getCustomers(tenantId);
  const suppliers = db.getSuppliers(tenantId);
  const transactions = db.getTransactions(tenantId);
  const expenses = db.getExpenses(tenantId);
  const incomeList = db.getIncome(tenantId);

  // Today and Month strings
  const todayStr = new Date().toISOString().slice(0, 10);
  const thisMonthStr = todayStr.slice(0, 7);

  // 1. Total Receivable (Sum of all positive customer balances)
  const totalReceivable = customers
    .filter(c => c.currentBalance > 0)
    .reduce((sum, c) => sum + c.currentBalance, 0);

  // 2. Total Payable (Sum of all supplier balances)
  const totalPayable = suppliers
    .filter(s => s.currentBalance > 0)
    .reduce((sum, s) => sum + s.currentBalance, 0);

  // 3. Today's Collection (Customer GET transactions today)
  const todayCollection = transactions
    .filter(t => t.date === todayStr && t.type === 'GET' && t.customerId)
    .reduce((sum, t) => sum + t.amount, 0);

  // 4. Today's Expense
  const todayExpense = expenses
    .filter(e => e.date === todayStr)
    .reduce((sum, e) => sum + e.amount, 0);

  // 5. Monthly Income (Direct Income + Collections)
  const monthlyIncome = incomeList
    .filter(i => i.date.startsWith(thisMonthStr))
    .reduce((sum, i) => sum + i.amount, 0) +
    transactions
      .filter(t => t.date.startsWith(thisMonthStr) && t.type === 'GET' && t.customerId)
      .reduce((sum, t) => sum + t.amount, 0);

  // 6. Monthly Expense
  const monthlyExpense = expenses
    .filter(e => e.date.startsWith(thisMonthStr))
    .reduce((sum, e) => sum + e.amount, 0);

  // Recent Transactions (last 6)
  const recentTransactions = transactions
    .slice(0, 6)
    .map(t => {
      const cust = t.customerId ? customers.find(c => c.id === t.customerId) : null;
      const supp = t.supplierId ? suppliers.find(s => s.id === t.supplierId) : null;
      return {
        ...t,
        partyName: cust ? cust.name : (supp ? supp.name : 'Direct'),
      };
    });

  // Recent Customers
  const recentCustomers = customers
    .slice(0, 5)
    .map(c => ({
      id: c.id,
      name: c.name,
      mobile: c.mobile,
      currentBalance: c.currentBalance,
      lastTransactionDate: c.lastTransactionDate,
    }));

  // Payment Reminders (Customers owing money, sorted highest first)
  const paymentReminders = customers
    .filter(c => c.currentBalance > 0)
    .sort((a, b) => b.currentBalance - a.currentBalance)
    .slice(0, 5)
    .map(c => ({
      id: c.id,
      name: c.name,
      mobile: c.mobile,
      amountDue: c.currentBalance,
      lastTransactionDate: c.lastTransactionDate,
    }));

  // Charts
  const incomeVsExpense = [
    { month: 'Apr', income: 42000, expense: 28000 },
    { month: 'May', income: 55000, expense: 32000 },
    { month: 'Jun', income: 61000, expense: 36000 },
    { month: 'Jul', income: 68000, expense: 39000 },
    { month: 'Aug', income: 74000, expense: 41000 },
    { month: 'Sep', income: Math.max(82000, monthlyIncome), expense: Math.max(45000, monthlyExpense) },
  ];

  const receivableVsPayable = [
    { name: 'Receivable (You will Get)', value: totalReceivable, color: '#16A34A' },
    { name: 'Payable (You will Give)', value: totalPayable, color: '#DC2626' },
  ];

  const monthlyTransactions = [
    { month: 'Apr', give: 28000, get: 22000 },
    { month: 'May', give: 35000, get: 31000 },
    { month: 'Jun', give: 41000, get: 39000 },
    { month: 'Jul', give: 46000, get: 44000 },
    { month: 'Aug', give: 52000, get: 50000 },
    { month: 'Sep', give: 58000, get: 54000 },
  ];

  return res.json({
    kpis: {
      totalReceivable,
      totalPayable,
      todayCollection,
      todayExpense,
      monthlyIncome,
      monthlyExpense,
      currency: tenant?.currency || '₹',
    },
    recentTransactions,
    recentCustomers,
    paymentReminders,
    charts: {
      incomeVsExpense,
      receivableVsPayable,
      monthlyTransactions,
    },
    businessInfo: {
      name: tenant?.name,
      owner: tenant?.ownerName,
      logo: tenant?.logo,
      status: tenant?.status,
      subscriptionEndDate: tenant?.subscriptionEndDate,
    },
  });
});

export default router;
