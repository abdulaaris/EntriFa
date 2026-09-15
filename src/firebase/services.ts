import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, getSecondaryAuth } from './config';
import {
  User,
  Tenant,
  Customer,
  Supplier,
  Transaction,
  Expense,
  Income,
  Product,
  Invoice,
  NotificationItem,
  ActivityLogItem,
  PlanItem,
  StaffPermissions,
} from '../types';

// Helper to generate clean slugs (e.g. "iFa Traders" -> "ifa-traders")
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// ----------------------------------------------------
// 1. TENANT SERVICE
// ----------------------------------------------------
export const tenantService = {
  // Get tenant by ID
  async getTenant(tenantId: string): Promise<Tenant | null> {
    const snap = await getDoc(doc(db, 'tenants', tenantId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Tenant;
  },

  // Get tenant by unique slug
  async getTenantBySlug(slug: string): Promise<Tenant | null> {
    const q = query(collection(db, 'tenants'), where('slug', '==', slug), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const docSnap = snap.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as Tenant;
  },

  // Get all tenants (Super Admin only)
  async getAllTenants(): Promise<Tenant[]> {
    const snap = await getDocs(collection(db, 'tenants'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Tenant));
  },

  // Super Admin: Create Client Tenant & Client Admin User
  async createTenant(data: {
    businessName: string;
    ownerName: string;
    mobile: string;
    email: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    gstNumber?: string;
    logo?: string;
    adminPassword: string;
    planId: string;
    subscriptionStartDate?: string;
    subscriptionEndDate?: string;
    enabledModules: string[];
    currency?: string;
  }): Promise<{ tenantId: string; slug: string; loginUrl: string; adminUid: string }> {
    const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    let slug = slugify(data.businessName);

    // Ensure slug uniqueness
    const existingSlug = await tenantService.getTenantBySlug(slug);
    if (existingSlug) {
      slug = `${slug}-${Math.random().toString(36).substr(2, 4)}`;
    }

    // 1. Create client admin in Firebase Auth using secondary app instance
    const secondaryAuth = getSecondaryAuth();
    const userCredential = await createUserWithEmailAndPassword(
      secondaryAuth,
      data.email.trim(),
      data.adminPassword
    );
    const adminUid = userCredential.user.uid;
    // Sign out from secondary app so it stays clean
    await signOut(secondaryAuth);

    const now = new Date().toISOString();

    // 2. Create User Profile document in /users/{adminUid}
    const userProfile: User = {
      id: adminUid,
      name: data.ownerName,
      email: data.email.trim(),
      username: data.email.trim(),
      mobile: data.mobile,
      role: 'CLIENT_ADMIN',
      tenantId: tenantId,
      createdAt: now,
    };
    await setDoc(doc(db, 'users', adminUid), userProfile);

    // 3. Create Tenant Document in /tenants/{tenantId}
    const tenantDoc: any = {
      id: tenantId,
      name: data.businessName,
      slug: slug,
      ownerName: data.ownerName,
      mobile: data.mobile,
      email: data.email.trim(),
      address: data.address || '',
      city: data.city || '',
      state: data.state || '',
      country: data.country || 'India',
      gstNumber: data.gstNumber || '',
      logo: data.logo || '',
      planId: data.planId,
      status: 'ACTIVE',
      enabledModules: data.enabledModules,
      subscriptionStartDate: data.subscriptionStartDate || now.slice(0, 10),
      subscriptionEndDate: data.subscriptionEndDate || new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      currency: data.currency || '₹',
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(doc(db, 'tenants', tenantId), tenantDoc);

    // 4. Create initial settings in /tenants/{tenantId}/settings/profile
    await setDoc(doc(db, 'tenants', tenantId, 'settings', 'profile'), {
      name: data.businessName,
      ownerName: data.ownerName,
      mobile: data.mobile,
      email: data.email.trim(),
      address: data.address || '',
      gstNumber: data.gstNumber || '',
      currency: data.currency || '₹',
      updatedAt: now,
    });

    const loginUrl = `${window.location.origin}/login/${tenantId}`;

    return { tenantId, slug, loginUrl, adminUid };
  },

  // Update tenant details
  async updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<void> {
    await updateDoc(doc(db, 'tenants', tenantId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },

  // Update tenant status
  async updateTenantStatus(tenantId: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'): Promise<void> {
    await updateDoc(doc(db, 'tenants', tenantId), {
      status,
      updatedAt: new Date().toISOString(),
    });
  },

  // Update enabled modules (Module Matrix)
  async updateTenantModules(tenantId: string, enabledModules: string[]): Promise<void> {
    await updateDoc(doc(db, 'tenants', tenantId), {
      enabledModules,
      updatedAt: new Date().toISOString(),
    });
  },

  // Delete tenant
  async deleteTenant(tenantId: string): Promise<void> {
    await deleteDoc(doc(db, 'tenants', tenantId));
  },
};

// ----------------------------------------------------
// 2. CUSTOMER & DIGITAL LEDGER SERVICE
// ----------------------------------------------------
export const customerService = {
  // Real-time listener for tenant customers
  subscribeCustomers(tenantId: string, onUpdate: (customers: Customer[]) => void) {
    const colRef = collection(db, 'tenants', tenantId, 'customers');
    return onSnapshot(colRef, (snap) => {
      const list: Customer[] = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      } as Customer));
      onUpdate(list);
    });
  },

  // One-time fetch
  async getCustomers(tenantId: string): Promise<Customer[]> {
    const snap = await getDocs(collection(db, 'tenants', tenantId, 'customers'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer));
  },

  async getCustomer(tenantId: string, customerId: string): Promise<Customer | null> {
    const snap = await getDoc(doc(db, 'tenants', tenantId, 'customers', customerId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Customer;
  },

  async createCustomer(
    tenantId: string,
    data: {
      name: string;
      mobile: string;
      email?: string;
      address?: string;
      openingBalance?: number;
      notes?: string;
    },
    createdBy: string = 'Admin'
  ): Promise<string> {
    const now = new Date().toISOString();
    const initBal = Number(data.openingBalance) || 0;
    const custRef = doc(collection(db, 'tenants', tenantId, 'customers'));

    const newCust: any = {
      id: custRef.id,
      tenantId,
      name: data.name.trim(),
      mobile: data.mobile.trim(),
      email: data.email?.trim() || '',
      address: data.address?.trim() || '',
      openingBalance: initBal,
      currentBalance: initBal,
      totalCredit: initBal > 0 ? initBal : 0,
      totalPayments: initBal < 0 ? Math.abs(initBal) : 0,
      status: 'ACTIVE',
      notes: data.notes?.trim() || '',
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(custRef, newCust);

    // If opening balance != 0, also create opening transaction
    if (initBal !== 0) {
      const txnRef = doc(collection(db, 'tenants', tenantId, 'transactions'));
      await setDoc(txnRef, {
        id: txnRef.id,
        tenantId,
        customerId: custRef.id,
        type: initBal > 0 ? 'GIVE' : 'GET',
        amount: Math.abs(initBal),
        runningBalance: initBal,
        paymentMethod: 'OTHER',
        description: 'Opening Balance',
        date: now.slice(0, 10),
        createdBy,
        createdAt: now,
      });
    }

    return custRef.id;
  },

  async updateCustomer(tenantId: string, customerId: string, updates: Partial<Customer>): Promise<void> {
    await updateDoc(doc(db, 'tenants', tenantId, 'customers', customerId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },

  async deleteCustomer(tenantId: string, customerId: string): Promise<void> {
    await deleteDoc(doc(db, 'tenants', tenantId, 'customers', customerId));
  },
};

// ----------------------------------------------------
// 3. TRANSACTIONS & RUNNING BALANCE ATOMIC ENGINE
// ----------------------------------------------------
export const transactionService = {
  // Real-time listener for tenant transactions
  subscribeTransactions(tenantId: string, onUpdate: (txns: Transaction[]) => void) {
    const colRef = collection(db, 'tenants', tenantId, 'transactions');
    return onSnapshot(colRef, (snap) => {
      const list: Transaction[] = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      } as Transaction));
      // Sort newest first
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    });
  },

  async getTransactions(tenantId: string): Promise<Transaction[]> {
    const snap = await getDocs(collection(db, 'tenants', tenantId, 'transactions'));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  },

  // Atomic GIVE / GET Transaction Executor
  async recordTransaction(
    tenantId: string,
    data: {
      customerId?: string;
      supplierId?: string;
      type: 'GIVE' | 'GET';
      amount: number;
      date?: string;
      paymentMethod: string;
      description?: string;
      notes?: string;
    },
    createdBy: string = 'Staff'
  ): Promise<{ txnId: string; newBalance: number }> {
    const numAmount = Number(data.amount);
    if (!numAmount || numAmount <= 0) {
      throw new Error('Please enter a valid amount greater than 0.');
    }

    const now = new Date().toISOString();
    const txnDate = data.date || now.slice(0, 10);
    const txnRef = doc(collection(db, 'tenants', tenantId, 'transactions'));

    let newBalance = 0;
    let partyName = '';

    // Run safe atomic transaction to ensure financial balance accuracy
    await runTransaction(db, async (t) => {
      if (data.customerId) {
        const custRef = doc(db, 'tenants', tenantId, 'customers', data.customerId);
        const custSnap = await t.get(custRef);
        if (!custSnap.exists()) {
          throw new Error('Customer record not found.');
        }

        const custData = custSnap.data() as Customer;
        partyName = custData.name;
        const currentBal = custData.currentBalance || 0;

        if (data.type === 'GIVE') {
          // Credit given: Customer owes more
          newBalance = currentBal + numAmount;
          t.update(custRef, {
            currentBalance: newBalance,
            totalCredit: (custData.totalCredit || 0) + numAmount,
            lastTransactionDate: txnDate,
            updatedAt: now,
          });
        } else {
          // GET Payment received: Customer owes less / advance
          newBalance = currentBal - numAmount;
          t.update(custRef, {
            currentBalance: newBalance,
            totalPayments: (custData.totalPayments || 0) + numAmount,
            lastTransactionDate: txnDate,
            updatedAt: now,
          });
        }
      } else if (data.supplierId) {
        const suppRef = doc(db, 'tenants', tenantId, 'suppliers', data.supplierId);
        const suppSnap = await t.get(suppRef);
        if (!suppSnap.exists()) {
          throw new Error('Supplier record not found.');
        }

        const suppData = suppSnap.data() as Supplier;
        partyName = suppData.name;
        const currentBal = suppData.currentBalance || 0;

        if (data.type === 'GIVE') {
          // GIVE to supplier = Payment given to supplier -> reduces our payable
          newBalance = currentBal - numAmount;
          t.update(suppRef, {
            currentBalance: newBalance,
            totalPayments: (suppData.totalPayments || 0) + numAmount,
            lastTransactionDate: txnDate,
            updatedAt: now,
          });
        } else {
          // GET from supplier = Goods received on credit -> increases payable
          newBalance = currentBal + numAmount;
          t.update(suppRef, {
            currentBalance: newBalance,
            totalCredit: (suppData.totalCredit || 0) + numAmount,
            lastTransactionDate: txnDate,
            updatedAt: now,
          });
        }
      }

      // Write transaction document
      t.set(txnRef, {
        id: txnRef.id,
        tenantId,
        customerId: data.customerId || null,
        supplierId: data.supplierId || null,
        type: data.type,
        amount: numAmount,
        runningBalance: newBalance,
        paymentMethod: data.paymentMethod || 'CASH',
        description: data.description?.trim() || (data.type === 'GET' ? 'Payment Received' : 'Credit Given'),
        date: txnDate,
        notes: data.notes?.trim() || '',
        createdBy,
        createdAt: now,
      });
    });

    return { txnId: txnRef.id, newBalance };
  },
};

// ----------------------------------------------------
// 4. SUPPLIERS SERVICE
// ----------------------------------------------------
export const supplierService = {
  subscribeSuppliers(tenantId: string, onUpdate: (suppliers: Supplier[]) => void) {
    return onSnapshot(collection(db, 'tenants', tenantId, 'suppliers'), (snap) => {
      onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data() } as Supplier)));
    });
  },

  async getSuppliers(tenantId: string): Promise<Supplier[]> {
    const snap = await getDocs(collection(db, 'tenants', tenantId, 'suppliers'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Supplier));
  },

  async createSupplier(tenantId: string, data: {
    name: string;
    mobile: string;
    email?: string;
    address?: string;
    openingBalance?: number;
    notes?: string;
  }): Promise<string> {
    const now = new Date().toISOString();
    const initBal = Number(data.openingBalance) || 0;
    const docRef = doc(collection(db, 'tenants', tenantId, 'suppliers'));

    await setDoc(docRef, {
      id: docRef.id,
      tenantId,
      name: data.name.trim(),
      mobile: data.mobile.trim(),
      email: data.email?.trim() || '',
      address: data.address?.trim() || '',
      openingBalance: initBal,
      currentBalance: initBal,
      totalCredit: initBal,
      totalPayments: 0,
      status: 'ACTIVE',
      notes: data.notes?.trim() || '',
      createdAt: now,
      updatedAt: now,
    });

    return docRef.id;
  },

  async deleteSupplier(tenantId: string, supplierId: string): Promise<void> {
    await deleteDoc(doc(db, 'tenants', tenantId, 'suppliers', supplierId));
  },
};

// ----------------------------------------------------
// 5. EXPENSES & INCOME SERVICE
// ----------------------------------------------------
export const accountingService = {
  // Expenses
  subscribeExpenses(tenantId: string, onUpdate: (expenses: Expense[]) => void) {
    return onSnapshot(collection(db, 'tenants', tenantId, 'expenses'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense));
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onUpdate(list);
    });
  },

  async createExpense(tenantId: string, data: {
    category: string;
    amount: number;
    date: string;
    paymentMethod: string;
    description?: string;
    notes?: string;
  }, createdBy: string = 'Staff'): Promise<string> {
    const docRef = doc(collection(db, 'tenants', tenantId, 'expenses'));
    const now = new Date().toISOString();
    await setDoc(docRef, {
      id: docRef.id,
      tenantId,
      category: data.category,
      amount: Number(data.amount),
      date: data.date || now.slice(0, 10),
      paymentMethod: data.paymentMethod || 'CASH',
      description: data.description?.trim() || '',
      notes: data.notes?.trim() || '',
      createdBy,
      createdAt: now,
    });
    return docRef.id;
  },

  async deleteExpense(tenantId: string, expenseId: string): Promise<void> {
    await deleteDoc(doc(db, 'tenants', tenantId, 'expenses', expenseId));
  },

  // Income
  subscribeIncome(tenantId: string, onUpdate: (incomeList: Income[]) => void) {
    return onSnapshot(collection(db, 'tenants', tenantId, 'income'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Income));
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onUpdate(list);
    });
  },

  async createIncome(tenantId: string, data: {
    category: string;
    amount: number;
    date: string;
    paymentMethod: string;
    description?: string;
  }, createdBy: string = 'Staff'): Promise<string> {
    const docRef = doc(collection(db, 'tenants', tenantId, 'income'));
    const now = new Date().toISOString();
    await setDoc(docRef, {
      id: docRef.id,
      tenantId,
      category: data.category,
      amount: Number(data.amount),
      date: data.date || now.slice(0, 10),
      paymentMethod: data.paymentMethod || 'CASH',
      description: data.description?.trim() || '',
      createdBy,
      createdAt: now,
    });
    return docRef.id;
  },

  async deleteIncome(tenantId: string, incomeId: string): Promise<void> {
    await deleteDoc(doc(db, 'tenants', tenantId, 'income', incomeId));
  },
};

