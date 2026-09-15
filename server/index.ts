import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import clientDashboardRoutes from './routes/client-dashboard.routes.js';
import customerRoutes from './routes/customer.routes.js';
import transactionRoutes from './routes/transaction.routes.js';
import supplierRoutes from './routes/supplier.routes.js';
import accountingRoutes from './routes/accounting.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import reportRoutes from './routes/reports.routes.js';
import staffRoutes from './routes/staff.routes.js';
import tenantSettingsRoutes from './routes/tenant-settings.routes.js';
import notificationRoutes from './routes/notifications.routes.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'EntriFa Multi-Tenant SaaS Platform',
    version: '1.0.0',
    time: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', clientDashboardRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/products', inventoryRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/settings', tenantSettingsRoutes);
app.use('/api/notifications', notificationRoutes);

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, '../dist');

// Serve static frontend in production
app.use(express.static(DIST_DIR));

// SPA wildcard fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled API Error:', err);
  res.status(500).json({ error: 'Internal server error occurred.', message: err.message });
});

app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` EntriFa SaaS Server running on port ${PORT}`);
  console.log(` Tagline: Simple Business. Smart Accounts.`);
  console.log(` Mode: Multi-Tenant Cloud Architecture`);
  console.log(` URL: http://localhost:${PORT}`);
  console.log(`=========================================`);
});
