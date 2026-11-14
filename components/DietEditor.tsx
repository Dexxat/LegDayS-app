'use client';
import { useEffect, useState, useTransition } from 'react';
import type { Diet } from '@/lib/types';
import { saveDiet } from '@/app/admin/actions';

type S = { id: string; full_name: string; updated: string };
const empty: Diet = { kcal: '', protein: '', notes: '', meals: [] };

export default function DietEditor({ students, diets }: { students: S[]; diets: Record<string, Diet> }) {
  const [sid, setSid] = useState(students[0]?.id);
  const [draft, setDraft] = useState<Diet>(() => structuredClone(diets[students[0]?.id] || empty));
  const [applyTo, setApplyTo] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => { setDraft(structuredClone(diets[sid] || empty)); setApplyTo([]); }, [sid, diets]);
  if (!sid) return <p className="empty">Primero cargá una alumna activa.</p>;

  const upd = (fn: (d: Diet) => void) => setDraft((d) => { const c = structuredClone(d); fn(c); return c; });
  const save = () => start(async () => { const r = await saveDiet([sid, ...applyTo], draft); setMsg(r); if (r.ok) setApplyTo([]); });

  return (
    <section className="panel">
      {msg && <p className={`flash ${msg.ok ? '' : 'error'}`} role="status">{msg.message}</p>}
      <div className="panel-head">
        <label className="field" style={{ maxWidth: 280 }}><span>Alumna</span>
          <select className="input" value={sid} onChange={(e) => { setSid(e.target.value); setMsg(null); }}>
            {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select></label>
        <span className="muted" style={{ fontSize: '.85rem' }}>Última actualización: {students.find((s) => s.id === sid)?.updated}</span>
      </div>
      <div className="grid-form">
        <label className="field"><span>Calorías diarias (kcal)</span><input className="input num" value={draft.kcal} onChange={(e) => upd((d) => { d.kcal = e.target.value; })} /></label>
        <label className="field"><span>Proteína diaria (g)</span><input className="input num" value={draft.protein} onChange={(e) => upd((d) => { d.protein = e.target.value; })} /></label>
      </div>
      <div>{draft.meals.map((m, i) => (
        <div className="meal" key={i}>
          <input className="input" aria-label="Comida" value={m.name} onChange={(e) => upd((d) => { d.meals[i].name = e.target.value; })} />
          <input className="input num" aria-label="Hora" type="time" value={m.time} onChange={(e) => upd((d) => { d.meals[i].time = e.target.value; })} />
          <textarea className="input" aria-label="Detalle" rows={2} value={m.items} onChange={(e) => upd((d) => { d.meals[i].items = e.target.value; })} />
          <button className="btn icon" aria-label="Quitar comida" onClick={() => upd((d) => { d.meals.splice(i, 1); })}>×</button>
        </div>))}
      </div>
      <div><button className="btn sm" onClick={() => upd((d) => { d.meals.push({ name: 'Colación', time: '11:00', items: '' }); })}>+ Agregar comida</button></div>
      <label className="field"><span>Indicaciones generales</span><textarea className="input" rows={2} value={draft.notes} onChange={(e) => upd((d) => { d.notes = e.target.value; })} /></label>
      <div className="field"><span>Aplicar los mismos cambios también a</span><div className="checks">
        {students.filter((s) => s.id !== sid).map((s) => (
          <label className="check" key={s.id}><input type="checkbox" checked={applyTo.includes(s.id)}
            onChange={(e) => setApplyTo((a) => e.target.checked ? [...a, s.id] : a.filter((x) => x !== s.id))} /> {s.full_name}</label>))}
      </div></div>
      <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
        <button className="btn primary" disabled={pending} onClick={save}>{pending ? 'Guardando…' : 'Guardar y avisar por WhatsApp'}</button>
        <button className="btn ghost" onClick={() => { setDraft(structuredClone(diets[sid] || empty)); setMsg(null); }}>Descartar cambios</button>
      </div>
    </section>
  );
}
