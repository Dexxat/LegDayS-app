'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/** Cambio de contraseña de quien está conectada (alumna o entrenadora). Pide la contraseña actual. */
export async function changePassword(formData: FormData) {
  const raw = String(formData.get('back') || '');
  const back = raw.startsWith('/admin') ? '/admin/cuenta' : '/mi-panel?ver=cuenta';
  const go = (kind: 'ok' | 'error', msg: string) => redirect(`${back}${back.includes('?') ? '&' : '?'}${kind}=${encodeURIComponent(msg)}`);
  const current = String(formData.get('current') || '');
  const next = String(formData.get('next') || '');
  const confirm = String(formData.get('confirm') || '');

  if (next.length < 8) go('error', 'La contraseña nueva tiene que tener al menos 8 caracteres.');
  if (next !== confirm) go('error', 'Las dos contraseñas nuevas no coinciden.');
  if (next === current) go('error', 'La contraseña nueva tiene que ser distinta de la actual.');

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect('/login');
  const { error: wrong } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
  if (wrong) go('error', 'La contraseña actual no es correcta.');
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) go('error', 'No se pudo cambiar la contraseña: ' + error.message);
  go('ok', 'Listo, tu contraseña se cambió. Usala la próxima vez que ingreses.');
}
