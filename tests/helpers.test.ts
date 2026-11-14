import { describe, expect, it } from 'vitest';
import { usernameToEmail } from '@/lib/auth';
import { normalizePhone } from '@/lib/whatsapp';

describe('usernameToEmail', () => {
  it('convierte el usuario de la alumna en email interno', () =>
    expect(usernameToEmail('  Sofia ')).toBe(`sofia@${process.env.STUDENT_EMAIL_DOMAIN || 'alumnas.legday.com.ar'}`));
  it('deja pasar un email (la entrenadora entra con su email)', () =>
    expect(usernameToEmail('Admin@Example.com')).toBe('admin@example.com'));
});

describe('normalizePhone (formato que pide la API de WhatsApp)', () => {
  it('formato completo con 9', () => expect(normalizePhone('+54 9 11 5523-8841')).toBe('5491155238841'));
  it('agrega el 9 si falta', () => expect(normalizePhone('+54 11 5523-8841')).toBe('5491155238841'));
  it('quita el 0 de la característica y el 15', () => expect(normalizePhone('011 15 5523-8841')).toBe('5491155238841'));
  it('número local sin 0 ni 15', () => expect(normalizePhone('11 5523-8841')).toBe('5491155238841'));
  it('vacío', () => expect(normalizePhone('')).toBe(''));
});
