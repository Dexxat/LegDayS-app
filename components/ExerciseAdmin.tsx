'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LEVELS, ZONES, type LibExercise } from '@/lib/types';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { deleteExercise, getExerciseUploadUrl, saveExercise } from '@/app/admin/actions';
import { ExerciseMedia, ExerciseModal } from './ExerciseLibrary';
import Pill from './Pill';

type Media = { path: string | null; type: 'video' | 'image' | null; url: string | null };

function ExerciseForm({ ex, onDone }: { ex?: LibExercise; onDone: (msg: { ok: boolean; message: string }) => void }) {
  const [media, setMedia] = useState<Media>({ path: ex?.media_path ?? null, type: ex?.media_type ?? null, url: ex?.media_url ?? null });
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();

  const pick = (f: File | undefined) => {
    setErr('');
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) { setErr('El archivo pesa más de 50 MB. Exportalo más corto o con menor resolución.'); return; }
    setFile(f);
    setMedia({ path: null, type: f.type.startsWith('video') ? 'video' : 'image', url: URL.createObjectURL(f) });
  };

  const submit = (fd: FormData) => start(async () => {
    setErr('');
    let { path, type } = media;
    if (file) {
      const up = await getExerciseUploadUrl(file.type);
      if (!up.ok) { setErr(up.message); return; }
      const { error } = await createBrowserSupabase().storage.from('ejercicios').uploadToSignedUrl(up.path, up.token, file, { contentType: file.type });
      if (error) { setErr('No se pudo subir la animación: ' + error.message); return; }
      path = up.path;
    }
    const lines = (k: string) => String(fd.get(k) || '').split('\n');
    const r = await saveExercise({
      id: ex?.id, name: String(fd.get('name')), zone: String(fd.get('zone')), muscles: String(fd.get('muscles')),
      equipment: String(fd.get('equipment')), level: String(fd.get('level')), steps: lines('steps'), mistakes: lines('mistakes'),
      media_path: path, media_type: path ? type : null,
    });
    if (!r.ok) { setErr(r.message); return; }
    onDone(r);
  });

  return (
    <form className="panel" action={submit}>
      <div className="panel-head"><h3>{ex ? `Editar ${ex.name}` : 'Nuevo ejercicio'}</h3><button type="button" className="btn ghost sm" onClick={() => onDone({ ok: true, message: '' })}>Cancelar</button></div>
      {err && <p className="flash error" role="alert">{err}</p>}
      <div className="grid-form">
        <label className="field"><span>Nombre del ejercicio</span><input className="input" name="name" defaultValue={ex?.name} required /></label>
        <label className="field"><span>Zona que trabaja</span><select className="input" name="zone" defaultValue={ex?.zone ?? ZONES[0]}>{ZONES.map((z) => <option key={z}>{z}</option>)}</select></label>
        <label className="field"><span>Músculos</span><input className="input" name="muscles" defaultValue={ex?.muscles} placeholder="Glúteo mayor, femorales" /></label>
        <label className="field"><span>Equipo</span><input className="input" name="equipment" defaultValue={ex?.equipment} placeholder="Barra, banco" /></label>
        <label className="field"><span>Nivel</span><select className="input" name="level" defaultValue={ex?.level ?? LEVELS[0]}>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select></label>
      </div>
      <div className="grid-form" style={{ alignItems: 'start' }}>
        <label className="field"><span>Técnica (un paso por línea)</span><textarea className="input" name="steps" rows={6} defaultValue={ex?.steps.join('\n')} required /></label>
        <label className="field"><span>Errores comunes (uno por línea)</span><textarea className="input" name="mistakes" rows={6} defaultValue={ex?.mistakes.join('\n')} /></label>
      </div>
      <div className="field"><span>Animación</span>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="media-prev"><ExerciseMedia ex={{ name: ex?.name || 'ejercicio', media_type: media.type, media_url: media.url }} thumb /></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', minWidth: 0 }}>
            <input type="file" accept="video/mp4,video/webm,image/gif,image/webp,image/png" aria-label="Subir animación" onChange={(e) => pick(e.target.files?.[0])} />
            <span className="muted" style={{ fontSize: '.8rem' }}>MP4, WebM, GIF o WebP, hasta 50 MB. Ideal: cuadrada, de 3 a 6 segundos, en loop y sin sonido.</span>
            {media.url && <div><button type="button" className="btn ghost sm" onClick={() => { setFile(null); setMedia({ path: null, type: null, url: null }); }}>Quitar animación</button></div>}
          </div>
        </div>
      </div>
      <div><button className="btn primary" type="submit" disabled={pending}>{pending ? (file ? 'Subiendo animación…' : 'Guardando…') : ex ? 'Guardar cambios' : 'Agregar a la biblioteca'}</button></div>
    </form>
  );
}

export default function ExerciseAdmin({ exercises }: { exercises: LibExercise[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<'list' | 'new' | string>('list');
  const [view, setView] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [, start] = useTransition();
  const editing = exercises.find((e) => e.id === mode);
  const done = (m: { ok: boolean; message: string }) => { setMode('list'); if (m.message) setMsg(m); router.refresh(); };

  return (
    <>
      <div className="page-head">
        <div><h1>Ejercicios</h1><p className="muted">La biblioteca que ven las alumnas. Si el nombre coincide con un ejercicio de la rutina, la alumna abre la ficha desde ahí.</p></div>
        <button className="btn primary" onClick={() => { setMode('new'); setMsg(null); }}>+ Nuevo ejercicio</button>
      </div>
      {msg && <p className={`flash ${msg.ok ? '' : 'error'}`} role="status">{msg.message}</p>}
      {mode === 'new' && <ExerciseForm onDone={done} />}
      {editing && <ExerciseForm key={editing.id} ex={editing} onDone={done} />}
      <section className="panel"><div className="tbl-wrap"><table>
        <thead><tr><th>Ejercicio</th><th>Zona</th><th>Equipo</th><th>Animación</th><th /></tr></thead>
        <tbody>
          {exercises.map((e) => (
            <tr key={e.id}>
              <td><strong>{e.name}</strong></td><td>{e.zone}</td><td className="muted">{e.equipment}</td>
              <td>{e.media_url ? <Pill k="ok">Subida</Pill> : <Pill k="warn">Pendiente</Pill>}</td>
              <td className="r" style={{ whiteSpace: 'nowrap' }}>
                <button className="btn sm" onClick={() => setView(e.id)}>Ver</button>{' '}
                <button className="btn sm" onClick={() => { setMode(e.id); setMsg(null); }}>Editar</button>{' '}
                {confirm === e.id
                  ? <button className="btn sm" style={{ color: 'var(--bad)' }} onClick={() => start(async () => { setMsg(await deleteExercise(e.id)); setConfirm(null); router.refresh(); })}>Confirmar borrado</button>
                  : <button className="btn icon" aria-label={`Borrar ${e.name}`} onClick={() => setConfirm(e.id)}>×</button>}
              </td>
            </tr>
          ))}
          {!exercises.length && <tr><td colSpan={5} className="empty">Todavía no hay ejercicios. Empezá con “Nuevo ejercicio”.</td></tr>}
        </tbody>
      </table></div></section>
      {view && exercises.find((e) => e.id === view) && <ExerciseModal ex={exercises.find((e) => e.id === view)!} onClose={() => setView(null)} />}
    </>
  );
}
