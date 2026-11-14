import { describe, expect, it } from 'vitest';
import { addMonth, cuotaStatus, isBusinessDay, parse, reminderDate, subBusinessDays } from '@/lib/dates';

const none = new Set<string>();

describe('addMonth (próximo vencimiento)', () => {
  it('suma un mes normal', () => expect(addMonth('2026-03-10')).toBe('2026-04-10'));
  it('pasa de diciembre a enero del año siguiente', () => expect(addMonth('2026-12-15')).toBe('2027-01-15'));
  it('31 de enero → último día de febrero', () => expect(addMonth('2026-01-31')).toBe('2026-02-28'));
  it('respeta años bisiestos', () => expect(addMonth('2028-01-31')).toBe('2028-02-29'));
  it('31 de marzo → 30 de abril', () => expect(addMonth('2026-03-31')).toBe('2026-04-30'));
});

describe('días hábiles y recordatorio de cuota', () => {
  it('sábado y domingo no son hábiles', () => {
    expect(isBusinessDay(parse('2026-11-14'), none)).toBe(false); // sábado
    expect(isBusinessDay(parse('2026-11-15'), none)).toBe(false); // domingo
    expect(isBusinessDay(parse('2026-11-16'), none)).toBe(true);  // lunes
  });
  it('un feriado no es hábil', () => expect(isBusinessDay(parse('2026-12-08'), new Set(['2026-12-08']))).toBe(false));
  it('vence el lunes → recordatorio el jueves anterior (salta el fin de semana)', () =>
    expect(reminderDate('2026-11-16', none)).toBe('2026-11-12'));
  it('salta feriados', () => expect(subBusinessDays('2026-12-10', 2, new Set(['2026-12-08']))).toBe('2026-12-07'));
});

describe('cuotaStatus', () => {
  it('sin vencimiento', () => expect(cuotaStatus(null, none, '2026-11-10').k).toBe('ok'));
  it('al día', () => expect(cuotaStatus('2026-11-30', none, '2026-11-10').k).toBe('ok'));
  it('por vencer desde el día del recordatorio', () => {
    expect(cuotaStatus('2026-11-16', none, '2026-11-11').k).toBe('ok');
    expect(cuotaStatus('2026-11-16', none, '2026-11-12').k).toBe('warn');
    expect(cuotaStatus('2026-11-16', none, '2026-11-16').k).toBe('warn');
  });
  it('vencida desde el día siguiente', () => expect(cuotaStatus('2026-11-16', none, '2026-11-17').k).toBe('bad'));
});
