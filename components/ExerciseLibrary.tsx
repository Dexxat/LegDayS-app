'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { LibExercise } from '@/lib/types';

export function ExerciseMedia({ ex, thumb }: { ex: Pick<LibExercise, 'name' | 'media_type' | 'media_url'>; thumb?: boolean }) {
  if (!ex.media_url) return <p className="pending">Animación pendiente</p>;
  if (ex.media_type === 'video')
    return <video src={ex.media_url} autoPlay loop muted playsInline preload={thumb ? 'metadata' : 'auto'} controls={!thumb} aria-label={`Animación de ${ex.name}`} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={ex.media_url} alt={`Animación de ${ex.name}`} loading={thumb ? 'lazy' : 'eager'} />;
}

export function ExerciseModal({ ex, onClose }: { ex: LibExercise; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="ex-title">
        <div className="stage"><div className="anim"><ExerciseMedia ex={ex} /></div></div>
        <div className="info">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.8rem', alignItems: 'flex-start' }}>
            <div><span className="zone">{ex.zone}</span><h2 id="ex-title" style={{ marginTop: '.2rem' }}>{ex.name}</h2></div>
            <button ref={closeRef} className="btn sm" onClick={onClose}>Cerrar</button>
          </div>
          <div className="facts">
            <div className="fact"><span className="label">Músculos</span><b>{ex.muscles || '—'}</b></div>
            <div className="fact"><span className="label">Equipo</span><b>{ex.equipment || '—'}</b></div>
            <div className="fact"><span className="label">Nivel</span><b>{ex.level || '—'}</b></div>
          </div>
          <div><span className="label">Técnica paso a paso</span><ol className="steps" style={{ marginTop: '.5rem' }}>{ex.steps.map((s, i) => <li key={i}>{s}</li>)}</ol></div>
          {ex.mistakes.length > 0 && <div><span className="label">Errores comunes</span><ul className="mistakes" style={{ marginTop: '.5rem' }}>{ex.mistakes.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
        </div>
      </div>
    </div>
  );
}

/** Biblioteca para las alumnas: buscador, filtro por zona y ficha con animación. */
export default function ExerciseLibrary({ exercises, initialId }: { exercises: LibExercise[]; initialId?: string }) {
  const [q, setQ] = useState('');
  const [zone, setZone] = useState('');
  const [open, setOpen] = useState<string | null>(initialId && exercises.some((e) => e.id === initialId) ? initialId : null);
  const zones = useMemo(() => Array.from(new Set(exercises.map((e) => e.zone))), [exercises]);
  const list = exercises.filter((e) => (!zone || e.zone === zone) && (!q || e.name.toLowerCase().includes(q.trim().toLowerCase())));
  const current = exercises.find((e) => e.id === open);

  return (
    <>
      <div className="search-row">
        <input className="input" type="search" placeholder="Buscar ejercicio" aria-label="Buscar ejercicio" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="chips">
          <button className="chip" aria-pressed={!zone} onClick={() => setZone('')}>Todas</button>
          {zones.map((z) => <button key={z} className="chip" aria-pressed={zone === z} onClick={() => setZone(z)}>{z}</button>)}
        </div>
      </div>
      <div className="ex-grid">
        {list.map((e) => (
          <button key={e.id} className="ex-card" onClick={() => setOpen(e.id)}>
            <div className="thumb"><ExerciseMedia ex={e} thumb /></div>
            <div className="body"><span className="zone">{e.zone}</span><span className="nm">{e.name}</span><span className="muted" style={{ fontSize: '.8rem' }}>{e.equipment}</span></div>
          </button>
        ))}
      </div>
      {!list.length && <p className="empty">{exercises.length ? 'No hay ejercicios con ese filtro.' : 'Tu entrenadora todavía no cargó ejercicios.'}</p>}
      {current && <ExerciseModal ex={current} onClose={() => setOpen(null)} />}
    </>
  );
}
