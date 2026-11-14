import Pill from '@/components/Pill';
import Flash from '@/components/Flash';
import { createClient, type Profile } from '@/lib/supabase/server';
import { loadHolidays } from '@/lib/whatsapp';
import { fmtDateLong, fmtStamp, reminderDate, todayAR } from '@/lib/dates';
import { sendRemindersNow } from '../actions';

const TYPE_LABEL: Record<string, string> = { actualizacion: 'Actualización', recordatorio: 'Vencimiento', pago: 'Pago', bienvenida: 'Bienvenida' };

export default async function Avisos({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const supabase = createClient();
  const today = todayAR();
  const [{ data: st }, { data: msgs }, holidays] = await Promise.all([
    supabase.from('profiles').select('*').eq('role', 'alumna').eq('active', true).not('next_due', 'is', null).order('next_due'),
    supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(50),
    loadHolidays(),
  ]);
  const students = (st || []) as Profile[];
  const name = (id: string) => students.find((s) => s.id === id)?.full_name || '';

  return (
    <>
      <div className="page-head">
        <div><h1>Avisos WhatsApp</h1><p className="muted">Recordatorio automático 2 días hábiles antes del vencimiento (todos los días a las 9:00) y aviso en cada actualización.</p></div>
        <form action={sendRemindersNow}><button className="btn primary" type="submit">Revisar y enviar ahora</button></form>
      </div>
      <Flash sp={searchParams} />
      <div className="cols">
        <section className="panel"><h2>Próximos vencimientos</h2><div className="tbl-wrap"><table>
          <thead><tr><th>Alumna</th><th>Vence</th><th>Aviso</th><th>Estado</th></tr></thead>
          <tbody>{students.map((s) => {
            const r = reminderDate(s.next_due!, holidays);
            const st = s.reminder_sent_for === s.next_due ? <Pill k="ok">Enviado</Pill>
              : today > s.next_due! ? <Pill k="bad">Vencida</Pill>
              : today >= r ? <Pill k="warn">Enviar hoy</Pill>
              : <span className="muted" style={{ fontSize: '.85rem' }}>Programado</span>;
            return <tr key={s.id}><td>{s.full_name}</td><td className="num" style={{ whiteSpace: 'nowrap' }}>{fmtDateLong(s.next_due!)}</td><td className="num" style={{ whiteSpace: 'nowrap' }}>{fmtDateLong(r)}</td><td>{st}</td></tr>;
          })}</tbody></table></div></section>
        <section className="panel"><h2>Historial de mensajes</h2><div className="wa-log">
          {(msgs || []).map((m: any) => (
            <div className="wa" key={m.id}>
              <div className="meta"><span><strong>{name(m.student_id) || 'Alumna'}</strong></span><span className="num">{fmtStamp(m.created_at)}</span></div>
              <span className="tag">{TYPE_LABEL[m.type] || m.type}{m.status === 'error' ? ' · no se pudo enviar' : ''}</span>
              <span className="txt">{m.body}</span>
              {m.error && <span style={{ fontSize: '.78rem', color: 'var(--bad)' }}>{m.error}</span>}
            </div>))}
          {!(msgs || []).length && <p className="empty">Todavía no se enviaron mensajes.</p>}
        </div></section>
      </div>
    </>
  );
}
