import Link from 'next/link';
import { redirect } from 'next/navigation';
import Brand from '@/components/Brand';
import Pill from '@/components/Pill';
import { createClient, getCurrentProfile } from '@/lib/supabase/server';
import { loadHolidays } from '@/lib/whatsapp';
import { DAYS, cuotaStatus, fmtDate, fmtDateLong, fmtStamp, money, monthKey, monthLabel, parse, reminderDate, todayAR } from '@/lib/dates';
import { emptyDiet, emptyRoutine, toLibExercise, type Diet, type Routine } from '@/lib/types';
import ExerciseLibrary from '@/components/ExerciseLibrary';
import PasswordForm from '@/components/PasswordForm';
import { logout } from '@/app/login/actions';

export const dynamic = 'force-dynamic';
const TABS = [['semana', 'Mi semana'], ['rutina', 'Rutina'], ['dieta', 'Dieta'], ['ejercicios', 'Ejercicios'], ['cuota', 'Mi cuota'], ['cuenta', 'Mi cuenta']] as const;
const isNew = (ts: string | null) => !!ts && Date.now() - new Date(ts).getTime() < 3 * 864e5;

export default async function MiPanel({ searchParams }: { searchParams: { ver?: string; ej?: string; ok?: string; error?: string } }) {
  const me = await getCurrentProfile();
  if (!me) redirect('/login');
  if (me.role === 'admin') redirect('/admin');
  if (!me.active) redirect('/salir?motivo=pausada');
  const ver = TABS.some(([k]) => k === searchParams.ver) ? searchParams.ver! : 'semana';

  const supabase = createClient();
  const [{ data: r }, { data: d }, { data: slots }, { data: pays }, { data: exRows }, holidays] = await Promise.all([
    supabase.from('routines').select('data').eq('student_id', me.id).maybeSingle(),
    supabase.from('diets').select('data').eq('student_id', me.id).maybeSingle(),
    supabase.from('slots').select('*').order('start_time'),
    supabase.from('payments').select('*').eq('student_id', me.id).order('paid_on', { ascending: false }),
    supabase.from('exercises').select('*').order('name'),
    loadHolidays(),
  ]);
  const routine: Routine = r?.data || emptyRoutine();
  const diet: Diet = d?.data || emptyDiet();
  const st = cuotaStatus(me.next_due, holidays);
  const library = (exRows || []).map(toLibExercise);
  const libId = (name: string) => library.find((x) => x.name.trim().toLowerCase() === name.trim().toLowerCase())?.id;
  const wd = parse(todayAR()).getDay();
  const badge = { semana: me.updated_calendario, rutina: me.updated_rutina, dieta: me.updated_dieta } as Record<string, string | null>;

  return (
    <>
      <header className="topbar"><Brand />
        <div className="who"><span>{me.full_name}</span><form action={logout}><button className="btn sm" type="submit">Salir</button></form></div></header>
      <div className="layout">
        <nav className="side" aria-label="Secciones">
          {TABS.map(([k, l]) => (
            <Link key={k} href={`/mi-panel?ver=${k}`} aria-current={ver === k ? 'page' : undefined}>{l}{isNew(badge[k]) && <span className="count">nuevo</span>}</Link>))}
        </nav>
        <main className="main">
          <section className="hero">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', minWidth: 0 }}>
              <span className="label">{me.plan}</span><h1>Hola, {me.full_name.split(' ')[0]}</h1>
              <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <Pill k={st.k}>Cuota: {st.t}</Pill>{me.next_due && <span className="muted num" style={{ fontSize: '.88rem' }}>vence {fmtDateLong(me.next_due)}</span>}</div>
            </div>
            <div className="pdf-box"><span className="label">Descargar en PDF</span><div className="pdf-btns">
              <a className="btn sm" href="/api/pdf?tipo=rutina">Rutina</a>
              <a className="btn sm" href="/api/pdf?tipo=dieta">Dieta</a>
              <a className="btn sm primary" href="/api/pdf?tipo=ambos">Rutina + dieta</a></div></div>
          </section>

          {ver === 'semana' && (
            <section className="panel">
              <div className="panel-head"><h2>Mis horarios</h2><span className="muted" style={{ fontSize: '.85rem' }}>{isNew(me.updated_calendario) && <Pill k="new">Actualizado</Pill>} Última actualización: {fmtStamp(me.updated_calendario)}</span></div>
              <div className="week">{DAYS.map((dn, i) => {
                const list = (slots || []).filter((c: any) => c.day === i + 1);
                return (
                  <div className={`day ${wd === i + 1 ? 'today' : ''}`} key={dn}>
                    <div className="day-h"><h3>{dn}</h3>{wd === i + 1 && <span className="label" style={{ color: 'var(--accent)' }}>Hoy</span>}</div>
                    {list.length ? list.map((c: any) => (
                      <div className="slot" key={c.id}><span className="tm">{c.start_time.slice(0, 5)}–{c.end_time.slice(0, 5)}</span><span className="ti">{c.title}</span></div>
                    )) : <p className="empty" style={{ fontSize: '.82rem' }}>Descanso</p>}
                  </div>);
              })}</div>
            </section>)}

          {ver === 'rutina' && (<>
            <div className="panel-head"><h2>Mi rutina</h2><span className="muted" style={{ fontSize: '.85rem' }}>{isNew(me.updated_rutina) && <Pill k="new">Actualizada</Pill>} Última actualización: {fmtStamp(me.updated_rutina)}</span></div>
            {routine.days.length ? <div className="cols">{routine.days.map((day) => (
              <article className="daycard" key={day.day}>
                <div className="daycard-h"><h3>{day.day}</h3><span className="muted">{day.focus}</span></div>
                {day.exercises.map((e, i) => (
                  <div className="ex" key={i}><span className="n">{e.name}</span><span className="sr">{e.sets} × {e.reps}</span>
                    {(e.rest || e.notes) && <span className="nt">{e.rest ? `Descanso ${e.rest}` : ''}{e.rest && e.notes ? ' · ' : ''}{e.notes}</span>}
                    {libId(e.name) && <span className="nt"><Link className="link-btn" href={`/mi-panel?ver=ejercicios&ej=${libId(e.name)}`}>Ver técnica y animación</Link></span>}</div>))}
              </article>))}</div> : <p className="empty">Tu entrenadora todavía no cargó la rutina.</p>}
          </>)}

          {ver === 'dieta' && (
            <section className="panel">
              <div className="panel-head"><h2>Mi dieta</h2><span className="muted" style={{ fontSize: '.85rem' }}>{isNew(me.updated_dieta) && <Pill k="new">Actualizada</Pill>} Última actualización: {fmtStamp(me.updated_dieta)}</span></div>
              <div className="kpis">
                <div className="kpi"><span className="label">Calorías por día</span><span className="v">{diet.kcal || '—'} <small style={{ fontSize: '1rem' }}>kcal</small></span></div>
                <div className="kpi"><span className="label">Proteína por día</span><span className="v">{diet.protein || '—'} <small style={{ fontSize: '1rem' }}>g</small></span></div>
              </div>
              <div className="list">{diet.meals.map((m, i) => (
                <div className="row" key={i} style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                  <div style={{ minWidth: 0 }}><div className="t">{m.name}</div><div className="muted">{m.items}</div></div>
                  <span className="num" style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--accent)' }}>{m.time}</span>
                </div>))}
                {!diet.meals.length && <p className="empty">Tu entrenadora todavía no cargó la dieta.</p>}</div>
              {diet.notes && <p className="demo-note">{diet.notes}</p>}
            </section>)}

          {ver === 'ejercicios' && (
            <section className="panel">
              <div className="panel-head"><div><h2>Ejercicios</h2><p className="muted" style={{ marginTop: '.2rem' }}>Cómo se hace cada ejercicio de tu rutina, con animación, técnica y errores a evitar.</p></div></div>
              <ExerciseLibrary exercises={library} initialId={searchParams.ej} />
            </section>)}

          {ver === 'cuenta' && <PasswordForm back="/mi-panel?ver=cuenta" username={me.username} sp={searchParams} />}

          {ver === 'cuota' && (
            <div className="cols">
              <section className="panel"><h2>Mi cuota</h2><div className="list">
                <div className="row"><span>Estado</span><Pill k={st.k}>{st.t}</Pill></div>
                <div className="row"><span>Monto mensual</span><strong className="num">{money(me.fee)}</strong></div>
                {me.next_due && <>
                  <div className="row"><span>Próximo vencimiento</span><strong>{fmtDateLong(me.next_due)}</strong></div>
                  <div className="row"><span>Te avisamos por WhatsApp</span><span>{fmtDateLong(reminderDate(me.next_due, holidays))}</span></div></>}
              </div></section>
              <section className="panel"><h2>Mis pagos</h2><div className="list">
                {(pays || []).map((p: any) => (
                  <div className="row" key={p.id}><span>{monthLabel(monthKey(p.paid_on))}<br /><span className="muted" style={{ fontSize: '.82rem' }}>{fmtDate(p.paid_on)} · {p.method}</span></span><span className="num">{money(p.amount)}</span></div>))}
                {!(pays || []).length && <p className="empty">Sin pagos registrados.</p>}
              </div></section>
            </div>)}
        </main>
      </div>
    </>
  );
}
