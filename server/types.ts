export type Role = 'SUPER_ADMIN' | 'CLIENT_ADMIN' | 'STAFF';

export interface User {
  id: string;
  tenantId: string | null; // null for SUPER_ADMIN
  name: string;
  email: string;
  mobile: string;
  username: string;
  passwordHash: string;
  role: Role;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  permissions?: StaffPermissions; // for STAFF role
  createdAt: string;
  updatedAt: string;
}

export interface StaffPermissions {
  [moduleId: string]: {
    view: boolean;
    add: boolean;
    edit: boolean;
    delete: boolean;
    export: boolean;
  };
}

export interface Tenant {
  id: string;
  name: string;
  ownerName: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  gstNumber?: string;
  logo?: string;
  planId: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TRIAL';
  enabledModules: string[];
  subscriptionStartDate: string;
  subscriptionEndDate: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  version: string;
  status: 'ACTIVE' | 'INACTIVE';
  isCore?: boolean;
}

export interface Plan {
  id: string;
  name: string;
  code: 'FREE' | 'BASIC' | 'PRO' | 'PREMIUM';
  price: number;
  billingPeriod: 'MONTHLY' | 'ANNUAL';
  maxCustomers: number;
  maxStaff: number;
  maxTransactions: number;
  defaultModules: string[];
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface SubscriptionPayment {
  id: string;
  tenantId: string;
  tenantName: string;
  planId: string;
  planName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'CASH';
  transactionId: string;
  status: 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED';
  notes?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  mobile: string;
  email?: string;
  address?: string;
  openingBalance: number; // positive = customer owes business (credit), negative = business owes customer (advance)
  currentBalance: number;
  totalCredit: number; // sum of GIVE
  totalPayments: number; // sum of GET
  lastTransactionDate?: string;
  status: 'ACTIVE' | 'INACTIVE';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  tenantId: string;
  name: string;
  mobile: string;
  email?: string;
  address?: string;
  openingBalance: number; // positive = business owes supplier (payable)
  currentBalance: number;
  totalCredit: number; // Purchases on credit
  totalPayments: number; // Payments made to supplier
  lastTransactionDate?: string;
  status: 'ACTIVE' | 'INACTIVE';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = 'GIVE' | 'GET'; // GIVE = Credit given to customer / credit from supplier. GET = Payment received from customer / payment to supplier.
export type PaymentMethod = 'CASH' | 'UPI' | 'BANK' | 'CARD' | 'OTHER';

export interface Transaction {
  id: string;
  tenantId: string;
  customerId?: string;
  supplierId?: string;
  type: TransactionType;
  amount: number;
  runningBalance: number; // balance right after this transaction
  paymentMethod: PaymentMethod;
  description: string;
  date: string; // YYYY-MM-DD
  attachment?: string;
  notes?: string;
  createdBy: string; // User name or ID
  createdAt: string;
}

export interface Expense {
  id: string;
  tenantId: string;
  category: 'Rent' | 'Salary' | 'Electricity' | 'Transport' | 'Purchase' | 'Marketing' | 'Maintenance' | 'Other';
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  description: string;
  attachment?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface Income {
  id: string;
  tenantId: string;
  category: 'Sales' | 'Service' | 'Commission' | 'Interest' | 'Consulting' | 'Other';
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  description: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  sku: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  lowStockLimit: number;
  unit: 'Pcs' | 'Kg' | 'Ltr' | 'Box' | 'Mtr' | 'Unit';
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface StockAdjustment {
  id: string;
  tenantId: string;
  productId: string;
  productName: string;
  type: 'ADD' | 'REDUCE';
  quantity: number;
  reason: string;
  previousStock: number;
  newStock: number;
  createdBy: string;
  createdAt: string;
}

export interface InvoiceItem {
  productId?: string;
  description: string;
  quantity: number;
  price: number;
  discount: number; // in percentage or fixed amount
  tax: number; // in percentage
  total: number;
}

export interface Invoice {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  items: InvoiceItem[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  paidAmount: number;
  status: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' | 'OVERDUE';
  issueDate: string;
  dueDate: string;
  notes?: string;
  terms?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  tenantId?: string | null; // null for platform-wide/Super Admin notifications
  title: string;
  message: string;
  type: 'PAYMENT' | 'REMINDER' | 'LOW_STOCK' | 'INVOICE' | 'SUBSCRIPTION' | 'SYSTEM';
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  role: Role;
  action: string;
  module: string;
  tenantId?: string | null;
  tenantName?: string;
  date: string;
  time: string;
  ip?: string;
  device?: string;
  details?: Record<string, any>;
  createdAt: string;
}

export interface SystemSettings {
  appName: string;
  tagline: string;
  logo: string;
  defaultCurrency: string;
  defaultModules: string[];
  maintenanceMode: boolean;
  allowRegistration: boolean;
  contactEmail: string;
  contactPhone: string;
}
