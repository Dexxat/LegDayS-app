import { redirect } from 'next/navigation';
import Brand from '@/components/Brand';
import SideNav from '@/components/SideNav';
import { createClient, getCurrentProfile } from '@/lib/supabase/server';
import { loadHolidays } from '@/lib/whatsapp';
import { cuotaStatus } from '@/lib/dates';
import { logout } from '@/app/login/actions';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentProfile();
  if (!me) redirect('/login');
  if (me.role !== 'admin') redirect('/mi-panel');

  const supabase = createClient();
  const [{ data: st }, holidays] = await Promise.all([
    supabase.from('profiles').select('next_due').eq('role', 'alumna').eq('active', true),
    loadHolidays(),
  ]);
  const attention = (st || []).filter((s: any) => cuotaStatus(s.next_due, holidays).k !== 'ok').length;

  return (
    <>
      <header className="topbar">
        <Brand />
        <div className="who"><span>Panel de la entrenadora</span>
          <form action={logout}><button className="btn sm" type="submit">Salir</button></form></div>
      </header>
      <div className="layout">
        <SideNav items={[
          { href: '/admin', label: 'Resumen' },
          { href: '/admin/alumnas', label: 'Alumnas' },
          { href: '/admin/calendario', label: 'Calendario' },
          { href: '/admin/rutinas', label: 'Rutinas' },
          { href: '/admin/dietas', label: 'Dietas' },
          { href: '/admin/ejercicios', label: 'Ejercicios' },
          { href: '/admin/ganancias', label: 'Ganancias' },
          { href: '/admin/avisos', label: 'Avisos WhatsApp', badge: attention },
          { href: '/admin/cuenta', label: 'Mi cuenta' },
        ]} />
        <main className="main">{children}</main>
      </div>
    </>
  );
}
