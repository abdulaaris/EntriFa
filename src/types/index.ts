export type Role = 'SUPER_ADMIN' | 'CLIENT_ADMIN' | 'STAFF';

export type StaffPermissions = Record<string, {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  export: boolean;
}>;

export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  mobile: string;
  role: Role;
  tenantId: string | null;
  permissions?: StaffPermissions;
  isImpersonating?: boolean;
  createdAt?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug?: string;
  ownerName: string;
  mobile?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  gstNumber?: string;
  logo?: string;
  planId: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TRIAL';
  enabledModules: string[];
  subscriptionStartDate?: string;
  subscriptionEndDate: string;
  currency: string;
  planName?: string;
  planCode?: string;
}

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  mobile: string;
  email?: string;
  address?: string;
  openingBalance: number;
  currentBalance: number;
  totalCredit: number;
  totalPayments: number;
  lastTransactionDate?: string;
  status: 'ACTIVE' | 'INACTIVE';
  notes?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  tenantId: string;
  name: string;
  mobile: string;
  email?: string;
  address?: string;
  openingBalance: number;
  currentBalance: number;
  totalCredit: number;
  totalPayments: number;
  lastTransactionDate?: string;
  status: 'ACTIVE' | 'INACTIVE';
  notes?: string;
  createdAt: string;
}

export type TransactionType = 'GIVE' | 'GET';
export type PaymentMethod = 'CASH' | 'UPI' | 'BANK' | 'CARD' | 'OTHER';

export interface Transaction {
  id: string;
  tenantId: string;
  customerId?: string;
  supplierId?: string;
  partyName?: string;
  partyMobile?: string;
  type: TransactionType;
  amount: number;
  runningBalance: number;
  paymentMethod: PaymentMethod;
  description: string;
  date: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  tenantId: string;
  category: string;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  description: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface Income {
  id: string;
  tenantId: string;
  category: string;
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
  unit: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface InvoiceItem {
  productId?: string;
  description: string;
  quantity: number;
  price: number;
  discount: number;
  tax: number;
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
}

export interface NotificationItem {
  id: string;
  tenantId?: string | null;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface ActivityLogItem {
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
  details?: any;
  createdAt: string;
}

export interface PlanItem {
  id: string;
  name: string;
  code: string;
  price: number;
  billingPeriod?: string;
  interval?: string;
  maxCustomers: number;
  maxStaff: number;
  maxTransactions: number;
  defaultModules?: string[];
  modules?: string[];
  features?: string[];
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
}
