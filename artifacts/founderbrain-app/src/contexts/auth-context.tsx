import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import {
  isSupabaseConfigured,
  supabase,
  supabaseSetupMessage,
  getAuthRedirectUrl,
} from '@/lib/supabase';

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isConfigured: boolean;
  setupMessage: string;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<{ confirmationRequired: boolean }>;
  resendSignupConfirmation: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let active = true;
    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) throw error;
        setUser(data.session?.user ?? null);
      })
      .catch((error: unknown) => {
        if (active) {
          console.error('Unable to restore the Supabase session.', error);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    isConfigured: isSupabaseConfigured,
    setupMessage: supabaseSetupMessage,
    async signIn(email, password) {
      if (!supabase) throw new Error(supabaseSetupMessage);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    },
    async signUp(email, password, displayName) {
      if (!supabase) throw new Error(supabaseSetupMessage);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: getAuthRedirectUrl('/auth/callback'),
        },
      });
      if (error) throw error;
      return { confirmationRequired: !data.session };
    },
    async resendSignupConfirmation(email) {
      if (!supabase) throw new Error(supabaseSetupMessage);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: getAuthRedirectUrl('/auth/callback') },
      });
      if (error) throw error;
    },
    async signOut() {
      if (!supabase) throw new Error(supabaseSetupMessage);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    async requestPasswordReset(email) {
      if (!supabase) throw new Error(supabaseSetupMessage);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getAuthRedirectUrl('/update-password'),
      });
      if (error) throw error;
    },
    async updatePassword(password) {
      if (!supabase) throw new Error(supabaseSetupMessage);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return context;
}
