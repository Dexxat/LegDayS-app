import Flash from '@/components/Flash';
import { createClient, type Profile } from '@/lib/supabase/server';
import { DAYS, parse, todayAR } from '@/lib/dates';
import { addSlot, deleteSlot } from '../actions';

export default async function Calendario({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const supabase = createClient();
  const [{ data: slots }, { data: st }] = await Promise.all([
    supabase.from('slots').select('*, slot_students(student_id)').order('start_time'),
    supabase.from('profiles').select('id, full_name').eq('role', 'alumna').eq('active', true).order('full_name'),
  ]);
  const students = (st || []) as Pick<Profile, 'id' | 'full_name'>[];
  const name = (id: string) => students.find((s) => s.id === id)?.full_name.split(' ')[0];
  const wd = parse(todayAR()).getDay();

  return (
    <>
      <div className="page-head"><div><h1>Calendario semanal</h1><p className="muted">Cada cambio se refleja al instante en el perfil de las alumnas y les llega un WhatsApp.</p></div></div>
      <Flash sp={searchParams} />
      <section className="panel"><div className="week">
        {DAYS.map((d, i) => {
          const list = (slots || []).filter((c: any) => c.day === i + 1);
          return (
            <div className={`day ${wd === i + 1 ? 'today' : ''}`} key={d}>
              <div className="day-h"><h3>{d}</h3>{wd === i + 1 && <span className="label" style={{ color: 'var(--accent)' }}>Hoy</span>}</div>
              {list.length ? list.map((c: any) => (
                <div className="slot" key={c.id}>
                  <form action={deleteSlot}><input type="hidden" name="id" value={c.id} />
                    <button className="x" type="submit" aria-label={`Quitar ${c.title} del ${d}`}>×</button></form>
                  <span className="tm">{c.start_time.slice(0, 5)}–{c.end_time.slice(0, 5)}</span>
                  <span className="ti">{c.title}</span>
                  <span className="wh">{c.for_all ? 'Todas las alumnas' : c.slot_students.map((x: any) => name(x.student_id)).filter(Boolean).join(', ')}</span>
                </div>
              )) : <p className="empty" style={{ fontSize: '.82rem' }}>Sin clases</p>}
            </div>
          );
        })}
      </div></section>

      <form className="panel" action={addSlot}>
        <h2>Agregar horario</h2>
        <div className="grid-form">
          <label className="field"><span>Día</span><select className="input" name="day">{DAYS.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}</select></label>
          <label className="field"><span>Desde</span><input className="input" name="start_time" type="time" defaultValue="18:00" required /></label>
          <label className="field"><span>Hasta</span><input className="input" name="end_time" type="time" defaultValue="19:00" required /></label>
          <label className="field"><span>Actividad</span><input className="input" name="title" placeholder="Funcional grupal" required /></label>
        </div>
        <div className="field"><span>¿Quiénes participan?</span><div className="checks">
          <label className="check"><input type="checkbox" name="for_all" /> Todas</label>
          {students.map((s) => <label className="check" key={s.id}><input type="checkbox" name="students" value={s.id} /> {s.full_name}</label>)}
        </div></div>
        <div><button className="btn primary" type="submit">Agregar y avisar por WhatsApp</button></div>
      </form>
    </>
  );
}
