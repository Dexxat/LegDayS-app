import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient as createJsClient } from '@supabase/supabase-js';

/** Cliente con la sesión de quien está navegando (respeta la seguridad por filas). */
export function createClient() {
  const store = cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* en Server Components no se pueden escribir cookies */ }
      },
    },
  });
}

/** Cliente con clave de servicio: solo en el servidor y después de verificar permisos. */
export function createServiceClient() {
  return createJsClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type Profile = {
  id: string; role: 'admin' | 'alumna'; full_name: string; username: string; phone: string | null; plan: string | null;
  fee: number; next_due: string | null; active: boolean; reminder_sent_for: string | null;
  updated_rutina: string | null; updated_dieta: string | null; updated_calendario: string | null;
};

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return (data as Profile) ?? null;
}

export async function requireAdmin(): Promise<Profile> {
  const p = await getCurrentProfile();
  if (!p || p.role !== 'admin') throw new Error('No autorizado');
  return p;
}
