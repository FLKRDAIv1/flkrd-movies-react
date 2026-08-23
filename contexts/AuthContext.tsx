import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../utils/supabaseClient';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isPasswordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, userName: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    if (window.location.hash.includes('type=recovery') || window.location.hash.includes('recovery')) {
      setIsPasswordRecovery(true);
    }

    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    // 1. Get initial session with 7-day max lifetime check
    supabase.auth.getSession().then(({ data: { session } }) => {
      const loginAt = localStorage.getItem('flkrd_user_login_at');
      if (session?.user && loginAt && Date.now() - parseInt(loginAt) > SEVEN_DAYS_MS) {
        console.warn('[SECURITY] User session expired after 7 days. Performing secure logout...');
        supabase.auth.signOut();
        setSession(null);
        setUser(null);
        localStorage.removeItem('flkrd_username');
        localStorage.removeItem('flkrd_user_login_at');
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        localStorage.setItem('flkrd_username', session.user.user_metadata?.user_name || session.user.email?.split('@')[0] || 'Guest');
        if (!localStorage.getItem('flkrd_user_login_at')) {
          localStorage.setItem('flkrd_user_login_at', Date.now().toString());
        }
      }
      setLoading(false);
    });

    // 2. Periodic heartbeat check for user session expiry (every 5 mins)
    const checkUserExpiry = () => {
      const loginAt = localStorage.getItem('flkrd_user_login_at');
      if (loginAt && Date.now() - parseInt(loginAt) > SEVEN_DAYS_MS) {
        console.warn('[SECURITY] Periodic check: user session expired after 7 days.');
        supabase.auth.signOut();
        setSession(null);
        setUser(null);
        localStorage.removeItem('flkrd_username');
        localStorage.removeItem('flkrd_user_login_at');
      }
    };
    const userInterval = setInterval(checkUserExpiry, 5 * 60 * 1000);

    // 3. Listen for auth state changes — including PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      } else if (event === 'SIGNED_IN' && isPasswordRecovery) {
        setIsPasswordRecovery(false);
      }

      if (session?.user) {
        localStorage.setItem('flkrd_username', session.user.user_metadata?.user_name || session.user.email?.split('@')[0] || 'Guest');
        if (event === 'SIGNED_IN' || !localStorage.getItem('flkrd_user_login_at')) {
          localStorage.setItem('flkrd_user_login_at', Date.now().toString());
        }
      } else {
        localStorage.removeItem('flkrd_username');
        localStorage.removeItem('flkrd_user_login_at');
      }
      setLoading(false);
    });

    return () => {
      clearInterval(userInterval);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (data?.session) {
      setSession(data.session);
      setUser(data.session.user);
      localStorage.setItem('flkrd_username', data.session.user.user_metadata?.user_name || data.session.user.email?.split('@')[0] || 'Guest');
      localStorage.setItem('flkrd_user_login_at', Date.now().toString());
    }
    return { error };
  };

  const signUp = async (email: string, password: string, userName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { user_name: userName } }
    });
    if (data?.session) {
      setSession(data.session);
      setUser(data.session.user);
      localStorage.setItem('flkrd_username', userName || 'Guest');
      localStorage.setItem('flkrd_user_login_at', Date.now().toString());
    }
    return { error };
  };

  const signOut = async () => {
    setIsPasswordRecovery(false);
    setUser(null);
    setSession(null);
    localStorage.removeItem('flkrd_username');
    localStorage.removeItem('flkrd_user_login_at');
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/profile`,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) setIsPasswordRecovery(false);
    return { error };
  };

  // ── Google OAuth ─────────────────────────────────────────────────────────
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/profile`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    return { error };
  };

  return (
    <AuthContext.Provider value={{
      user, session, loading, isPasswordRecovery,
      signIn, signUp, signOut, resetPassword, updatePassword, signInWithGoogle
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
