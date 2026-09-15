# EntriFa Production Deployment Guide 🌐

This guide walks you through deploying **EntriFa** to GitHub and **Vercel** connected to your production **Firebase** project.

---

## 📋 Prerequisites

1. A [Firebase](https://console.firebase.google.com/) account
2. A [GitHub](https://github.com/) account
3. A [Vercel](https://vercel.com/) account
4. Node.js 18+ installed locally

---

## Step 1: Set Up Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/) and click **Add project**.
2. Name your project (e.g. entrifa-saas-prod).
3. (Optional) Enable Google Analytics if desired.
4. Once the project is created:
   - Go to **Project Settings** (gear icon) -> **General** tab.
   - Under *Your apps*, click the **Web (</>)** icon.
   - Register the app name (e.g. EntriFa Web).
   - Copy the irebaseConfig keys (piKey, uthDomain, projectId, storageBucket, messagingSenderId, ppId).

### Enable Authentication
1. In Firebase Console, navigate to **Build** -> **Authentication** -> click **Get started**.
2. Under the **Sign-in method** tab, enable **Email/Password**.

### Enable Cloud Firestore
1. Navigate to **Build** -> **Firestore Database** -> click **Create database**.
2. Choose your preferred cloud region (e.g., sia-south1, us-central1, etc.).
3. Choose **Start in production mode**.
4. Go to the **Rules** tab, replace the contents with the rules from \irestore.rules\ in this repository, and click **Publish**.

### Enable Firebase Storage (Optional for logos/attachments)
1. Navigate to **Build** -> **Storage** -> click **Get started**.
2. Set the rules from \storage.rules\ in this repository and click **Publish**.

---

## Step 2: Push EntriFa to GitHub

Initialize your git repository and push your codebase:

\\\ash
cd entrifa
git init
git add .
git commit -m "feat: initial release of EntriFa Multi-Tenant SaaS"
git branch -M main
git remote add origin https://github.com/<your-username>/entrifa.git
git push -u origin main
\\\

---

## Step 3: Deploy to Vercel

1. Log into your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** -> **Project**.
3. Select your entrifa GitHub repository and click **Import**.
4. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: ./ (leave default)
   - **Build Command**: 
pm run build
   - **Output Directory**: dist
5. Under **Environment Variables**, add the following 6 keys from your Firebase config:
   - VITE_FIREBASE_API_KEY
   - VITE_FIREBASE_AUTH_DOMAIN
   - VITE_FIREBASE_PROJECT_ID
   - VITE_FIREBASE_STORAGE_BUCKET
   - VITE_FIREBASE_MESSAGING_SENDER_ID
   - VITE_FIREBASE_APP_ID
6. Click **Deploy**.

Vercel will build the project and output your live production URL (e.g. https://entrifa.vercel.app).

---

## Step 4: Authorize Domain in Firebase Auth

1. In the [Firebase Console](https://console.firebase.google.com/), go to **Authentication** -> **Settings** tab.
2. Click **Authorized domains**.
3. Click **Add domain** and enter your Vercel deployment domain (e.g. entrifa.vercel.app or your custom domain pp.entrifa.com).

---

## Step 5: Initialize Your First Super Admin Account

1. Open your live application at https://<your-app>.vercel.app/admin/setup.
2. Enter your Name, Email address, a strong Password, and the Master Setup Key:
   \\\
   ENTRIFA_SUPER_ADMIN_2026
   \\\
3. Click **Initialize Super Admin Account**.
4. The system will register your admin profile in Firebase Authentication and Firestore with SUPER_ADMIN privileges.
5. Log into the Super Admin panel at /admin/login.

---

## Step 6: Provisioning Client Workspaces

1. From the Super Admin Dashboard, click **New Client** (/admin/clients/new).
2. Fill out the business details, admin login, and select the SaaS package.
3. The wizard will create:
   - A dedicated tenant document in /tenants/{tenantId}
   - An isolated client admin auth user in Firebase
   - A direct tenant login link: https://<your-app>.vercel.app/login/<tenantId>
   - A clean vanity URL: https://<your-app>.vercel.app/c/<slug>
4. Copy and share the credentials and login link with your client.
5. Clients can install EntriFa directly on Android, iPhone, or Desktop using the built-in PWA prompt!

---

## Step 7: Post-Setup Security Recommendation

Once you have initialized your Super Admin account:
1. (Recommended) You can modify src/pages/admin/AdminSetup.tsx to disable the setup route or change the SETUP_MASTER_KEY constant to a private secret known only to you.
2. Ensure Firebase Security Rules are verified active in the Firebase Console.
