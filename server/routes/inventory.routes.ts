import { Router, Response } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest, authenticate, requireTenant, requireModule, requirePermission, recordActivity } from '../middleware.js';
import { Product, StockAdjustment } from '../types.js';

const router = Router();

router.use(authenticate);
router.use(requireTenant);
router.use(requireModule('products'));

// List products
router.get('/', requirePermission('products', 'view'), (req: AuthenticatedRequest, res: Response) => {
  const { search, category, lowStockOnly } = req.query;
  let products = db.getProducts(req.tenantId!);

  if (search) {
    const q = (search as string).toLowerCase();
    products = products.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
  }

  if (category && category !== 'ALL') {
    products = products.filter(p => p.category === category);
  }

  if (lowStockOnly === 'true') {
    products = products.filter(p => p.stock <= p.lowStockLimit);
  }

  return res.json(products);
});

// Single product
router.get('/:id', requirePermission('products', 'view'), (req: AuthenticatedRequest, res: Response) => {
  const product = db.getProducts(req.tenantId!).find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found.' });

  const adjustments = db.getStockAdjustments(req.tenantId!)
    .filter(sa => sa.productId === product.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json({ product, adjustments });
});

// Create product
router.post('/', requirePermission('products', 'add'), (req: AuthenticatedRequest, res: Response) => {
  const { name, sku, category, purchasePrice, sellingPrice, stock = 0, lowStockLimit = 10, unit = 'Pcs' } = req.body;

  if (!name || !sku) {
    return res.status(400).json({ error: 'Product Name and SKU are required.' });
  }

  const now = new Date().toISOString();
  const initStock = Number(stock) || 0;

  const newProduct: Product = {
    id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    tenantId: req.tenantId!,
    name,
    sku,
    category: category || 'General',
    purchasePrice: Number(purchasePrice) || 0,
    sellingPrice: Number(sellingPrice) || 0,
    stock: initStock,
    lowStockLimit: Number(lowStockLimit) || 10,
    unit: unit || 'Pcs',
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  };

  db.raw.products.push(newProduct);

  if (initStock > 0) {
    db.raw.stockAdjustments.push({
      id: `adj_${Date.now()}`,
      tenantId: req.tenantId!,
      productId: newProduct.id,
      productName: newProduct.name,
      type: 'ADD',
      quantity: initStock,
      reason: 'Initial Opening Stock',
      previousStock: 0,
      newStock: initStock,
      createdBy: req.user?.name || 'Staff',
      createdAt: now,
    });
  }

  db.save();

  recordActivity(req, 'CREATED_PRODUCT', 'Products', { productId: newProduct.id, name: newProduct.name });

  return res.status(201).json(newProduct);
});

// Update product
router.put('/:id', requirePermission('products', 'edit'), (req: AuthenticatedRequest, res: Response) => {
  const product = db.raw.products.find(p => p.tenantId === req.tenantId && p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found.' });

  const { name, sku, category, purchasePrice, sellingPrice, lowStockLimit, unit, status } = req.body;
  if (name) product.name = name;
  if (sku) product.sku = sku;
  if (category) product.category = category;
  if (purchasePrice !== undefined) product.purchasePrice = Number(purchasePrice);
  if (sellingPrice !== undefined) product.sellingPrice = Number(sellingPrice);
  if (lowStockLimit !== undefined) product.lowStockLimit = Number(lowStockLimit);
  if (unit) product.unit = unit;
  if (status) product.status = status;
  product.updatedAt = new Date().toISOString();

  db.save();
  recordActivity(req, 'UPDATED_PRODUCT', 'Products', { productId: product.id });

  return res.json(product);
});

// Adjust Stock (Add / Reduce)
router.post('/:id/adjust', requirePermission('inventory', 'edit'), (req: AuthenticatedRequest, res: Response) => {
  const product = db.raw.products.find(p => p.tenantId === req.tenantId && p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found.' });

  const { type, quantity, reason } = req.body;
  const numQty = Number(quantity);
  if (!numQty || numQty <= 0) {
    return res.status(400).json({ error: 'Please enter a valid quantity.' });
  }

  const previousStock = product.stock;
  let newStock = previousStock;

  if (type === 'ADD') {
    newStock = previousStock + numQty;
  } else if (type === 'REDUCE') {
    if (previousStock < numQty) {
      return res.status(400).json({ error: `Cannot reduce ${numQty}. Current stock is only ${previousStock}.` });
    }
    newStock = previousStock - numQty;
  } else {
    return res.status(400).json({ error: 'Adjustment type must be ADD or REDUCE.' });
  }

  product.stock = newStock;
  product.updatedAt = new Date().toISOString();

  const now = new Date().toISOString();
  const adj: StockAdjustment = {
    id: `adj_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    tenantId: req.tenantId!,
    productId: product.id,
    productName: product.name,
    type,
    quantity: numQty,
    reason: reason || (type === 'ADD' ? 'Stock Refill' : 'Stock Consumption / Damage'),
    previousStock,
    newStock,
    createdBy: req.user?.name || 'Staff',
    createdAt: now,
  };

  db.raw.stockAdjustments.push(adj);

  // Check low stock trigger
  if (newStock <= product.lowStockLimit) {
    db.raw.notifications.push({
      id: `notif_${Date.now()}`,
      tenantId: req.tenantId!,
      title: 'Low Stock Alert',
      message: `${product.name} is down to ${newStock} ${product.unit} (Threshold: ${product.lowStockLimit}).`,
      type: 'LOW_STOCK',
      read: false,
      link: '/inventory',
      createdAt: now,
    });
  }

  db.save();

  recordActivity(req, 'ADJUSTED_STOCK', 'Inventory', { product: product.name, type, quantity: numQty, newStock });

  return res.json({ product, adjustment: adj });
});

export default router;
