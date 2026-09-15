import { Router, Response } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest, authenticate, requireTenant, requireModule, requirePermission, recordActivity } from '../middleware.js';
import { Invoice, InvoiceItem } from '../types.js';

const router = Router();

router.use(authenticate);
router.use(requireTenant);
router.use(requireModule('invoices'));

// List invoices
router.get('/', requirePermission('invoices', 'view'), (req: AuthenticatedRequest, res: Response) => {
  const { status, search, startDate, endDate } = req.query;
  let invoices = db.getInvoices(req.tenantId!);

  if (status && status !== 'ALL') {
    invoices = invoices.filter(inv => inv.status === status);
  }

  if (search) {
    const q = (search as string).toLowerCase();
    invoices = invoices.filter(inv =>
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.customerName.toLowerCase().includes(q) ||
      inv.customerMobile.includes(q)
    );
  }

  if (startDate) {
    invoices = invoices.filter(inv => inv.issueDate >= (startDate as string));
  }

  if (endDate) {
    invoices = invoices.filter(inv => inv.issueDate <= (endDate as string));
  }

  invoices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json(invoices);
});

// Single invoice
router.get('/:id', requirePermission('invoices', 'view'), (req: AuthenticatedRequest, res: Response) => {
  const invoice = db.getInvoices(req.tenantId!).find(inv => inv.id === req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

  const tenant = db.getTenants().find(t => t.id === req.tenantId);

  return res.json({ invoice, tenant });
});

// Create Invoice
router.post('/', requirePermission('invoices', 'add'), (req: AuthenticatedRequest, res: Response) => {
  const {
    customerId,
    items,
    issueDate,
    dueDate,
    paidAmount = 0,
    notes,
    terms,
    updateCustomerBalance = true,
  } = req.body;

  if (!customerId) {
    return res.status(400).json({ error: 'Customer is required.' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one invoice item is required.' });
  }

  const customer = db.raw.customers.find(c => c.tenantId === req.tenantId && c.id === customerId);
  if (!customer) {
    return res.status(404).json({ error: 'Selected customer not found.' });
  }

  // Calculate totals
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;

  const processedItems: InvoiceItem[] = items.map((item: any) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.price) || 0;
    const discount = Number(item.discount) || 0;
    const tax = Number(item.tax) || 0;

    const lineBase = qty * price;
    const lineDiscount = discount;
    const taxable = Math.max(0, lineBase - lineDiscount);
    const lineTax = (taxable * tax) / 100;
    const lineTotal = taxable + lineTax;

    subtotal += lineBase;
    totalDiscount += lineDiscount;
    totalTax += lineTax;

    return {
      productId: item.productId,
      description: item.description || 'Custom Item',
      quantity: qty,
      price,
      discount,
      tax,
      total: lineTotal,
    };
  });

  const grandTotal = Math.max(0, subtotal - totalDiscount + totalTax);
  const numPaid = Math.min(grandTotal, Number(paidAmount) || 0);

  let status: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' | 'OVERDUE' = 'UNPAID';
  if (numPaid >= grandTotal && grandTotal > 0) {
    status = 'PAID';
  } else if (numPaid > 0) {
    status = 'PARTIALLY_PAID';
  }

  const now = new Date().toISOString();
  const count = db.getInvoices(req.tenantId!).length + 1;
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

  const newInvoice: Invoice = {
    id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    tenantId: req.tenantId!,
    invoiceNumber,
    customerId: customer.id,
    customerName: customer.name,
    customerMobile: customer.mobile,
    items: processedItems,
    subtotal,
    totalDiscount,
    totalTax,
    grandTotal,
    paidAmount: numPaid,
    status,
    issueDate: issueDate || now.slice(0, 10),
    dueDate: dueDate || new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    notes: notes || 'Thank you for your business!',
    terms: terms || 'Payment due within 15 days of invoice date.',
    createdAt: now,
    updatedAt: now,
  };

  db.raw.invoices.push(newInvoice);

  // If updateCustomerBalance is true, record credit and paid transaction
  const unpaidBalance = grandTotal - numPaid;
  if (updateCustomerBalance && unpaidBalance > 0) {
    // Record GIVE for the invoice total
    customer.currentBalance += grandTotal;
    customer.totalCredit += grandTotal;
    customer.lastTransactionDate = newInvoice.issueDate;

    db.raw.transactions.push({
      id: `txn_${Date.now()}_inv`,
      tenantId: req.tenantId!,
      customerId: customer.id,
      type: 'GIVE',
      amount: grandTotal,
      runningBalance: customer.currentBalance,
      paymentMethod: 'OTHER',
      description: `Invoice ${invoiceNumber}`,
      date: newInvoice.issueDate,
      createdBy: req.user?.name || 'Staff',
      createdAt: now,
    });

    if (numPaid > 0) {
      // Record payment received
      customer.currentBalance -= numPaid;
      customer.totalPayments += numPaid;

      db.raw.transactions.push({
        id: `txn_${Date.now()}_inv_pay`,
        tenantId: req.tenantId!,
        customerId: customer.id,
        type: 'GET',
        amount: numPaid,
        runningBalance: customer.currentBalance,
        paymentMethod: 'CASH',
        description: `Payment for ${invoiceNumber}`,
        date: newInvoice.issueDate,
        createdBy: req.user?.name || 'Staff',
        createdAt: now,
      });
    }
  }

  // Deduct inventory stock if products are attached
  processedItems.forEach(item => {
    if (item.productId) {
      const prod = db.raw.products.find(p => p.tenantId === req.tenantId && p.id === item.productId);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - item.quantity);
        prod.updatedAt = now;
      }
    }
  });

  db.save();

  recordActivity(req, 'CREATED_INVOICE', 'Invoices', { invoiceNumber, amount: grandTotal, customer: customer.name });

  return res.status(201).json(newInvoice);
});

// Update Invoice Payment Status
router.post('/:id/pay', requirePermission('invoices', 'edit'), (req: AuthenticatedRequest, res: Response) => {
  const invoice = db.raw.invoices.find(inv => inv.tenantId === req.tenantId && inv.id === req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

  const { paymentAmount, paymentMethod = 'UPI' } = req.body;
  const numPay = Number(paymentAmount);
  if (!numPay || numPay <= 0) {
    return res.status(400).json({ error: 'Please enter a valid payment amount.' });
  }

  invoice.paidAmount += numPay;
  if (invoice.paidAmount >= invoice.grandTotal) {
    invoice.status = 'PAID';
  } else {
    invoice.status = 'PARTIALLY_PAID';
  }
  invoice.updatedAt = new Date().toISOString();

  // Update customer ledger
  const customer = db.raw.customers.find(c => c.tenantId === req.tenantId && c.id === invoice.customerId);
  if (customer) {
    customer.currentBalance -= numPay;
    customer.totalPayments += numPay;
    customer.lastTransactionDate = new Date().toISOString().slice(0, 10);

    db.raw.transactions.push({
      id: `txn_${Date.now()}_inv_collect`,
      tenantId: req.tenantId!,
      customerId: customer.id,
      type: 'GET',
      amount: numPay,
      runningBalance: customer.currentBalance,
      paymentMethod,
      description: `Payment received for ${invoice.invoiceNumber}`,
      date: new Date().toISOString().slice(0, 10),
      createdBy: req.user?.name || 'Staff',
      createdAt: new Date().toISOString(),
    });
  }

  db.save();
  recordActivity(req, 'INVOICE_PAYMENT_COLLECTED', 'Invoices', { invoice: invoice.invoiceNumber, amount: numPay });

  return res.json(invoice);
});

export default router;
