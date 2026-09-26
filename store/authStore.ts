import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { disableWebPush } from '../lib/webPush';

type AuthState = {
  session: Session | null;
  user: User | null;
  isBootstrapping: boolean;
  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isBootstrapping: true,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  signOut: async () => {
    // Antes de salir (hace falta la sesión): este navegador deja de recibir mis avisos.
    await disableWebPush().catch(() => undefined);
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },
}));

/**
 * Inicializa el store leyendo la sesión persistida y suscribiéndose a cambios.
 * Debe llamarse una única vez en el root layout.
 */
export function bootstrapAuth(): () => void {
  supabase.auth
    .getSession()
    .then(({ data }) => {
      useAuthStore.setState({
        session: data.session,
        user: data.session?.user ?? null,
        isBootstrapping: false,
      });
    })
    .catch(() => {
      useAuthStore.setState({ isBootstrapping: false });
    });

  const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.setState({ session, user: session?.user ?? null });
  });

  return () => sub.subscription.unsubscribe();
}
