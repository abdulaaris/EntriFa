import { Router, Response } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest, authenticate, requireTenant, requireModule, requirePermission, recordActivity } from '../middleware.js';
import { Supplier } from '../types.js';

const router = Router();

router.use(authenticate);
router.use(requireTenant);
router.use(requireModule('suppliers'));

// List suppliers
router.get('/', requirePermission('suppliers', 'view'), (req: AuthenticatedRequest, res: Response) => {
  const { search } = req.query;
  let suppliers = db.getSuppliers(req.tenantId!);

  if (search) {
    const q = (search as string).toLowerCase();
    suppliers = suppliers.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.mobile.toLowerCase().includes(q) ||
      (s.email && s.email.toLowerCase().includes(q))
    );
  }

  suppliers.sort((a, b) => (b.lastTransactionDate || b.createdAt).localeCompare(a.lastTransactionDate || a.createdAt));

  return res.json(suppliers);
});

// Single supplier with ledger
router.get('/:id', requirePermission('suppliers', 'view'), (req: AuthenticatedRequest, res: Response) => {
  const supplier = db.getSuppliers(req.tenantId!).find(s => s.id === req.params.id);
  if (!supplier) {
    return res.status(404).json({ error: 'Supplier not found.' });
  }

  const transactions = db.getTransactions(req.tenantId!)
    .filter(t => t.supplierId === supplier.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json({
    supplier,
    transactions,
  });
});

// Create Supplier
router.post('/', requirePermission('suppliers', 'add'), (req: AuthenticatedRequest, res: Response) => {
  const { name, mobile, email, address, openingBalance = 0, notes } = req.body;

  if (!name || !mobile) {
    return res.status(400).json({ error: 'Supplier Name and Mobile Number are required.' });
  }

  const now = new Date().toISOString();
  const initialBal = Number(openingBalance) || 0;

  const newSupplier: Supplier = {
    id: `supp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    tenantId: req.tenantId!,
    name,
    mobile,
    email: email || '',
    address: address || '',
    openingBalance: initialBal,
    currentBalance: initialBal,
    totalCredit: initialBal,
    totalPayments: 0,
    status: 'ACTIVE',
    notes: notes || '',
    createdAt: now,
    updatedAt: now,
  };

  db.raw.suppliers.push(newSupplier);
  db.save();

  recordActivity(req, 'CREATED_SUPPLIER', 'Suppliers', { supplierId: newSupplier.id, name: newSupplier.name });

  return res.status(201).json(newSupplier);
});

// Update Supplier
router.put('/:id', requirePermission('suppliers', 'edit'), (req: AuthenticatedRequest, res: Response) => {
  const supplier = db.raw.suppliers.find(s => s.tenantId === req.tenantId && s.id === req.params.id);
  if (!supplier) {
    return res.status(404).json({ error: 'Supplier not found.' });
  }

  const { name, mobile, email, address, notes, status } = req.body;
  if (name) supplier.name = name;
  if (mobile) supplier.mobile = mobile;
  if (email !== undefined) supplier.email = email;
  if (address !== undefined) supplier.address = address;
  if (notes !== undefined) supplier.notes = notes;
  if (status) supplier.status = status;
  supplier.updatedAt = new Date().toISOString();

  db.save();
  recordActivity(req, 'UPDATED_SUPPLIER', 'Suppliers', { supplierId: supplier.id });

  return res.json(supplier);
});

// Delete Supplier
router.delete('/:id', requirePermission('suppliers', 'delete'), (req: AuthenticatedRequest, res: Response) => {
  const index = db.raw.suppliers.findIndex(s => s.tenantId === req.tenantId && s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Supplier not found.' });
  }

  const supplier = db.raw.suppliers.splice(index, 1)[0];
  db.raw.transactions = db.raw.transactions.filter(t => !(t.tenantId === req.tenantId && t.supplierId === supplier.id));

  db.save();
  recordActivity(req, 'DELETED_SUPPLIER', 'Suppliers', { supplierId: supplier.id, name: supplier.name });

  return res.json({ message: 'Supplier deleted successfully.' });
});

export default router;
