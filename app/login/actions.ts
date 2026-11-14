'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { usernameToEmail } from '@/lib/auth';

export async function login(formData: FormData) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(String(formData.get('user') || '')),
    password: String(formData.get('pass') || ''),
  });
  if (error || !data.user) redirect('/login?error=' + encodeURIComponent('Usuario o contraseña incorrectos.'));
  const { data: p } = await supabase.from('profiles').select('role, active').eq('id', data.user.id).single();
  if (!p) { await supabase.auth.signOut(); redirect('/login?error=' + encodeURIComponent('La cuenta no tiene perfil. Consultá a tu entrenadora.')); }
  if (p.role === 'alumna' && !p.active) { await supabase.auth.signOut(); redirect('/login?error=' + encodeURIComponent('Tu acceso está pausado. Escribile a tu entrenadora para reactivarlo.')); }
  redirect(p.role === 'admin' ? '/admin' : '/mi-panel');
}

export async function logout() {
  await createClient().auth.signOut();
  redirect('/login');
}
