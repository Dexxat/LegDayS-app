export const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const MONTHS_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const TZ = 'America/Argentina/Buenos_Aires';

const pad = (n: number) => String(n).padStart(2, '0');
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

/** Fecha de hoy en Argentina (YYYY-MM-DD), sin importar dónde corre el servidor. */
export const todayAR = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());

export function isBusinessDay(d: Date, holidays: Set<string>) {
  const wd = d.getDay();
  return wd !== 0 && wd !== 6 && !holidays.has(iso(d));
}

/** Resta n días hábiles (salta sábados, domingos y feriados). */
export function subBusinessDays(s: string, n: number, holidays: Set<string>) {
  const d = parse(s);
  while (n > 0) { d.setDate(d.getDate() - 1); if (isBusinessDay(d, holidays)) n--; }
  return iso(d);
}

/** Día en que sale el recordatorio: 2 días hábiles antes del vencimiento. */
export const reminderDate = (due: string, holidays: Set<string>) => subBusinessDays(due, 2, holidays);

export function addMonth(s: string) {
  const d = parse(s); const day = d.getDate();
  d.setDate(1); d.setMonth(d.getMonth() + 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return iso(d);
}

export const monthKey = (s: string) => s.slice(0, 7);
export const monthLabel = (k: string) => { const [y, m] = k.split('-'); return `${MONTHS_L[+m - 1]} ${y}`; };
export const fmtDate = (s: string) => { const d = parse(s); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
export const fmtDateLong = (s: string) => {
  const d = parse(s); const wd = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][d.getDay()];
  return `${wd} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};
export const fmtStamp = (ts: string | null) => {
  if (!ts) return 'Sin cambios registrados';
  const d = new Date(ts);
  const f = new Intl.DateTimeFormat('es-AR', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return f.format(d);
};
export const money = (n: number) => '$ ' + Math.round(n).toLocaleString('es-AR');

export type CuotaStatus = { k: 'ok' | 'warn' | 'bad'; t: string };
export function cuotaStatus(nextDue: string | null, holidays: Set<string>, today = todayAR()): CuotaStatus {
  if (!nextDue) return { k: 'ok', t: 'Sin vencimiento' };
  if (today > nextDue) return { k: 'bad', t: 'Vencida' };
  if (today >= reminderDate(nextDue, holidays)) return { k: 'warn', t: 'Por vencer' };
  return { k: 'ok', t: 'Al día' };
}
