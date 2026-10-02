import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  applyActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
  updatePassword as fbUpdatePassword,
  updateProfile,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth, db } from '../utils/firebaseClient';
import { doc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isPasswordRecovery: boolean;
  recoveryEmail: string | null;
  recoveryError: string | null;
  isEmailVerified: boolean;
  isEmailVerificationSuccess: boolean;
  isEmailVerificationFailed: boolean;
  clearVerificationState: () => void;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, userName: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  sendVerificationEmail: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapFirebaseUser = (fbUser: FirebaseUser | null): User | null => {
  if (!fbUser) return null;
  return {
    id: fbUser.uid,
    app_metadata: {},
    user_metadata: {
      full_name: fbUser.displayName || '',
      user_name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
      avatar_url: fbUser.photoURL || '',
      email_verified: fbUser.emailVerified,
    },
    aud: 'authenticated',
    created_at: fbUser.metadata.creationTime || new Date().toISOString(),
    email: fbUser.email || '',
    email_confirmed_at: fbUser.emailVerified ? (fbUser.metadata.lastSignInTime || new Date().toISOString()) : undefined,
  } as unknown as User;
};

const makeSession = (fbUser: FirebaseUser | null): Session | null => {
  if (!fbUser) return null;
  return {
    access_token: 'fb_token_' + fbUser.uid,
    token_type: 'bearer',
    user: mapFirebaseUser(fbUser) as User,
    expires_in: 3600 * 24 * 7,
    refresh_token: 'fb_refresh_' + fbUser.uid,
  } as Session;
};

// Sync user profile to Firestore `users/{uid}` in the background
const syncUserProfileToFirestore = async (fbUser: FirebaseUser) => {
  try {
    const userRef = doc(db, 'users', fbUser.uid);
    const payload: Record<string, any> = {
      id: fbUser.uid,
      email: fbUser.email,
      displayName: fbUser.displayName || '',
      photoUrl: fbUser.photoURL || '',
      lastLoginAt: new Date().toISOString(),
      createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
    };
    await setDoc(userRef, payload, { merge: true });

    // Sync avatar & username locally if available
    if (fbUser.photoURL) {
      try {
        localStorage.setItem('flkrd_avatar_url', fbUser.photoURL);
        window.dispatchEvent(new Event('flkrd-avatar-changed'));
      } catch (err) { }
    }
    if (fbUser.displayName) {
      localStorage.setItem('flkrd_username', fbUser.displayName);
    }
  } catch (e) {
    // Non-blocking background sync
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [recoveryEmail, setRecoveryEmail] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isEmailVerificationSuccess, setIsEmailVerificationSuccess] = useState(false);
  const [isEmailVerificationFailed, setIsEmailVerificationFailed] = useState(false);

  const clearVerificationState = () => {
    setIsEmailVerificationSuccess(false);
    setIsEmailVerificationFailed(false);
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  useEffect(() => {
    // 1. Detect password reset or email verification link from URL
    if (typeof window !== 'undefined') {
      const searchStr = window.location.search || (window.location.hash.includes('?') ? window.location.hash.substring(window.location.hash.indexOf('?')) : '');
      const urlParams = new URLSearchParams(searchStr);
      const mode = urlParams.get('mode');
      const oobCode = urlParams.get('oobCode');

      // Flow A: Password Reset Link
      if ((mode === 'resetPassword' || mode === 'recovery') && oobCode) {
        setRecoveryCode(oobCode);
        setIsPasswordRecovery(true);
        verifyPasswordResetCode(auth, oobCode)
          .then((em) => {
            setRecoveryEmail(em);
            setRecoveryError(null);
          })
          .catch((err) => {
            console.warn('[AUTH] Invalid/expired reset code:', err?.message);
            setRecoveryError(err?.code || 'auth/invalid-action-code');
          });

        if (!window.location.pathname.includes('/profile')) {
          window.history.replaceState({}, document.title, `/profile${searchStr}`);
        }
      }

      // Flow B: Email Verification Link
      if (mode === 'verifyEmail' && oobCode) {
        applyActionCode(auth, oobCode)
          .then(async () => {
            console.log('[AUTH] Email verified successfully via action code!');
            setIsEmailVerified(true);
            setIsEmailVerificationSuccess(true);
            setIsEmailVerificationFailed(false);
            if (auth.currentUser) {
              await auth.currentUser.reload();
              setUser(mapFirebaseUser(auth.currentUser));
            }
          })
          .catch((err) => {
            console.warn('[AUTH] applyActionCode error:', err?.message);
            setIsEmailVerificationFailed(true);
            setIsEmailVerificationSuccess(false);
          });

        if (!window.location.pathname.includes('/profile')) {
          window.history.replaceState({}, document.title, `/profile${searchStr}`);
        }
      }
    }

    // 2. Check for redirect results (Mobile Google Sign-In fallback) with race-condition guard
    let isRedirectPending = true;
    getRedirectResult(auth)
      .then((cred) => {
        if (cred?.user) {
          const u = mapFirebaseUser(cred.user);
          setUser(u);
          setSession(makeSession(cred.user));
          setIsEmailVerified(cred.user.emailVerified);
          syncUserProfileToFirestore(cred.user);
        }
      })
      .catch((err) => console.warn('[AUTH] Redirect result check:', err?.message))
      .finally(() => {
        isRedirectPending = false;
        if (auth.currentUser) {
          const u = mapFirebaseUser(auth.currentUser);
          setUser(u);
          setSession(makeSession(auth.currentUser));
          setIsEmailVerified(auth.currentUser.emailVerified);
        }
        setLoading(false);
      });

    // 3. Listen to Auth State
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const u = mapFirebaseUser(fbUser);
        const s = makeSession(fbUser);
        setUser(u);
        setSession(s);
        setIsEmailVerified(fbUser.emailVerified);
        localStorage.setItem('flkrd_username', fbUser.displayName || fbUser.email?.split('@')[0] || 'Guest');
        if (!localStorage.getItem('flkrd_user_login_at')) {
          localStorage.setItem('flkrd_user_login_at', Date.now().toString());
        }
        if (fbUser.email?.toLowerCase() === 'flkrdstudio@gmail.com') {
          localStorage.setItem('isFlkrdAdmin', 'true');
          localStorage.setItem('flkrd_admin_email', 'flkrdstudio@gmail.com');
          localStorage.setItem('flkrd_admin_session_token', 'flkrd_master_admin_auto');
        } else {
          try {
            const subStored = localStorage.getItem('flkrd_sub_admins');
            if (subStored) {
              const subs = JSON.parse(subStored);
              const matchedSub = subs.find((a: any) => a.email?.toLowerCase() === fbUser.email?.toLowerCase() && a.isActive);
              if (matchedSub) {
                localStorage.setItem('isFlkrdAdmin', 'true');
                localStorage.setItem('flkrd_admin_email', matchedSub.email.toLowerCase());
                if (!localStorage.getItem('flkrd_admin_session_token')) {
                  localStorage.setItem('flkrd_admin_session_token', `flkrd_sub_${matchedSub.id}`);
                }
              }
            }
          } catch (e) {}
        }
        syncUserProfileToFirestore(fbUser);
      } else {
        if (!isRedirectPending) {
          setUser(null);
          setSession(null);
          setIsEmailVerified(false);
          localStorage.removeItem('flkrd_username');
          localStorage.removeItem('flkrd_user_login_at');
        }
      }
      if (!isRedirectPending) {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const u = mapFirebaseUser(cred.user);
      const s = makeSession(cred.user);
      setUser(u);
      setSession(s);
      setIsEmailVerified(cred.user.emailVerified);
      localStorage.setItem('flkrd_username', cred.user.displayName || cred.user.email?.split('@')[0] || 'Guest');
      localStorage.setItem('flkrd_user_login_at', Date.now().toString());
      if (cred.user.email?.toLowerCase() === 'flkrdstudio@gmail.com') {
        localStorage.setItem('isFlkrdAdmin', 'true');
        localStorage.setItem('flkrd_admin_email', 'flkrdstudio@gmail.com');
        localStorage.setItem('flkrd_admin_session_token', 'flkrd_master_admin_auto');
      }
      await syncUserProfileToFirestore(cred.user);
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, userName: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (userName && cred.user) {
        await updateProfile(cred.user, { displayName: userName.trim() });
      }

      // Automatically dispatch confirmation / verification email
      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://fkurd.pro';
        await sendEmailVerification(cred.user, {
          url: `${origin}/profile?mode=verifyEmail`
        });
      } catch (verifyErr) {
        console.warn('[AUTH] sendEmailVerification warning:', verifyErr);
      }

      const u = mapFirebaseUser(cred.user);
      const s = makeSession(cred.user);
      setUser(u);
      setSession(s);
      setIsEmailVerified(false);
      localStorage.setItem('flkrd_username', userName.trim() || 'Guest');
      localStorage.setItem('flkrd_user_login_at', Date.now().toString());
      await syncUserProfileToFirestore(cred.user);
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signOut = async () => {
    setIsPasswordRecovery(false);
    setRecoveryCode(null);
    setRecoveryError(null);
    setUser(null);
    setSession(null);
    setIsEmailVerified(false);
    localStorage.removeItem('flkrd_username');
    localStorage.removeItem('flkrd_user_login_at');
    try {
      await fbSignOut(auth);
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const sendVerificationEmail = async () => {
    try {
      if (!auth.currentUser) {
        return { error: new Error('No user is currently signed in.') };
      }
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://fkurd.pro';
      await sendEmailVerification(auth.currentUser, {
        url: `${origin}/profile?mode=verifyEmail`
      });
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://fkurd.pro';
      const actionCodeSettings = {
        url: `${origin}/profile?mode=resetPassword`,
      };
      try {
        await sendPasswordResetEmail(auth, email.trim(), actionCodeSettings);
      } catch (settingsErr: any) {
        console.warn('[AUTH] sendPasswordResetEmail with settings fallback:', settingsErr?.message);
        await sendPasswordResetEmail(auth, email.trim());
      }
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      // Flow A: User followed a Password Reset Email link (?oobCode=XYZ)
      if (recoveryCode) {
        await confirmPasswordReset(auth, recoveryCode, newPassword);
        setIsPasswordRecovery(false);
        setRecoveryCode(null);
        setRecoveryError(null);
        // Clean URL query parameters seamlessly
        if (typeof window !== 'undefined' && window.history?.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        return { error: null };
      }

      // Flow B: User is currently logged in and changing password in settings
      if (auth.currentUser) {
        await fbUpdatePassword(auth.currentUser, newPassword);
        setIsPasswordRecovery(false);
        return { error: null };
      }

      return { error: new Error('No password reset session or authenticated user found.') };
    } catch (error: any) {
      return { error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      try {
        const cred = await signInWithPopup(auth, provider);
        const u = mapFirebaseUser(cred.user);
        const s = makeSession(cred.user);
        setUser(u);
        setSession(s);
        setIsEmailVerified(cred.user.emailVerified);
        if (cred.user.email?.toLowerCase() === 'flkrdstudio@gmail.com') {
          localStorage.setItem('isFlkrdAdmin', 'true');
          localStorage.setItem('flkrd_admin_email', 'flkrdstudio@gmail.com');
          localStorage.setItem('flkrd_admin_session_token', 'flkrd_master_admin_auto');
        }
        await syncUserProfileToFirestore(cred.user);
        return { error: null };
      } catch (popupErr: any) {
        // User intentionally closed popup
        if (popupErr.code === 'auth/popup-closed-by-user' || popupErr.code === 'auth/cancelled-popup-request') {
          return { error: { code: 'auth/cancelled', message: 'Cancelled by user' } };
        }
        // Fallback to redirect if popup is blocked on mobile devices
        if (popupErr.code === 'auth/popup-blocked') {
          await signInWithRedirect(auth, provider);
          return { error: null };
        }
        return { error: popupErr };
      }
    } catch (error: any) {
      return { error };
    }
  };

  return (
    <AuthContext.Provider value={{
      user, session, loading, isPasswordRecovery, recoveryEmail, recoveryError, isEmailVerified,
      isEmailVerificationSuccess, isEmailVerificationFailed, clearVerificationState,
      signIn, signUp, signOut, resetPassword, updatePassword, signInWithGoogle, sendVerificationEmail
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
