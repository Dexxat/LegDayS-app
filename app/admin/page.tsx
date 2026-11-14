import Link from 'next/link';
import Pill from '@/components/Pill';
import { createClient, type Profile } from '@/lib/supabase/server';
import { loadHolidays } from '@/lib/whatsapp';
import { DAYS, cuotaStatus, fmtDateLong, money, monthKey, MONTHS_L, monthLabel, todayAR, parse } from '@/lib/dates';

export default async function Resumen() {
  const supabase = createClient();
  const today = todayAR(), mk = monthKey(today);
  const wd = parse(today).getDay(); // 0 domingo
  const [{ data: students }, { data: pays }, { data: slots }, { data: msgs }, holidays] = await Promise.all([
    supabase.from('profiles').select('*').eq('role', 'alumna'),
    supabase.from('payments').select('amount').gte('paid_on', mk + '-01').lte('paid_on', mk + '-31'),
    wd === 0 ? Promise.resolve({ data: [] as any[] }) : supabase.from('slots').select('*, slot_students(student_id)').eq('day', wd).order('start_time'),
    supabase.from('messages').select('id').gte('created_at', today + 'T03:00:00Z'),
    loadHolidays(),
  ]);
  const all = (students || []) as Profile[];
  const active = all.filter((s) => s.active);
  const name = (id: string) => all.find((s) => s.id === id)?.full_name.split(' ')[0];
  const cobrado = (pays || []).reduce((a: number, p: any) => a + p.amount, 0);
  const att = active.map((s) => ({ s, st: cuotaStatus(s.next_due, holidays) })).filter((x) => x.st.k !== 'ok')
    .sort((a, b) => (a.s.next_due || '').localeCompare(b.s.next_due || ''));

  return (
    <>
      <div className="page-head"><div><h1>Resumen</h1><p className="muted">{fmtDateLong(today)} · {monthLabel(mk)}</p></div></div>
      <div className="kpis">
        <div className="kpi"><span className="label">Alumnas activas</span><span className="v">{active.length}</span><span className="s">{all.length - active.length} inactivas</span></div>
        <div className="kpi"><span className="label">Cobrado en {MONTHS_L[+mk.slice(5) - 1]}</span><span className="v">{money(cobrado)}</span><span className="s">{(pays || []).length} pagos registrados</span></div>
        <div className="kpi"><span className="label">Cuotas a revisar</span><span className="v">{att.length}</span><span className="s">por vencer o vencidas</span></div>
        <div className="kpi"><span className="label">WhatsApp hoy</span><span className="v">{(msgs || []).length}</span><span className="s">avisos enviados</span></div>
      </div>
      <div className="cols">
        <section className="panel">
          <div className="panel-head"><h2>Clases de hoy{wd ? ` · ${DAYS[wd - 1]}` : ''}</h2><Link className="btn sm" href="/admin/calendario">Ver semana</Link></div>
          <div className="list">
            {(slots || []).length ? (slots || []).map((c: any) => (
              <div className="row" key={c.id}>
                <div><div className="t">{c.title}</div><div className="muted" style={{ fontSize: '.85rem' }}>{c.for_all ? 'Todas las alumnas' : c.slot_students.map((x: any) => name(x.student_id)).join(', ')}</div></div>
                <span className="num" style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: '1.15rem' }}>{c.start_time.slice(0, 5)}–{c.end_time.slice(0, 5)}</span>
              </div>)) : <p className="empty">No hay clases cargadas para hoy.</p>}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><h2>Cuotas a revisar</h2><Link className="btn sm" href="/admin/ganancias">Registrar pago</Link></div>
          <div className="list">
            {att.length ? att.map(({ s, st }) => (
              <div className="row" key={s.id}>
                <div><div className="t">{s.full_name}</div><div className="muted num" style={{ fontSize: '.85rem' }}>{money(s.fee)} · vence {fmtDateLong(s.next_due!)}</div></div>
                <Pill k={st.k}>{st.t}</Pill>
              </div>)) : <p className="empty">Todas las cuotas están al día.</p>}
          </div>
        </section>
      </div>
    </>
  );
}
