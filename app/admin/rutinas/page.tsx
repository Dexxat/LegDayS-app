import RoutineEditor from '@/components/RoutineEditor';
import { createClient } from '@/lib/supabase/server';
import { fmtStamp } from '@/lib/dates';
import type { Routine } from '@/lib/types';

export default async function Rutinas() {
  const supabase = createClient();
  const [{ data: st }, { data: rs }, { data: ex }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, updated_rutina').eq('role', 'alumna').eq('active', true).order('full_name'),
    supabase.from('routines').select('student_id, data'),
    supabase.from('exercises').select('name').order('name'),
  ]);
  const routines: Record<string, Routine> = {};
  (rs || []).forEach((r: any) => { routines[r.student_id] = r.data; });
  const students = (st || []).map((s: any) => ({ id: s.id, full_name: s.full_name, updated: fmtStamp(s.updated_rutina) }));
  return (
    <>
      <div className="page-head"><div><h1>Rutinas</h1><p className="muted">Editá, guardá y la alumna la ve en su perfil al instante.</p></div></div>
      <RoutineEditor students={students} routines={routines} exerciseNames={(ex || []).map((e: any) => e.name)} />
    </>
  );
}
