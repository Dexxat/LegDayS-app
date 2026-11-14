import { createServiceClient, type Profile } from '@/lib/supabase/server';
import { fmtDateLong, money, reminderDate, todayAR } from '@/lib/dates';

/**
 * Plantillas que hay que crear y aprobar en Meta (WhatsApp Manager > Plantillas de mensajes),
 * categoría "Utilidad", idioma Español (ARG). Las variables {{1}}, {{2}}... van en este orden.
 */
export const TEMPLATES = {
  actualizacion: { name: 'legday_actualizacion', body: (p: string[]) => `Hola ${p[0]}! ${p[1]} en LegDay fue actualizada. Entrá a ${p[2]} para verla.` },
  recordatorio: { name: 'legday_recordatorio_cuota', body: (p: string[]) => `Hola ${p[0]}! Te recordamos que tu cuota de LegDay (${p[1]}) vence el ${p[2]}. ¡Gracias!` },
  pago: { name: 'legday_pago_recibido', body: (p: string[]) => `Hola ${p[0]}! Recibimos tu pago de ${p[1]}. Tu próximo vencimiento es el ${p[2]}. ¡Gracias!` },
  bienvenida: { name: 'legday_bienvenida', body: (p: string[]) => `Hola ${p[0]}! Bienvenida a LegDay. Tu usuario es ${p[1]}. Entrá a ${p[2]} para ver tu rutina, tu dieta y tus horarios.` },
} as const;
type Kind = keyof typeof TEMPLATES;

const site = () => (process.env.NEXT_PUBLIC_SITE_URL || 'https://legday.com.ar').replace(/^https?:\/\//, '');
const firstName = (n: string) => n.split(' ')[0];

/**
 * Deja solo dígitos. Para Argentina, la API espera 549 + característica sin 0 + número sin 15
 * (10 dígitos nacionales). Acepta también formatos locales como "011 15 5523-8841" o "11 5523-8841".
 */
export function normalizePhone(raw: string) {
  let d = (raw || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  let national: string;
  if (d.startsWith('549')) national = d.slice(3);
  else if (d.startsWith('54')) national = d.slice(2);
  else national = d.replace(/^0/, '');
  if (national.length === 12) {
    // Tiene el "15" después de la característica (que puede ser de 2, 3 o 4 dígitos)
    for (const k of [2, 3, 4]) if (national.slice(k, k + 2) === '15') { national = national.slice(0, k) + national.slice(k + 2); break; }
  }
  return national.length === 10 ? '549' + national : d;
}

async function sendTemplate(to: string, kind: Kind, params: string[]) {
  if (process.env.WHATSAPP_DRY_RUN === 'true') return { ok: true, id: 'dry-run' };
  const v = process.env.WHATSAPP_API_VERSION || 'v21.0';
  const res = await fetch(`https://graph.facebook.com/${v}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: normalizePhone(to),
      type: 'template',
      template: {
        name: TEMPLATES[kind].name,
        language: { code: process.env.WHATSAPP_LANG || 'es_AR' },
        components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }],
      },
    }),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: json?.error?.message || `HTTP ${res.status}` };
  return { ok: true, id: json?.messages?.[0]?.id as string };
}

/** Envía y deja registro en el historial (también si falla, para poder reintentar). */
export async function sendWhatsApp(student: Pick<Profile, 'id' | 'phone' | 'full_name'>, kind: Kind, params: string[]) {
  const db = createServiceClient();
  const body = TEMPLATES[kind].body(params);
  if (!student.phone) {
    await db.from('messages').insert({ student_id: student.id, type: kind, body, status: 'error', error: 'La alumna no tiene WhatsApp cargado' });
    return false;
  }
  const r = await sendTemplate(student.phone, kind, params);
  await db.from('messages').insert({ student_id: student.id, type: kind, body, status: r.ok ? 'sent' : 'error', wa_message_id: r.ok ? r.id : null, error: r.ok ? null : r.error });
  return r.ok;
}

const KIND_WORD = { rutina: 'Tu rutina', dieta: 'Tu dieta', calendario: 'Tu agenda semanal' } as const;

/** Marca la actualización en el perfil de cada alumna y le avisa por WhatsApp. */
export async function notifyUpdate(studentIds: string[], kind: keyof typeof KIND_WORD) {
  if (!studentIds.length) return 0;
  const db = createServiceClient();
  const now = new Date().toISOString();
  await db.from('profiles').update({ [`updated_${kind}`]: now }).in('id', studentIds);
  const { data } = await db.from('profiles').select('id, phone, full_name').in('id', studentIds);
  let sent = 0;
  for (const s of data || []) if (await sendWhatsApp(s, 'actualizacion', [firstName(s.full_name), KIND_WORD[kind], site()])) sent++;
  return sent;
}

export async function sendWelcome(s: Pick<Profile, 'id' | 'phone' | 'full_name' | 'username'>) {
  return sendWhatsApp(s, 'bienvenida', [firstName(s.full_name), s.username, site()]);
}

export async function sendPaymentReceipt(s: Pick<Profile, 'id' | 'phone' | 'full_name'>, amount: number, nextDue: string) {
  return sendWhatsApp(s, 'pago', [firstName(s.full_name), money(amount), fmtDateLong(nextDue)]);
}

export async function loadHolidays() {
  const db = createServiceClient();
  const { data } = await db.from('holidays').select('day');
  return new Set((data || []).map((h: any) => h.day as string));
}

/** Recordatorio de cuota: 2 días hábiles antes del vencimiento. Lo corre la tarea diaria. */
export async function runReminders() {
  const db = createServiceClient();
  const holidays = await loadHolidays();
  const today = todayAR();
  const { data: students } = await db.from('profiles').select('*').eq('role', 'alumna').eq('active', true).not('next_due', 'is', null);
  let sent = 0;
  for (const s of (students || []) as Profile[]) {
    const r = reminderDate(s.next_due!, holidays);
    if (today >= r && today <= s.next_due! && s.reminder_sent_for !== s.next_due) {
      const ok = await sendWhatsApp(s, 'recordatorio', [firstName(s.full_name), money(s.fee), fmtDateLong(s.next_due!)]);
      if (ok) { await db.from('profiles').update({ reminder_sent_for: s.next_due }).eq('id', s.id); sent++; }
    }
  }
  return sent;
}
