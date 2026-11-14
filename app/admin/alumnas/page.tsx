import Link from 'next/link';
import Pill from '@/components/Pill';
import Flash from '@/components/Flash';
import { createClient, type Profile } from '@/lib/supabase/server';
import { loadHolidays } from '@/lib/whatsapp';
import { addMonth, cuotaStatus, fmtDate, money, todayAR } from '@/lib/dates';
import { saveStudent } from '../actions';

function StudentForm({ s }: { s?: Profile }) {
  const isNew = !s;
  return (
    <form className="panel" action={saveStudent}>
      <div className="panel-head"><h3>{isNew ? 'Nueva alumna' : `Editar ${s.full_name}`}</h3><Link className="btn ghost sm" href="/admin/alumnas">Cancelar</Link></div>
      {s && <input type="hidden" name="id" value={s.id} />}
      <div className="grid-form">
        <label className="field"><span>Nombre y apellido</span><input className="input" name="full_name" defaultValue={s?.full_name} required /></label>
        <label className="field"><span>Usuario</span><input className="input" name="username" defaultValue={s?.username} required autoComplete="off" /></label>
        <label className="field"><span>{isNew ? 'Contraseña' : 'Nueva contraseña (opcional)'}</span><input className="input" name="pass" minLength={6} required={isNew} autoComplete="new-password" /></label>
        <label className="field"><span>WhatsApp</span><input className="input" name="phone" defaultValue={s?.phone ?? '+54 9 11 '} required /></label>
        <label className="field"><span>Plan</span><input className="input" name="plan" defaultValue={s?.plan ?? ''} placeholder="Grupal 3x semana" /></label>
        <label className="field"><span>Cuota mensual ($)</span><input className="input num" name="fee" type="number" min={0} step={500} defaultValue={s?.fee ?? 26000} required /></label>
        <label className="field"><span>Próximo vencimiento</span><input className="input" name="next_due" type="date" defaultValue={s?.next_due ?? addMonth(todayAR())} required /></label>
        <label className="check" style={{ alignSelf: 'center' }}><input type="checkbox" name="active" defaultChecked={s ? s.active : true} /> Activa</label>
      </div>
      <div><button className="btn primary" type="submit">{isNew ? 'Crear alumna y enviar acceso' : 'Guardar cambios'}</button></div>
    </form>
  );
}

export default async function Alumnas({ searchParams }: { searchParams: { editar?: string; nueva?: string; ok?: string; error?: string } }) {
  const supabase = createClient();
  const [{ data }, holidays] = await Promise.all([
    supabase.from('profiles').select('*').eq('role', 'alumna').order('full_name'),
    loadHolidays(),
  ]);
  const students = (data || []) as Profile[];
  const editing = searchParams.editar ? students.find((s) => s.id === searchParams.editar) : undefined;

  return (
    <>
      <div className="page-head">
        <div><h1>Alumnas</h1><p className="muted">Accesos, contacto de WhatsApp y cuota de cada alumna.</p></div>
        <Link className="btn primary" href="/admin/alumnas?nueva=1">+ Nueva alumna</Link>
      </div>
      <Flash sp={searchParams} />
      {searchParams.nueva && <StudentForm />}
      {editing && <StudentForm s={editing} />}
      <section className="panel"><div className="tbl-wrap"><table>
        <thead><tr><th>Alumna</th><th>Usuario</th><th>WhatsApp</th><th>Plan</th><th className="r">Cuota</th><th>Vence</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          {students.map((s) => {
            const st = cuotaStatus(s.next_due, holidays);
            return (
              <tr key={s.id}>
                <td><strong>{s.full_name}</strong></td><td className="muted">{s.username}</td>
                <td className="num" style={{ whiteSpace: 'nowrap' }}>{s.phone}</td><td className="muted">{s.plan}</td>
                <td className="r num">{money(s.fee)}</td><td className="num" style={{ whiteSpace: 'nowrap' }}>{s.next_due ? fmtDate(s.next_due) : '—'}</td>
                <td>{s.active ? <Pill k={st.k}>{st.t}</Pill> : <span className="muted">Inactiva</span>}</td>
                <td className="r"><Link className="btn sm" href={`/admin/alumnas?editar=${s.id}`}>Editar</Link></td>
              </tr>
            );
          })}
          {!students.length && <tr><td colSpan={8} className="empty">Todavía no cargaste alumnas. Empezá con “Nueva alumna”.</td></tr>}
        </tbody>
      </table></div></section>
    </>
  );
}
