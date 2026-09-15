import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  User,
  Tenant,
  Plan,
  ModuleDefinition,
  Customer,
  Supplier,
  Transaction,
  Expense,
  Income,
  Product,
  StockAdjustment,
  Invoice,
  SubscriptionPayment,
  Notification,
  ActivityLog,
  SystemSettings,
} from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export interface DatabaseSchema {
  users: User[];
  tenants: Tenant[];
  plans: Plan[];
  modules: ModuleDefinition[];
  customers: Customer[];
  suppliers: Supplier[];
  transactions: Transaction[];
  expenses: Expense[];
  income: Income[];
  products: Product[];
  stockAdjustments: StockAdjustment[];
  invoices: Invoice[];
  subscriptionPayments: SubscriptionPayment[];
  notifications: Notification[];
  activityLogs: ActivityLog[];
  systemSettings: SystemSettings;
}

const DEFAULT_MODULES: ModuleDefinition[] = [
  { id: 'dashboard', name: 'Dashboard', description: 'Business overview, KPIs & metrics', icon: 'LayoutDashboard', version: '1.0.0', status: 'ACTIVE', isCore: true },
  { id: 'customers', name: 'Customers', description: 'Customer directory & balance management', icon: 'Users', version: '1.0.0', status: 'ACTIVE' },
  { id: 'suppliers', name: 'Suppliers', description: 'Supplier accounts & payables', icon: 'Truck', version: '1.0.0', status: 'ACTIVE' },
  { id: 'ledger', name: 'Ledger', description: 'Digital Khata running ledger timeline', icon: 'BookOpen', version: '1.0.0', status: 'ACTIVE' },
  { id: 'transactions', name: 'Transactions', description: 'GIVE & GET fast entries with payment modes', icon: 'ArrowLeftRight', version: '1.0.0', status: 'ACTIVE' },
  { id: 'payments', name: 'Payments', description: 'Customer & supplier payment records', icon: 'CreditCard', version: '1.0.0', status: 'ACTIVE' },
  { id: 'expenses', name: 'Expenses', description: 'Daily business operational expense tracking', icon: 'TrendingDown', version: '1.0.0', status: 'ACTIVE' },
  { id: 'income', name: 'Income', description: 'Direct sales & miscellaneous income streams', icon: 'TrendingUp', version: '1.0.0', status: 'ACTIVE' },
  { id: 'products', name: 'Products', description: 'Item master catalog with purchase & selling prices', icon: 'Package', version: '1.0.0', status: 'ACTIVE' },
  { id: 'inventory', name: 'Inventory', description: 'Stock adjustments, balance & low stock alerts', icon: 'Boxes', version: '1.0.0', status: 'ACTIVE' },
  { id: 'invoices', name: 'Invoices', description: 'Tax invoices, discounts, print, PDF & WhatsApp share', icon: 'Receipt', version: '1.0.0', status: 'ACTIVE' },
  { id: 'reports', name: 'Reports', description: 'Day Book, Customer Ledger, P&L, Statement exports', icon: 'FileBarChart', version: '1.0.0', status: 'ACTIVE' },
  { id: 'staff', name: 'Staff', description: 'Staff logins & granular module permission matrix', icon: 'UserCheck', version: '1.0.0', status: 'ACTIVE' },
  { id: 'notifications', name: 'Notifications', description: 'Automated alerts for dues, stock & updates', icon: 'Bell', version: '1.0.0', status: 'ACTIVE' },
];

