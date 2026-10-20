import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<string | null>;
  updatePassword: (password: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    // Check for inactivity auto-logout (5 days)
    const checkInactivity = async (currentSession: Session | null) => {
      if (!currentSession) return;
      
      const lastActivity = localStorage.getItem('last_activity');
      const now = Date.now();
      const oneMinuteInMs = 60 * 1000; // 1 minuto para teste
      
      if (lastActivity && now - parseInt(lastActivity) > oneMinuteInMs) {
        console.warn('Inatividade superior a 5 dias. Terminando sessão.');
        await supabase.auth.signOut();
        setSession(null);
        localStorage.removeItem('last_activity');
      } else {
        localStorage.setItem('last_activity', now.toString());
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        checkInactivity(data.session);
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (mounted) {
        setSession(nextSession);
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || (event === 'INITIAL_SESSION' && nextSession)) {
          localStorage.setItem('last_activity', Date.now().toString());
        }
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error ? error.message : null;
      },
      signOut: async () => {
        try {
          await supabase.auth.signOut();
        } catch (error) {
          console.error('Erro ao sair:', error);
        } finally {
          setSession(null);
        }
      },
      resetPassword: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/login',
        });
        return error ? error.message : null;
      },
      updatePassword: async (password) => {
        const { error } = await supabase.auth.updateUser({ password });
        return error ? error.message : null;
      }
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
