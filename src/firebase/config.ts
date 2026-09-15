import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Read Firebase config from Vite environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBVmTuiG6lXgr5uangzTC92z_lEMEHezhA',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'entrifa.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'entrifa',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'entrifa.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '81756505059',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:81756505059:web:5a6645b76eb4b21d5296d6',
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
