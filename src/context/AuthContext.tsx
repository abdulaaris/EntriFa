import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { User, Tenant } from '../types';

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  login: (email: string, password: string, requiredTenantId?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  impersonateClient: (tenantId: string) => Promise<boolean>;
  exitImpersonation: () => void;
  hasModule: (moduleId: string) => boolean;
  canAccess: (module: string, action?: 'view' | 'add' | 'edit' | 'delete' | 'export') => boolean;
  refreshTenant: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Impersonation state
  const [impersonatingTenantId, setImpersonatingTenantId] = useState<string | null>(
    sessionStorage.getItem('entrifa_impersonating_tenant')
  );

  // Load user profile from Firestore /users/{uid}
  const loadUserProfile = async (fbUser: FirebaseUser | null, targetTenantId?: string | null) => {
    if (!fbUser) {
      setUser(null);
      setTenant(null);
      setIsLoading(false);
      return;
    }

    try {
      const userDocSnap = await getDoc(doc(db, 'users', fbUser.uid));
      if (!userDocSnap.exists()) {
        console.error('No Firestore user document found for UID:', fbUser.uid);
        await signOut(auth);
        setUser(null);
        setTenant(null);
        setIsLoading(false);
        return;
      }

      const userData = userDocSnap.data() as User;
      const isSuper = userData.role === 'SUPER_ADMIN';

      // If Super Admin is impersonating a tenant
      const effectiveTenantId = (isSuper && targetTenantId) ? targetTenantId : userData.tenantId;

      let tenantData: Tenant | null = null;
      if (effectiveTenantId) {
        const tenantDocSnap = await getDoc(doc(db, 'tenants', effectiveTenantId));
        if (tenantDocSnap.exists()) {
          tenantData = { id: tenantDocSnap.id, ...tenantDocSnap.data() } as Tenant;
        }
      }

      setUser({
        ...userData,
        isImpersonating: !!(isSuper && targetTenantId),
      });
      setTenant(tenantData);
    } catch (err) {
      console.error('Error loading user profile:', err);
      setUser(null);
      setTenant(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      await loadUserProfile(fbUser, impersonatingTenantId);
    });
    return () => unsubscribe();
  }, [impersonatingTenantId]);

  const login = async (email: string, pass: string, requiredTenantId?: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const userDocSnap = await getDoc(doc(db, 'users', cred.user.uid));

      if (!userDocSnap.exists()) {
        await signOut(auth);
        throw new Error('User profile record not found in system.');
      }

      const userData = userDocSnap.data() as User;

      // If client opened a unique tenant link (e.g. /login/:tenantId), enforce tenant isolation!
      if (requiredTenantId && userData.role !== 'SUPER_ADMIN') {
        if (userData.tenantId !== requiredTenantId) {
          await signOut(auth);
          throw new Error('Access denied: Your credentials do not belong to this business workspace.');
        }
      }

      // Check if tenant is suspended
      if (userData.tenantId) {
        const tenantSnap = await getDoc(doc(db, 'tenants', userData.tenantId));
        if (tenantSnap.exists()) {
          const t = tenantSnap.data() as Tenant;
          if (t.status === 'SUSPENDED') {
            await signOut(auth);
            throw new Error('This business workspace has been suspended by the platform administrator.');
          }
        }
      }

      await loadUserProfile(cred.user, null);
      return true;
    } catch (err: any) {
      alert(err.message || 'Login failed. Please verify your credentials.');
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    sessionStorage.removeItem('entrifa_impersonating_tenant');
    setImpersonatingTenantId(null);
    await signOut(auth);
    setUser(null);
    setTenant(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const impersonateClient = async (tenantId: string): Promise<boolean> => {
    if (!user || user.role !== 'SUPER_ADMIN') return false;
    sessionStorage.setItem('entrifa_impersonating_tenant', tenantId);
    setImpersonatingTenantId(tenantId);
    await loadUserProfile(firebaseUser, tenantId);
    return true;
  };

  const exitImpersonation = () => {
    sessionStorage.removeItem('entrifa_impersonating_tenant');
    setImpersonatingTenantId(null);
    loadUserProfile(firebaseUser, null);
  };

  const hasModule = (moduleId: string): boolean => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN' && !user.isImpersonating) return true;
    if (!tenant) return false;
    return (tenant.enabledModules || []).includes(moduleId);
  };

  const canAccess = (module: string, action: 'view' | 'add' | 'edit' | 'delete' | 'export' = 'view'): boolean => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN' || user.role === 'CLIENT_ADMIN') {
      return hasModule(module);
    }
    if (user.role === 'STAFF') {
      if (!hasModule(module)) return false;
      if (!user.permissions) return false;
      const mod = user.permissions[module];
      return mod ? !!mod[action] : false;
    }
    return false;
  };

  const refreshTenant = async () => {
    if (tenant?.id) {
      const snap = await getDoc(doc(db, 'tenants', tenant.id));
      if (snap.exists()) {
        setTenant({ id: snap.id, ...snap.data() } as Tenant);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        firebaseUser,
        isLoading,
        login,
        logout,
        resetPassword,
        impersonateClient,
        exitImpersonation,
        hasModule,
        canAccess,
        refreshTenant,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
