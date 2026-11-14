import ExerciseAdmin from '@/components/ExerciseAdmin';
import { createClient } from '@/lib/supabase/server';
import { toLibExercise } from '@/lib/types';

export default async function Ejercicios() {
  const { data } = await createClient().from('exercises').select('*').order('name');
  return <ExerciseAdmin exercises={(data || []).map(toLibExercise)} />;
}
