'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServiceClient, requireAdmin } from '@/lib/supabase/server';
import { usernameToEmail } from '@/lib/auth';
import { addMonth, fmtDateLong, monthKey } from '@/lib/dates';
import { notifyUpdate, runReminders, sendPaymentReceipt, sendWelcome } from '@/lib/whatsapp';
import type { Diet, Routine } from '@/lib/types';

const back = (path: string, msg: string, kind: 'ok' | 'error' = 'ok') =>
  redirect(`${path}${path.includes('?') ? '&' : '?'}${kind}=${encodeURIComponent(msg)}`);
const plural = (n: number) => `${n} ${n === 1 ? 'alumna' : 'alumnas'}`;

/* ---------- Alumnas ---------- */
export async function saveStudent(formData: FormData) {
  await requireAdmin();
  const db = createServiceClient();
  const id = String(formData.get('id') || '');
  const username = String(formData.get('username') || '').trim().toLowerCase();
  const pass = String(formData.get('pass') || '');
  const fields = {
    full_name: String(formData.get('full_name') || '').trim(),
    username,
    phone: String(formData.get('phone') || '').trim(),
    plan: String(formData.get('plan') || '').trim(),
    fee: Number(formData.get('fee') || 0),
    next_due: String(formData.get('next_due') || '') || null,
    active: formData.get('active') === 'on',
  };
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) back('/admin/alumnas', 'El usuario debe tener de 3 a 30 letras o números, sin espacios.', 'error');

  if (pass && pass.length < 6) back(id ? `/admin/alumnas?editar=${id}` : '/admin/alumnas', 'La contraseña tiene que tener al menos 6 caracteres.', 'error');

  if (id) {
    const { data: prev } = await db.from('profiles').select('role, username, next_due').eq('id', id).single();
    if (!prev || prev.role !== 'alumna') back('/admin/alumnas', 'No se encontró la alumna.', 'error');
    const patch: any = { ...fields };
    if (prev.next_due !== fields.next_due) patch.reminder_sent_for = null;
    // Primero el acceso (usuario, contraseña, pausa): si falla, no se toca el perfil y no quedan desincronizados.
    // Pausar bloquea la cuenta en Supabase: se corta la sesión abierta y no puede volver a ingresar.
    const authPatch: any = { email: usernameToEmail(username), ban_duration: fields.active ? 'none' : '876000h' };
    if (pass) authPatch.password = pass;
    const { error: authErr } = await db.auth.admin.updateUserById(id, authPatch);
    if (authErr) back(`/admin/alumnas?editar=${id}`, /already|exists|registered/i.test(authErr.message) ? 'Ese usuario ya existe. Elegí otro.' : 'No se pudo actualizar el acceso: ' + authErr.message, 'error');
    const { error } = await db.from('profiles').update(patch).eq('id', id);
    if (error) {
      // Se vuelve el usuario de acceso al anterior para que siga pudiendo ingresar.
      if (prev.username !== username) await db.auth.admin.updateUserById(id, { email: usernameToEmail(prev.username) });
      back('/admin/alumnas', error.code === '23505' ? 'Ese usuario ya existe. Elegí otro.' : 'No se pudo guardar: ' + error.message, 'error');
    }
    revalidatePath('/admin', 'layout');
    back('/admin/alumnas', 'Datos de la alumna guardados.');
  }

  if (!pass) back('/admin/alumnas', 'La contraseña tiene que tener al menos 6 caracteres.', 'error');
  const { data: created, error: authErr } = await db.auth.admin.createUser({ email: usernameToEmail(username), password: pass, email_confirm: true, ban_duration: fields.active ? 'none' : '876000h' } as any);
  if (authErr || !created.user) back('/admin/alumnas', authErr?.message?.includes('already') ? 'Ese usuario ya existe. Elegí otro.' : 'No se pudo crear el acceso: ' + authErr?.message, 'error');
  const newId = created.user.id;
  const { error } = await db.from('profiles').insert({ id: newId, role: 'alumna', ...fields });
  if (error) { await db.auth.admin.deleteUser(newId); back('/admin/alumnas', 'No se pudo crear la alumna: ' + error.message, 'error'); }
  await db.from('routines').insert({ student_id: newId });
  await db.from('diets').insert({ student_id: newId });
  await sendWelcome({ id: newId, phone: fields.phone, full_name: fields.full_name, username });
  revalidatePath('/admin', 'layout');
  back('/admin/alumnas', 'Alumna creada. Le enviamos sus datos de acceso por WhatsApp.');
}

