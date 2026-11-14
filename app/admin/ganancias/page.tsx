import Pill from '@/components/Pill';
import Flash from '@/components/Flash';
import { createClient, type Profile } from '@/lib/supabase/server';
import { loadHolidays } from '@/lib/whatsapp';
import { MONTHS, cuotaStatus, fmtDate, money, monthKey, monthLabel, todayAR } from '@/lib/dates';
import { deletePayment, registerPayment } from '../actions';

const pad = (n: number) => String(n).padStart(2, '0');
function monthsBack(k: string, n: number) {
  const [y, m] = k.split('-').map(Number); const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) { const d = new Date(y, m - 1 - i, 1); out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`); }
  return out;
}

function Chart({ months, values, current }: { months: string[]; values: number[]; current: string }) {
  const max = Math.max(...values, 1), W = 560, H = 200, top = 24, bot = 26, bw = 56, gap = (W - months.length * bw) / (months.length + 1);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Cobrado por mes, últimos 6 meses">
      <line className="grid" x1={0} x2={W} y1={H - bot} y2={H - bot} />
      {months.map((m, i) => {
        const X = gap + i * (bw + gap), bh = (H - top - bot) * values[i] / max, Y = H - bot - bh;
        return (<g key={m}>
          <rect className={`bar ${m === current ? 'cur' : ''}`} x={X} y={Y} width={bw} height={Math.max(bh, 1)} rx={4} />
          <text className="val" x={X + bw / 2} y={Y - 6} textAnchor="middle">{values[i] ? '$' + Math.round(values[i] / 1000) + 'k' : '—'}</text>
          <text x={X + bw / 2} y={H - 8} textAnchor="middle">{MONTHS[+m.slice(5) - 1]}</text>
        </g>);
      })}
    </svg>
  );
}

export default async function Ganancias({ searchParams }: { searchParams: { mes?: string; ok?: string; error?: string } }) {
  const supabase = createClient();
  const k = /^\d{4}-\d{2}$/.test(searchParams.mes || '') ? searchParams.mes! : monthKey(todayAR());
  const months = monthsBack(k, 6);
  const year = k.slice(0, 4);
  const [{ data: st }, { data: pays }, holidays] = await Promise.all([
    supabase.from('profiles').select('*').eq('role', 'alumna').eq('active', true).order('full_name'),
    supabase.from('payments').select('*').gte('paid_on', `${Math.min(+year, +months[0].slice(0, 4))}-01-01`).order('paid_on', { ascending: false }),
    loadHolidays(),
  ]);
  const students = (st || []) as Profile[];
  const all = pays || [];
  const inMonth = all.filter((p: any) => monthKey(p.paid_on) === k);
  const total = inMonth.reduce((a: number, p: any) => a + p.amount, 0);
  const paidIds = new Set(inMonth.map((p: any) => p.student_id));
  const pending = students.filter((s) => !paidIds.has(s.id));
  const expected = students.reduce((a, s) => a + s.fee, 0);
  const ytd = all.filter((p: any) => p.paid_on.startsWith(year)).reduce((a: number, p: any) => a + p.amount, 0);
  const values = months.map((m) => all.filter((p: any) => monthKey(p.paid_on) === m).reduce((a: number, p: any) => a + p.amount, 0));
  const byMethod: Record<string, number> = {};
  inMonth.forEach((p: any) => { byMethod[p.method] = (byMethod[p.method] || 0) + p.amount; });
  const name = (id: string) => students.find((s) => s.id === id)?.full_name || 'Alumna dada de baja';
  const monthOptions = monthsBack(monthKey(todayAR()), 18).reverse();

  return (
    <>
      <div className="page-head">
        <div><h1>Ganancias</h1><p className="muted">Contaduría de las cuotas mensuales.</p></div>
        <form style={{ display: 'flex', gap: '.6rem', alignItems: 'end', flexWrap: 'wrap' }}>
          <label className="field"><span>Mes</span>
            <select className="input" name="mes" defaultValue={k}>{monthOptions.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select></label>
          <button className="btn" type="submit">Ver</button>
          <a className="btn" href={`/api/admin/pagos-csv?mes=${k}`}>Exportar CSV</a>
        </form>
      </div>
      <Flash sp={searchParams} />
      <div className="kpis">
        <div className="kpi"><span className="label">Cobrado en el mes</span><span className="v">{money(total)}</span><span className="s">{inMonth.length} pagos</span></div>
        <div className="kpi"><span className="label">Esperado</span><span className="v">{money(expected)}</span><span className="s">suma de cuotas activas</span></div>
        <div className="kpi"><span className="label">Falta cobrar</span><span className="v">{money(pending.reduce((a, s) => a + s.fee, 0))}</span><span className="s">{pending.length} alumnas sin pago</span></div>
        <div className="kpi"><span className="label">Acumulado {year}</span><span className="v">{money(ytd)}</span><span className="s">enero a la fecha</span></div>
      </div>
      <div className="cols">
        <section className="panel"><h2>Últimos 6 meses</h2><Chart months={months} values={values} current={k} />
          <div className="list">{Object.entries(byMethod).map(([m, v]) => <div className="row" key={m}><span>{m}</span><span className="num">{money(v)}</span></div>)}
            {!inMonth.length && <p className="empty">Sin pagos en este mes.</p>}</div></section>
        <form className="panel" action={registerPayment}>
          <h2>Registrar pago</h2>
          <div className="grid-form">
            <label className="field"><span>Alumna</span><select className="input" name="student_id" defaultValue={pending[0]?.id}>{students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select></label>
            <label className="field"><span>Monto ($)</span><input className="input num" name="amount" type="number" min={0} step={500} placeholder="Cuota de la alumna" /></label>
            <label className="field"><span>Fecha</span><input className="input" name="paid_on" type="date" defaultValue={todayAR()} required /></label>
            <label className="field"><span>Medio</span><select className="input" name="method"><option>Transferencia</option><option>Efectivo</option><option>Mercado Pago</option></select></label>
          </div>
          <p className="muted" style={{ fontSize: '.82rem' }}>Al registrarlo, el próximo vencimiento se corre un mes y la alumna recibe la confirmación por WhatsApp.</p>
          <div><button className="btn primary" type="submit">Registrar pago</button></div>
          {pending.length > 0 && <div className="list"><span className="label">Sin pago en {monthLabel(k)}</span>
            {pending.map((s) => { const c = cuotaStatus(s.next_due, holidays); return (
              <div className="row" key={s.id}><span>{s.full_name}</span><span style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}><span className="num muted">{money(s.fee)}</span><Pill k={c.k}>{c.t}</Pill></span></div>); })}
          </div>}
        </form>
      </div>
      <section className="panel"><h2>Pagos de {monthLabel(k)}</h2><div className="tbl-wrap"><table>
        <thead><tr><th>Fecha</th><th>Alumna</th><th>Medio</th><th className="r">Monto</th><th></th></tr></thead>
        <tbody>
          {inMonth.map((p: any) => (
            <tr key={p.id}><td className="num">{fmtDate(p.paid_on)}</td><td>{name(p.student_id)}</td><td className="muted">{p.method}</td><td className="r num">{money(p.amount)}</td>
              <td className="r"><form action={deletePayment}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="mes" value={k} /><button className="btn icon" aria-label="Borrar pago">×</button></form></td></tr>))}
          {inMonth.length ? <tr><td colSpan={3}><strong>Total</strong></td><td className="r num"><strong>{money(total)}</strong></td><td /></tr>
            : <tr><td colSpan={5} className="empty">No hay pagos registrados en este mes.</td></tr>}
        </tbody></table></div></section>
    </>
  );
}