// ----------------------------------------------------
// 6. INVENTORY & PRODUCTS SERVICE
// ----------------------------------------------------
export const inventoryService = {
  subscribeProducts(tenantId: string, onUpdate: (products: Product[]) => void) {
    return onSnapshot(collection(db, 'tenants', tenantId, 'products'), (snap) => {
      onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    });
  },

  async createProduct(tenantId: string, data: {
    name: string;
    sku: string;
    category?: string;
    purchasePrice: number;
    sellingPrice: number;
    stock: number;
    lowStockLimit: number;
    unit: string;
  }): Promise<string> {
    const docRef = doc(collection(db, 'tenants', tenantId, 'products'));
    const now = new Date().toISOString();
    await setDoc(docRef, {
      id: docRef.id,
      tenantId,
      name: data.name.trim(),
      sku: data.sku.trim(),
      category: data.category || 'General',
      purchasePrice: Number(data.purchasePrice) || 0,
      sellingPrice: Number(data.sellingPrice) || 0,
      stock: Number(data.stock) || 0,
      lowStockLimit: Number(data.lowStockLimit) || 10,
      unit: data.unit || 'Pcs',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  },

  async adjustStock(
    tenantId: string,
    productId: string,
    type: 'ADD' | 'REDUCE',
    quantity: number,
    reason: string = '',
    createdBy: string = 'Staff'
  ): Promise<number> {
    const prodRef = doc(db, 'tenants', tenantId, 'products', productId);
    let newStock = 0;

    await runTransaction(db, async (t) => {
      const snap = await t.get(prodRef);
      if (!snap.exists()) throw new Error('Product not found.');
      const prod = snap.data() as Product;
      const prev = prod.stock || 0;

      if (type === 'ADD') {
        newStock = prev + quantity;
      } else {
        if (prev < quantity) throw new Error(`Cannot reduce ${quantity}. Current stock is only ${prev}.`);
        newStock = prev - quantity;
      }

      t.update(prodRef, { stock: newStock, updatedAt: new Date().toISOString() });

      // Save adjustment log
      const adjRef = doc(collection(db, 'tenants', tenantId, 'inventory'));
      t.set(adjRef, {
        id: adjRef.id,
        tenantId,
        productId,
        productName: prod.name,
        type,
        quantity,
        reason,
        previousStock: prev,
        newStock,
        createdBy,
        createdAt: new Date().toISOString(),
      });
    });

    return newStock;
  },

  async deleteProduct(tenantId: string, productId: string): Promise<void> {
    await deleteDoc(doc(db, 'tenants', tenantId, 'products', productId));
  },
};

// ----------------------------------------------------
// 7. INVOICE SERVICE
// ----------------------------------------------------
export const invoiceService = {
  subscribeInvoices(tenantId: string, onUpdate: (invoices: Invoice[]) => void) {
    return onSnapshot(collection(db, 'tenants', tenantId, 'invoices'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    });
  },

  async createInvoice(tenantId: string, data: {
    customerId: string;
    customerName: string;
    customerMobile: string;
    items: any[];
    subtotal: number;
    totalDiscount: number;
    totalTax: number;
    grandTotal: number;
    paidAmount: number;
    issueDate: string;
    dueDate: string;
    notes?: string;
    terms?: string;
    updateCustomerBalance?: boolean;
  }, createdBy: string = 'Staff'): Promise<Invoice> {
    const docRef = doc(collection(db, 'tenants', tenantId, 'invoices'));
    const now = new Date().toISOString();
    const countSnap = await getDocs(collection(db, 'tenants', tenantId, 'invoices'));
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(countSnap.size + 1).padStart(4, '0')}`;

    const numGrand = Number(data.grandTotal);
    const numPaid = Number(data.paidAmount) || 0;
    let status: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' = 'UNPAID';
    if (numPaid >= numGrand && numGrand > 0) status = 'PAID';
    else if (numPaid > 0) status = 'PARTIALLY_PAID';

    const invoice: Invoice = {
      id: docRef.id,
      tenantId,
      invoiceNumber,
      customerId: data.customerId,
      customerName: data.customerName,
      customerMobile: data.customerMobile,
      items: data.items,
      subtotal: data.subtotal,
      totalDiscount: data.totalDiscount,
      totalTax: data.totalTax,
      grandTotal: numGrand,
      paidAmount: numPaid,
      status,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      notes: data.notes || '',
      terms: data.terms || '',
      createdAt: now,
    };

    await setDoc(docRef, invoice);

    // If updateCustomerBalance is true, update customer ledger
    if (data.updateCustomerBalance) {
      // Record GIVE for the invoice total
      await transactionService.recordTransaction(tenantId, {
        customerId: data.customerId,
        type: 'GIVE',
        amount: numGrand,
        date: data.issueDate,
        paymentMethod: 'OTHER',
        description: `Invoice ${invoiceNumber}`,
      }, createdBy);

      // If partial or full payment received
      if (numPaid > 0) {
        await transactionService.recordTransaction(tenantId, {
          customerId: data.customerId,
          type: 'GET',
          amount: numPaid,
          date: data.issueDate,
          paymentMethod: 'CASH',
          description: `Payment for ${invoiceNumber}`,
        }, createdBy);
      }
    }

    return invoice;
  },

  async collectInvoicePayment(tenantId: string, invoiceId: string, amount: number, method: string = 'UPI', createdBy: string = 'Staff'): Promise<void> {
    const invRef = doc(db, 'tenants', tenantId, 'invoices', invoiceId);
    const snap = await getDoc(invRef);
    if (!snap.exists()) throw new Error('Invoice not found.');
    const inv = snap.data() as Invoice;

    const newPaid = (inv.paidAmount || 0) + amount;
    const newStatus = newPaid >= inv.grandTotal ? 'PAID' : 'PARTIALLY_PAID';

    await updateDoc(invRef, {
      paidAmount: newPaid,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });

    // Record GET in customer ledger
    await transactionService.recordTransaction(tenantId, {
      customerId: inv.customerId,
      type: 'GET',
      amount,
      paymentMethod: method,
      description: `Payment collected for ${inv.invoiceNumber}`,
    }, createdBy);
  },
};

// ----------------------------------------------------
// 8. STAFF MANAGEMENT SERVICE
// ----------------------------------------------------
export const staffService = {
  async getStaff(tenantId: string): Promise<User[]> {
    const q = query(
      collection(db, 'users'),
      where('tenantId', '==', tenantId),
      where('role', '==', 'STAFF')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
  },

  async createStaff(
    tenantId: string,
    data: {
      name: string;
      email: string;
      mobile: string;
      password: string;
      permissions: StaffPermissions;
    }
  ): Promise<string> {
    const secondaryAuth = getSecondaryAuth();
    const userCred = await createUserWithEmailAndPassword(secondaryAuth, data.email.trim(), data.password);
    const uid = userCred.user.uid;
    await signOut(secondaryAuth);

    const now = new Date().toISOString();
    const profile: User = {
      id: uid,
      name: data.name.trim(),
      email: data.email.trim(),
      username: data.email.trim(),
      mobile: data.mobile.trim(),
      role: 'STAFF',
      tenantId,
      permissions: data.permissions,
      createdAt: now,
    };

    await setDoc(doc(db, 'users', uid), profile);
    return uid;
  },

  async updateStaffPermissions(uid: string, permissions: StaffPermissions): Promise<void> {
    await updateDoc(doc(db, 'users', uid), {
      permissions,
      updatedAt: new Date().toISOString(),
    });
  },

  async deleteStaff(uid: string): Promise<void> {
    await deleteDoc(doc(db, 'users', uid));
  },
};

// ----------------------------------------------------
// 9. SUPER ADMIN & SYSTEM ROOT INITIALIZATION
// ----------------------------------------------------
export const systemService = {
  // Check if any Super Admin exists in Firestore
  async checkSuperAdminExists(): Promise<boolean> {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'SUPER_ADMIN'), limit(1));
      const snap = await getDocs(q);
      return !snap.empty;
    } catch (e) {
      return false;
    }
  },

  // First-time setup: Create Root Super Admin
  async createFirstSuperAdmin(data: {
    email: string;
    password: string;
    name: string;
    mobile?: string;
  }): Promise<string> {
    // Verify no super admin already exists
    const exists = await systemService.checkSuperAdminExists();
    if (exists) {
      throw new Error('Super Admin account already exists. For security, setup is locked.');
    }

    const userCred = await createUserWithEmailAndPassword(getSecondaryAuth(), data.email.trim(), data.password);
    const uid = userCred.user.uid;
    await signOut(getSecondaryAuth());

    const now = new Date().toISOString();
    await setDoc(doc(db, 'users', uid), {
      id: uid,
      name: data.name,
      email: data.email.trim(),
      username: data.email.trim(),
      mobile: data.mobile || '',
      role: 'SUPER_ADMIN',
      tenantId: null,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    });

    return uid;
  },

  // Get SaaS Subscription Plans
  async getPlans(): Promise<PlanItem[]> {
    try {
      const snap = await getDocs(collection(db, 'plans'));
      if (!snap.empty) {
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as PlanItem));
      }
    } catch (e) {
      console.error(e);
    }
    // Return standard plans
    return [
      {
        id: 'plan_free',
        code: 'FREE',
        name: 'Free Starter',
        price: 0,
        interval: 'MONTHLY',
        maxCustomers: 50,
        maxTransactions: 200,
        maxStaff: 1,
        features: ['Digital Ledger', 'Fast Give & Get', 'Basic Reports', 'Single Device'],
        modules: ['dashboard', 'customers', 'ledger', 'transactions'],
        status: 'ACTIVE',
      },
      {
        id: 'plan_basic',
        code: 'BASIC',
        name: 'Basic Business',
        price: 499,
        interval: 'MONTHLY',
        maxCustomers: 250,
        maxTransactions: 1000,
        maxStaff: 2,
        features: ['Everything in Free', 'Expenses Tracking', 'Direct Income', 'Suppliers Khata', 'PDF Statements'],
        modules: ['dashboard', 'customers', 'suppliers', 'ledger', 'transactions', 'expenses', 'income', 'reports'],
        status: 'ACTIVE',
      },
      {
        id: 'plan_pro',
        code: 'PRO',
        name: 'Pro Trader',
        price: 999,
        interval: 'MONTHLY',
        maxCustomers: 1000,
        maxTransactions: 5000,
        maxStaff: 5,
        features: ['Everything in Basic', 'Product Catalog', 'Stock & Inventory Management', 'GST Tax Invoices', 'Staff Roles & Permissions'],
        modules: ['dashboard', 'customers', 'suppliers', 'ledger', 'transactions', 'expenses', 'income', 'products', 'inventory', 'invoices', 'reports', 'staff', 'notifications'],
        status: 'ACTIVE',
      },
      {
        id: 'plan_premium',
        code: 'ENTERPRISE',
        name: 'Enterprise Premium',
        price: 1999,
        interval: 'MONTHLY',
        maxCustomers: 99999,
        maxTransactions: 99999,
        maxStaff: 25,
        features: ['Unlimited Everything', 'All Modules Included', 'Automated Daily Backups', 'Priority VIP Support', 'Custom Branding'],
        modules: ['dashboard', 'customers', 'suppliers', 'ledger', 'transactions', 'expenses', 'income', 'products', 'inventory', 'invoices', 'reports', 'staff', 'notifications'],
        status: 'ACTIVE',
      },
    ];
  },

  // Super Admin audit logs
  async getActivityLogs(): Promise<ActivityLogItem[]> {
    try {
      const q = query(collection(db, 'systemLogs'), orderBy('timestamp', 'desc'), limit(50));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLogItem));
    } catch (e) {
      return [];
    }
  },

  // Record an audit log
  async logActivity(data: {
    userName: string;
    role: string;
    action: string;
    module: string;
    tenantName?: string;
    ip?: string;
  }): Promise<void> {
    try {
      const logRef = doc(collection(db, 'systemLogs'));
      await setDoc(logRef, {
        id: logRef.id,
        ...data,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Failed to log system activity', e);
    }
  },

  // System Settings
  async getSystemSettings(): Promise<any> {
    try {
      const snap = await getDoc(doc(db, 'systemSettings', 'general'));
      if (snap.exists()) return snap.data();
    } catch (e) {}
    return {
      appName: 'EntriFa',
      tagline: 'Simple Business. Smart Accounts.',
      supportEmail: 'support@entrifa.com',
      supportPhone: '+91 98765 43210',
      currency: '₹',
      allowRegistration: false,
    };
  },

  async updateSystemSettings(data: any): Promise<void> {
    await setDoc(doc(db, 'systemSettings', 'general'), {
      ...data,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  },
};

// ----------------------------------------------------
// 10. NOTIFICATIONS SERVICE
// ----------------------------------------------------
export const notificationService = {
  subscribeNotifications(tenantId: string | null, onUpdate: (notifs: NotificationItem[]) => void) {
    if (!tenantId) {
      // Super admin notifications from global
      return onSnapshot(collection(db, 'systemNotifications'), (snap) => {
        onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data() } as NotificationItem)));
      });
    }

    return onSnapshot(collection(db, 'tenants', tenantId, 'notifications'), (snap) => {
      onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data() } as NotificationItem)));
    });
  },

  async markAsRead(tenantId: string | null, notifId: string): Promise<void> {
    if (!tenantId) {
      await updateDoc(doc(db, 'systemNotifications', notifId), { read: true });
    } else {
      await updateDoc(doc(db, 'tenants', tenantId, 'notifications', notifId), { read: true });
    }
  },
};