const DEFAULT_PLANS: Plan[] = [
  {
    id: 'plan_free',
    name: 'Free Starter',
    code: 'FREE',
    price: 0,
    billingPeriod: 'MONTHLY',
    maxCustomers: 50,
    maxStaff: 1,
    maxTransactions: 200,
    defaultModules: ['dashboard', 'customers', 'suppliers', 'ledger', 'transactions', 'reports'],
    description: 'Perfect for small micro-businesses and individual shop owners.',
    status: 'ACTIVE',
  },
  {
    id: 'plan_basic',
    name: 'Basic Business',
    code: 'BASIC',
    price: 499,
    billingPeriod: 'MONTHLY',
    maxCustomers: 250,
    maxStaff: 2,
    maxTransactions: 1000,
    defaultModules: ['dashboard', 'customers', 'suppliers', 'ledger', 'transactions', 'payments', 'expenses', 'income', 'reports'],
    description: 'Designed for single retail stores and service providers needing expense control.',
    status: 'ACTIVE',
  },
  {
    id: 'plan_pro',
    name: 'Pro Trader',
    code: 'PRO',
    price: 999,
    billingPeriod: 'MONTHLY',
    maxCustomers: 1000,
    maxStaff: 5,
    maxTransactions: 5000,
    defaultModules: ['dashboard', 'customers', 'suppliers', 'ledger', 'transactions', 'payments', 'expenses', 'income', 'products', 'inventory', 'invoices', 'reports', 'staff', 'notifications'],
    description: 'Complete commercial suite with full inventory, multi-staff, and invoicing.',
    status: 'ACTIVE',
  },
  {
    id: 'plan_premium',
    name: 'Enterprise Premium',
    code: 'PREMIUM',
    price: 1999,
    billingPeriod: 'MONTHLY',
    maxCustomers: 10000,
    maxStaff: 25,
    maxTransactions: 50000,
    defaultModules: ['dashboard', 'customers', 'suppliers', 'ledger', 'transactions', 'payments', 'expenses', 'income', 'products', 'inventory', 'invoices', 'reports', 'staff', 'notifications'],
    description: 'High-volume wholesale traders and multi-branch operations.',
    status: 'ACTIVE',
  },
];

const DEFAULT_SETTINGS: SystemSettings = {
  appName: 'EntriFa',
  tagline: 'Simple Business. Smart Accounts.',
  logo: '/entrifa-logo.svg',
  defaultCurrency: '₹',
  defaultModules: ['dashboard', 'customers', 'suppliers', 'ledger', 'transactions', 'expenses', 'reports'],
  maintenanceMode: false,
  allowRegistration: false,
  contactEmail: 'support@entrifa.com',
  contactPhone: '+91 80000 12345',
};

class Database {
  private data: DatabaseSchema;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } catch (err) {
        console.error('Error loading db.json, generating initial database...', err);
        this.data = this.createInitialData();
        this.save();
      }
    } else {
      this.data = this.createInitialData();
      this.save();
    }
  }

  private createInitialData(): DatabaseSchema {
    return {
      users: [],
      tenants: [],
      plans: DEFAULT_PLANS,
      modules: DEFAULT_MODULES,
      customers: [],
      suppliers: [],
      transactions: [],
      expenses: [],
      income: [],
      products: [],
      stockAdjustments: [],
      invoices: [],
      subscriptionPayments: [],
      notifications: [],
      activityLogs: [],
      systemSettings: DEFAULT_SETTINGS,
    };
  }

  public save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write db.json:', err);
    }
  }

  // Getters & Collections
  public getUsers() { return this.data.users; }
  public getTenants() { return this.data.tenants; }
  public getPlans() { return this.data.plans; }
  public getModules() { return this.data.modules; }
  public getCustomers(tenantId: string) { return this.data.customers.filter(c => c.tenantId === tenantId); }
  public getSuppliers(tenantId: string) { return this.data.suppliers.filter(s => s.tenantId === tenantId); }
  public getTransactions(tenantId: string) { return this.data.transactions.filter(t => t.tenantId === tenantId); }
  public getExpenses(tenantId: string) { return this.data.expenses.filter(e => e.tenantId === tenantId); }
  public getIncome(tenantId: string) { return this.data.income.filter(i => i.tenantId === tenantId); }
  public getProducts(tenantId: string) { return this.data.products.filter(p => p.tenantId === tenantId); }
  public getStockAdjustments(tenantId: string) { return this.data.stockAdjustments.filter(sa => sa.tenantId === tenantId); }
  public getInvoices(tenantId: string) { return this.data.invoices.filter(inv => inv.tenantId === tenantId); }
  public getSubscriptionPayments() { return this.data.subscriptionPayments; }
  public getNotifications(tenantId: string | null) {
    return this.data.notifications.filter(n => n.tenantId === tenantId);
  }
  public getActivityLogs(tenantId?: string | null) {
    if (!tenantId) return this.data.activityLogs;
    return this.data.activityLogs.filter(a => a.tenantId === tenantId);
  }
  public getSettings() { return this.data.systemSettings; }

  // Direct state access for mutations
  public get raw() {
    return this.data;
  }
}

export const db = new Database();
