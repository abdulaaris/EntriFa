import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Read Firebase config from Vite environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${import.meta.env.VITE_FIREBASE_PROJECT_ID || 'entrifa-saas'}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'entrifa-saas',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${import.meta.env.VITE_FIREBASE_PROJECT_ID || 'entrifa-saas'}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

// Initialize Primary Firebase App
export const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

// Helper to get a secondary Auth instance for administrative creation of new client admin accounts
// without logging out the currently authenticated Super Admin user session
export function getSecondaryAuth(): Auth {
  const secondaryAppName = 'EntriFaSecondaryAdminApp';
  let secondaryApp: FirebaseApp;
  const existingApps = getApps();
  const found = existingApps.find(a => a.name === secondaryAppName);
  if (found) {
    secondaryApp = found;
  } else {
    secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  }
  return getAuth(secondaryApp);
}

export default app;
