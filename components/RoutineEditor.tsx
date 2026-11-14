'use client';
import { useEffect, useState, useTransition } from 'react';
import { DAYS } from '@/lib/dates';
import type { Routine } from '@/lib/types';
import { saveRoutine } from '@/app/admin/actions';

type S = { id: string; full_name: string; updated: string };

export default function RoutineEditor({ students, routines, exerciseNames = [] }: { students: S[]; routines: Record<string, Routine>; exerciseNames?: string[] }) {
  const [sid, setSid] = useState(students[0]?.id);
  const [draft, setDraft] = useState<Routine>(() => structuredClone(routines[students[0]?.id] || { days: [] }));
  const [dayIdx, setDayIdx] = useState(0);
  const [applyTo, setApplyTo] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => { setDraft(structuredClone(routines[sid] || { days: [] })); setDayIdx(0); setApplyTo([]); }, [sid, routines]);
  if (!sid) return <p className="empty">Primero cargá una alumna activa.</p>;

  const day = draft.days[dayIdx];
  const upd = (fn: (r: Routine) => void) => setDraft((r) => { const c = structuredClone(r); fn(c); return c; });
  const setEx = (i: number, f: string, v: string) => upd((r) => { (r.days[dayIdx].exercises[i] as any)[f] = v; });

  const save = () => start(async () => {
    const r = await saveRoutine([sid, ...applyTo], draft);
    setMsg(r); if (r.ok) setApplyTo([]);
  });

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

      <div className="tabs">
        {draft.days.map((d, i) => <button key={d.day} className="tab" aria-pressed={i === dayIdx} onClick={() => setDayIdx(i)}>{d.day}</button>)}
        <select className="input" style={{ width: 'auto' }} value="" onChange={(e) => {
          const v = e.target.value; if (!v) return;
          const next = structuredClone(draft);
          next.days.push({ day: v, focus: '', exercises: [] });
          next.days.sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day));
          setDraft(next); setDayIdx(next.days.findIndex((d) => d.day === v));
        }}>
          <option value="">+ Agregar día</option>
          {DAYS.filter((x) => !draft.days.some((d) => d.day === x)).map((x) => <option key={x}>{x}</option>)}
        </select>
      </div>

      {day ? (
        <>
          <div className="grid-form">
            <label className="field"><span>Enfoque del {day.day}</span>
              <input className="input" value={day.focus} onChange={(e) => upd((r) => { r.days[dayIdx].focus = e.target.value; })} /></label>
            <div><button className="btn ghost sm" onClick={() => { upd((r) => { r.days.splice(dayIdx, 1); }); setDayIdx(0); }}>Quitar {day.day} de la rutina</button></div>
          </div>
          <div className="tbl-wrap"><table className="edit-tbl">
            <thead><tr><th>Ejercicio</th><th>Series</th><th>Reps</th><th>Descanso</th><th>Notas</th><th></th></tr></thead>
            <tbody>{day.exercises.map((e, i) => (
              <tr key={i}>
                <td style={{ minWidth: 190 }}><input className="input" aria-label="Ejercicio" list="ex-names" value={e.name} onChange={(ev) => setEx(i, 'name', ev.target.value)} /></td>
                <td><input className="input w-s num" aria-label="Series" value={e.sets} onChange={(ev) => setEx(i, 'sets', ev.target.value)} /></td>
                <td><input className="input w-m num" aria-label="Repeticiones" value={e.reps} onChange={(ev) => setEx(i, 'reps', ev.target.value)} /></td>
                <td><input className="input w-m" aria-label="Descanso" value={e.rest} onChange={(ev) => setEx(i, 'rest', ev.target.value)} /></td>
                <td style={{ minWidth: 180 }}><input className="input" aria-label="Notas" value={e.notes} onChange={(ev) => setEx(i, 'notes', ev.target.value)} /></td>
                <td><button className="btn icon" aria-label="Quitar ejercicio" onClick={() => upd((r) => { r.days[dayIdx].exercises.splice(i, 1); })}>×</button></td>
              </tr>))}
            </tbody></table></div>
          <div style={{ display: 'flex', gap: '.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn sm" onClick={() => upd((r) => { r.days[dayIdx].exercises.push({ name: '', sets: '3', reps: '12', rest: '60 s', notes: '' }); })}>+ Agregar ejercicio</button>
            <span className="muted" style={{ fontSize: '.8rem' }}>Elegí el nombre de la lista para que la alumna pueda abrir la ficha y la animación.</span>
          </div>
          <datalist id="ex-names">{exerciseNames.map((n) => <option key={n} value={n} />)}</datalist>
        </>
      ) : <p className="empty">Agregá un día para empezar.</p>}

      <div className="field"><span>Aplicar los mismos cambios también a</span><div className="checks">
        {students.filter((s) => s.id !== sid).map((s) => (
          <label className="check" key={s.id}><input type="checkbox" checked={applyTo.includes(s.id)}
            onChange={(e) => setApplyTo((a) => e.target.checked ? [...a, s.id] : a.filter((x) => x !== s.id))} /> {s.full_name}</label>))}
      </div></div>
      <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
        <button className="btn primary" disabled={pending} onClick={save}>{pending ? 'Guardando…' : 'Guardar y avisar por WhatsApp'}</button>
        <button className="btn ghost" onClick={() => { setDraft(structuredClone(routines[sid] || { days: [] })); setMsg(null); }}>Descartar cambios</button>
      </div>
    </section>
  );
}
