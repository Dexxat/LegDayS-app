import { describe, expect, it } from 'vitest';
import { buildSummaryPdf } from '@/lib/pdf';
import { emptyDiet, emptyRoutine, type Routine } from '@/lib/types';

const head = (buf: ArrayBuffer) => new TextDecoder('latin1').decode(buf.slice(0, 5));
const text = (buf: ArrayBuffer) => new TextDecoder('latin1').decode(buf);
const pages = (buf: ArrayBuffer) => (text(buf).match(/\/Type \/Page\b/g) || []).length;

const longRoutine: Routine = {
  days: ['Lunes', 'Miércoles', 'Viernes'].map((day) => ({
    day, focus: 'Glúteos y piernas',
    exercises: Array.from({ length: 14 }, (_, i) => ({
      name: `Hip thrust con barra variante ${i + 1}`, sets: '4', reps: '10-12', rest: '90"', notes: 'Pausa de 2 segundos arriba, apretar glúteos. Bajar controlado.',
    })),
  })),
};

describe('PDF de rutina y dieta', () => {
  it('genera un PDF válido aunque no haya datos cargados', () => {
    const pdf = buildSummaryPdf({ name: 'Sofía Martínez', plan: '', routine: emptyRoutine(), diet: emptyDiet(), kind: 'ambos' });
    expect(head(pdf)).toBe('%PDF-');
    expect(pages(pdf)).toBe(1);
  });

  it('incluye el logo como imagen', () => {
    const pdf = buildSummaryPdf({ name: 'Ana', plan: 'Plan', routine: emptyRoutine(), diet: emptyDiet(), kind: 'rutina' });
    expect(text(pdf)).toMatch(/\/Subtype \/Image/);
  });

  it('agrega páginas cuando la rutina es larga', () => {
    const pdf = buildSummaryPdf({ name: 'Ana', plan: '3x semana', routine: longRoutine, diet: emptyDiet(), kind: 'rutina' });
    expect(pages(pdf)).toBeGreaterThan(1);
  });

  it('no se rompe con tildes, ñ ni emojis en los textos', () => {
    const diet = { kcal: '1800', protein: '120', notes: 'Tomar 2 L de agua 💧 por día', meals: [{ name: 'Desayuno ñandú', time: '08:00', items: 'Avena, plátano 🍌' }] };
    expect(() => buildSummaryPdf({ name: 'Ñoño Pérez 💪', plan: 'Online', routine: longRoutine, diet, kind: 'ambos' })).not.toThrow();
  });
});
