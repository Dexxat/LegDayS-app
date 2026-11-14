import DietEditor from '@/components/DietEditor';
import { createClient } from '@/lib/supabase/server';
import { fmtStamp } from '@/lib/dates';
import type { Diet } from '@/lib/types';

export default async function Dietas() {
  const supabase = createClient();
  const [{ data: st }, { data: ds }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, updated_dieta').eq('role', 'alumna').eq('active', true).order('full_name'),
    supabase.from('diets').select('student_id, data'),
  ]);
  const diets: Record<string, Diet> = {};
  (ds || []).forEach((d: any) => { diets[d.student_id] = d.data; });
  const students = (st || []).map((s: any) => ({ id: s.id, full_name: s.full_name, updated: fmtStamp(s.updated_dieta) }));
  return (
    <>
      <div className="page-head"><div><h1>Dietas</h1><p className="muted">Plan de alimentación de cada alumna.</p></div></div>
      <DietEditor students={students} diets={diets} />
    </>
  );
}
