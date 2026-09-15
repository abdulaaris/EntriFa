# EntriFa 🚀
> **Simple Business. Smart Accounts.**  
> *A Production-Ready Multi-Tenant Business Ledger & Cloud Accounting SaaS Platform*

---

## 🌟 Overview

**EntriFa** is a modern, production-ready multi-tenant SaaS application inspired by digital ledger platforms like KhataBook, built from the ground up with an original UI, enterprise architecture, and complete data isolation.

Built on **React 18, TypeScript, Tailwind CSS, and Firebase Modular SDK (v12)**, EntriFa allows the **Super Admin** (platform owner) to provision, monitor, configure, and monetize unlimited client business workspaces from a central command center.

---

## 🏗️ Architecture & Multi-Tenancy

EntriFa uses a robust multi-tenant Firestore hierarchy:
- **Global Metadata**: /tenants/{tenantId} stores tenant configuration, plan details, subscription status, and enabled feature modules.
- **Tenant Subcollections**: All business data lives strictly inside tenant subcollections:
  - /tenants/{tenantId}/customers/{customerId}
  - /tenants/{tenantId}/customers/{customerId}/transactions/{transactionId}
  - /tenants/{tenantId}/suppliers/{supplierId}
  - /tenants/{tenantId}/accounting/{recordId} (Income & Expenses)
  - /tenants/{tenantId}/products/{productId}
  - /tenants/{tenantId}/invoices/{invoiceId}
  - /tenants/{tenantId}/staff/{staffId}
- **Atomic Balance Updates**: Transaction recording uses Firestore unTransaction to guarantee zero race conditions when updating running balances.
- **Zero Cross-Tenant Leakage**: Enforced by comprehensive irestore.rules.

---

## ⚡ Core Features

### 👑 1. EntriFa Super Admin (/admin)
- **First-Time Setup Wizard (/admin/setup)**: Initialize the root Super Admin account with master security key protection.
- **Client Provisioning Wizard (/admin/clients/new)**: 
  - Provisions client business, assigns initial plan, configures modules, and generates client admin credentials.
  - Automatically provisions both direct links (/login/:tenantId) and vanity slug links (/c/:tenantSlug).
  - Utilizes a secondary Firebase Auth instance so the Super Admin is never logged out during client provisioning.
- **Client Management (/admin/clients)**: Search, filter, inspect tenant statistics, suspend/activate, or delete client workspaces.
- **Dynamic 14-Module Matrix (/admin/module-matrix)**: Real-time per-tenant feature gating (Ledger, Invoices, Inventory, Expenses, Reports, Staff, etc.).
- **Impersonation ("Login as Client")**: 1-click tenant inspection with a top banner and safe return to Super Admin.
- **Subscription & System Settings**: Tier limit controls (Max Customers, Max Staff) and audit logging.

### 🏪 2. Client Business Workspace (/dashboard)
- **Real-Time Financial Dashboard**: Total Receivable (Red), Total Payable, Today's Collection (Green), Today's Expenses, and pending due balance alerts.
- **Digital Khata Ledger (/ledger & /customers/:id)**:
  - Color-coded customer balances (**Red** = You'll Receive, **Green** = You'll Give, **Gray** = Settled).
  - Chronological transaction feed with auto-calculated running balance after every entry.
  - Quick **GIVE (Credit)** & **GET (Payment)** recording modals.
  - **WhatsApp Deep Links**: 1-click formatted balance reminders, payment receipts, and ledger statements.
- **Suppliers & Payables (/suppliers)**: Vendor directory and credit purchase tracking.
- **Income & Expense Tracking (/expenses, /income)**: Categorized cash flow entries (Rent, Utilities, Salaries, Logistics).
- **Master Item Inventory (/products)**: SKU, selling price, purchase price, current stock, low stock thresholds, and instant Add/Reduce stock adjustments.
- **Formal Tax Invoices (/invoices)**: 
  - Dynamic invoice generator with line items, tax rates, discounts, and payment terms.
  - Printable formal invoice view and WhatsApp sharing.
- **Accounting Reports (/reports)**:
  - **Day Book**: Daily cash in/out register.
  - **Profit & Loss**: Gross revenue vs. operational costs.
  - **Receivable & Payable**: Comprehensive balance registers with CSV Export.
- **Staff Access Control (/staff)**: Role-based permissions matrix across modules.
- **Progressive Web App (PWA)**: Installable on Desktop, Android, and iOS with offline app shell caching and smart install prompt.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, React Router v6
- **Database & Auth**: Google Cloud Firestore, Firebase Authentication, Firebase Storage (Modular SDK v12)
- **Deployment**: Vercel (Single Page App with ercel.json rewrite routing)
- **Security**: Granular Firestore Security Rules (irestore.rules) and Storage Rules (storage.rules)

---

## 🚀 Quick Start Guide

### 1. Clone & Install Dependencies
\\\ash
git clone <repository-url>
cd entrifa
npm install
\\\

### 2. Configure Firebase Environment Variables
Create a \.env\ file in the project root (copy from \.env.example\):
\\\env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
\\\

### 3. Deploy Firestore & Storage Rules
In the Firebase Console -> Firestore Database -> **Rules**, paste the contents of \irestore.rules\.  
In Storage -> **Rules**, paste the contents of \storage.rules\.

### 4. Run Locally
\\\ash
npm run dev
\\\
Visit \http://localhost:3000\ in your browser.

### 5. Initialize Root Super Admin
1. Open \http://localhost:3000/admin/setup\.
2. Enter your Name, Email, Password, and the Master Setup Key (\ENTRIFA_SUPER_ADMIN_2026\).
3. Your Super Admin account will be provisioned in Firebase Auth and registered in \/users/{uid}\ with role \SUPER_ADMIN\.
4. Log into \/admin\ and create your first client business workspace!

---

## 📦 Production Deployment to Vercel

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full step-by-step instructions on deploying EntriFa to GitHub and Vercel.

---

## 📄 License
EntriFa is proprietary SaaS software. All rights reserved.