/* ---------- Calendario ---------- */
export async function addSlot(formData: FormData) {
  await requireAdmin();
  const db = createServiceClient();
  const forAll = formData.get('for_all') === 'on';
  const students = formData.getAll('students').map(String);
  const start = String(formData.get('start_time')), end = String(formData.get('end_time'));
  if (!forAll && !students.length) back('/admin/calendario', 'Elegí al menos una alumna o marcá "Todas".', 'error');
  if (end <= start) back('/admin/calendario', 'La hora de fin tiene que ser posterior a la de inicio.', 'error');
  const { data: slot, error } = await db.from('slots').insert({
    day: Number(formData.get('day')), start_time: start, end_time: end, title: String(formData.get('title')).trim(), for_all: forAll,
  }).select('id').single();
  if (error) back('/admin/calendario', 'No se pudo guardar el horario: ' + error.message, 'error');
  if (!forAll) await db.from('slot_students').insert(students.map((s) => ({ slot_id: slot.id, student_id: s })));
  const ids = forAll ? await activeIds() : students;
  const sent = await notifyUpdate(ids, 'calendario');
  revalidatePath('/admin/calendario');
  back('/admin/calendario', `Horario agregado. WhatsApp enviado a ${plural(sent)}.`);
}

export async function deleteSlot(formData: FormData) {
  await requireAdmin();
  const db = createServiceClient();
  const id = String(formData.get('id'));
  const { data: slot } = await db.from('slots').select('for_all, slot_students(student_id)').eq('id', id).single();
  await db.from('slots').delete().eq('id', id);
  const ids = slot?.for_all ? await activeIds() : (slot?.slot_students || []).map((x: any) => x.student_id);
  const sent = await notifyUpdate(ids, 'calendario');
  revalidatePath('/admin/calendario');
  back('/admin/calendario', `Horario quitado. WhatsApp enviado a ${plural(sent)}.`);
}

async function activeIds() {
  const { data } = await createServiceClient().from('profiles').select('id').eq('role', 'alumna').eq('active', true);
  return (data || []).map((x: any) => x.id as string);
}

/* ---------- Rutinas y dietas (las llaman los editores) ---------- */
export async function saveRoutine(studentIds: string[], routine: Routine) {
  await requireAdmin();
  const db = createServiceClient();
  const clean: Routine = { days: routine.days.map((d) => ({ ...d, exercises: d.exercises.filter((e) => e.name.trim()) })) };
  const now = new Date().toISOString();
  const { error } = await db.from('routines').upsert(studentIds.map((id) => ({ student_id: id, data: clean, updated_at: now })));
  if (error) return { ok: false, message: 'No se pudo guardar: ' + error.message };
  const sent = await notifyUpdate(studentIds, 'rutina');
  revalidatePath('/admin/rutinas');
  return { ok: true, message: `Rutina guardada para ${plural(studentIds.length)}. WhatsApp enviado a ${plural(sent)}.` };
}

export async function saveDiet(studentIds: string[], diet: Diet) {
  await requireAdmin();
  const db = createServiceClient();
  const clean: Diet = { ...diet, meals: [...diet.meals].sort((a, b) => (a.time || '').localeCompare(b.time || '')) };
  const now = new Date().toISOString();
  const { error } = await db.from('diets').upsert(studentIds.map((id) => ({ student_id: id, data: clean, updated_at: now })));
  if (error) return { ok: false, message: 'No se pudo guardar: ' + error.message };
  const sent = await notifyUpdate(studentIds, 'dieta');
  revalidatePath('/admin/dietas');
  return { ok: true, message: `Dieta guardada para ${plural(studentIds.length)}. WhatsApp enviado a ${plural(sent)}.` };
}

/* ---------- Ganancias ---------- */
export async function registerPayment(formData: FormData) {
  await requireAdmin();
  const db = createServiceClient();
  const studentId = String(formData.get('student_id'));
  const { data: s } = await db.from('profiles').select('*').eq('id', studentId).single();
  if (!s) back('/admin/ganancias', 'No se encontró la alumna.', 'error');
  const amount = Number(formData.get('amount')) || s.fee;
  const paidOn = String(formData.get('paid_on'));
  const { error } = await db.from('payments').insert({ student_id: studentId, amount, paid_on: paidOn, method: String(formData.get('method')) });
  if (error) back('/admin/ganancias', 'No se pudo registrar el pago: ' + error.message, 'error');
  const nextDue = addMonth(s.next_due || paidOn);
  await db.from('profiles').update({ next_due: nextDue, reminder_sent_for: null }).eq('id', studentId);
  await sendPaymentReceipt(s, amount, nextDue);
  revalidatePath('/admin', 'layout');
  back(`/admin/ganancias?mes=${monthKey(paidOn)}`, `Pago de ${s.full_name.split(' ')[0]} registrado. Próximo vencimiento: ${fmtDateLong(nextDue)}.`);
}

