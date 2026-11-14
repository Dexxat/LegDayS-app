export type Exercise = { name: string; sets: string; reps: string; rest: string; notes: string };
export type RoutineDay = { day: string; focus: string; exercises: Exercise[] };
export type Routine = { days: RoutineDay[] };
export type Meal = { name: string; time: string; items: string };
export type Diet = { kcal: string; protein: string; notes: string; meals: Meal[] };

export const emptyRoutine = (): Routine => ({ days: [] });
export const emptyDiet = (): Diet => ({ kcal: '', protein: '', notes: '', meals: [] });

export const ZONES = ['Glúteos', 'Cuádriceps', 'Femorales', 'Aductores y abductores', 'Espalda', 'Hombros', 'Pecho', 'Brazos', 'Core'];
export const LEVELS = ['Principiante', 'Intermedio', 'Avanzado'];

/** Ejercicio de la biblioteca, con la URL pública de su animación ya resuelta. */
export type LibExercise = {
  id: string; name: string; zone: string; muscles: string; equipment: string; level: string;
  steps: string[]; mistakes: string[]; media_path: string | null; media_type: 'video' | 'image' | null; media_url: string | null;
};

export function mediaUrl(path: string | null) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/ejercicios/${path}`;
}

export function toLibExercise(r: any): LibExercise {
  return {
    id: r.id, name: r.name, zone: r.zone, muscles: r.muscles || '', equipment: r.equipment || '', level: r.level || '',
    steps: r.steps || [], mistakes: r.mistakes || [], media_path: r.media_path, media_type: r.media_type, media_url: mediaUrl(r.media_path),
  };
}
