import PasswordForm from '@/components/PasswordForm';
import { getCurrentProfile } from '@/lib/supabase/server';

export default async function Cuenta({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const me = await getCurrentProfile();
  return (
    <>
      <div className="page-head"><div><h1>Mi cuenta</h1><p className="muted">Datos de acceso al panel de la entrenadora.</p></div></div>
      <PasswordForm back="/admin/cuenta" username={me?.username || ''} sp={searchParams} />
    </>
  );
}