export async function deletePayment(formData: FormData) {
  await requireAdmin();
  await createServiceClient().from('payments').delete().eq('id', String(formData.get('id')));
  revalidatePath('/admin/ganancias');
  back(`/admin/ganancias?mes=${formData.get('mes')}`, 'Pago borrado. Si hace falta, corregí el vencimiento de la alumna en Alumnas.');
}

/* ---------- Avisos ---------- */
export async function sendRemindersNow() {
  await requireAdmin();
  const n = await runReminders();
  revalidatePath('/admin/avisos');
  back('/admin/avisos', n ? `Se enviaron ${n} recordatorios.` : 'No hay recordatorios pendientes para hoy.');
}

/* ---------- Biblioteca de ejercicios ---------- */
const MEDIA_TYPES: Record<string, string> = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'image/gif': 'gif', 'image/webp': 'webp', 'image/png': 'png' };

/** Devuelve una URL firmada para que el navegador suba la animación directo a Storage (sin límite de tamaño de Vercel). */
export async function getExerciseUploadUrl(contentType: string) {
  await requireAdmin();
  const ext = MEDIA_TYPES[contentType];
  if (!ext) return { ok: false as const, message: 'Formato no admitido. Usá MP4, WebM, GIF, WebP o PNG.' };
  const path = `${crypto.randomUUID()}.${ext}`;
  const { data, error } = await createServiceClient().storage.from('ejercicios').createSignedUploadUrl(path);
  if (error) return { ok: false as const, message: 'No se pudo preparar la subida: ' + error.message };
  return { ok: true as const, path, token: data.token };
}

export type ExerciseInput = {
  id?: string; name: string; zone: string; muscles: string; equipment: string; level: string;
  steps: string[]; mistakes: string[]; media_path: string | null; media_type: 'video' | 'image' | null;
};

export async function saveExercise(input: ExerciseInput) {
  await requireAdmin();
  const db = createServiceClient();
  const row = {
    name: input.name.trim(), zone: input.zone, muscles: input.muscles.trim(), equipment: input.equipment.trim(), level: input.level,
    steps: input.steps.map((s) => s.trim()).filter(Boolean), mistakes: input.mistakes.map((s) => s.trim()).filter(Boolean),
    media_path: input.media_path, media_type: input.media_type, updated_at: new Date().toISOString(),
  };
  if (!row.name || !row.steps.length) return { ok: false, message: 'Completá el nombre y al menos un paso de la técnica.' };

  if (input.id) {
    const { data: prev } = await db.from('exercises').select('name, media_path').eq('id', input.id).single();
    const { error } = await db.from('exercises').update(row).eq('id', input.id);
    if (error) return { ok: false, message: error.code === '23505' ? 'Ya hay un ejercicio con ese nombre.' : 'No se pudo guardar: ' + error.message };
    if (prev?.media_path && prev.media_path !== row.media_path) await db.storage.from('ejercicios').remove([prev.media_path]);
    // Si cambió el nombre, se actualiza en las rutinas para no perder el vínculo con la ficha
    if (prev && prev.name !== row.name) {
      const { data: rs } = await db.from('routines').select('student_id, data');
      for (const r of rs || []) {
        let changed = false;
        const data = r.data as Routine;
        data.days?.forEach((d) => d.exercises.forEach((e) => { if (e.name.trim().toLowerCase() === prev.name.trim().toLowerCase()) { e.name = row.name; changed = true; } }));
        if (changed) await db.from('routines').update({ data }).eq('student_id', r.student_id);
      }
    }
  } else {
    const { error } = await db.from('exercises').insert(row);
    if (error) return { ok: false, message: error.code === '23505' ? 'Ya hay un ejercicio con ese nombre.' : 'No se pudo guardar: ' + error.message };
  }
  revalidatePath('/admin/ejercicios');
  revalidatePath('/mi-panel');
  return { ok: true, message: input.id ? 'Ejercicio actualizado.' : 'Ejercicio agregado a la biblioteca.' };
}

export async function deleteExercise(id: string) {
  await requireAdmin();
  const db = createServiceClient();
  const { data: prev } = await db.from('exercises').select('media_path').eq('id', id).single();
  await db.from('exercises').delete().eq('id', id);
  if (prev?.media_path) await db.storage.from('ejercicios').remove([prev.media_path]);
  revalidatePath('/admin/ejercicios');
  return { ok: true, message: 'Ejercicio borrado.' };
}
