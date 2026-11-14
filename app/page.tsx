import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/supabase/server';

export default async function Home() {
  const p = await getCurrentProfile();
  if (!p) redirect('/login');
  redirect(p.role === 'admin' ? '/admin' : '/mi-panel');
}
