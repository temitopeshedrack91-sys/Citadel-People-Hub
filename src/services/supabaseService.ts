import { supabase } from '../utils/supabase/client';

// ====================================================================
// AUTH SERVICE (Registration, Login, Session, Realtime User)
// ====================================================================
export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  role?: string;
}

export const authService = {
  async signUp(email: string, password: string, fullName?: string) {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName?.trim(),
        },
      },
    });
    if (error) throw error;

    return data;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .maybeSingle();

    return {
      id: user.id,
      email: user.email || '',
      fullName: profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0],
      role: profile?.role || 'EMPLOYEE',
    };
  },

  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        callback(null);
        return;
      }

      // Query profile data after the Auth callback returns. Awaiting Supabase
      // calls inside this callback can deadlock its internal auth lock.
      setTimeout(() => {
        authService.getCurrentUser().then(callback).catch(() => callback(null));
      }, 0);
    });
  },
};


