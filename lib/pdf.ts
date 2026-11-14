import { jsPDF } from 'jspdf';
import type { Diet, Routine } from '@/lib/types';
import { fmtDateLong, todayAR } from '@/lib/dates';
import { LOGO_PNG } from '@/lib/logo-pdf';

export type PdfKind = 'rutina' | 'dieta' | 'ambos';

/** Arma el PDF de resumen para la alumna (rutina, dieta o ambas). */
export function buildSummaryPdf(opts: { name: string; plan: string; routine: Routine; diet: Diet; kind: PdfKind }) {
  const { name, plan, routine, diet, kind } = opts;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const A: [number, number, number] = [217, 47, 85], INK: [number, number, number] = [28, 23, 38], MU: [number, number, number] = [103, 95, 116];
  let y = 0, page = 1;
  const footer = () => { doc.setFontSize(8); doc.setTextColor(...MU); doc.setFont('helvetica', 'normal'); doc.text(`LegDay · Entrenamiento personalizado · página ${page}`, 15, 290); };
  const ensure = (h: number) => { if (y + h > 280) { footer(); doc.addPage(); page++; y = 20; } };
  const label = kind === 'ambos' ? 'Rutina + dieta' : kind === 'rutina' ? 'Rutina' : 'Dieta';

  // Encabezado: franja de color con el logo circular a la izquierda.
  doc.setFillColor(...A); doc.rect(0, 0, 210, 34, 'F');
  doc.addImage(LOGO_PNG, 'PNG', 12, 3, 28, 28);
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text(label.toUpperCase(), 46, 16);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text(`${name}${plan ? ' · ' + plan : ''}`, 46, 24);
  doc.setFontSize(9); doc.text('Generado el ' + fmtDateLong(todayAR()), 195, 24, { align: 'right' });
  y = 46;

  const section = (t: string) => {
    ensure(14); doc.setTextColor(...A); doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.text(t.toUpperCase(), 15, y);
    doc.setDrawColor(...A); doc.setLineWidth(0.5); doc.line(15, y + 2, 195, y + 2); y += 10;
  };

  if (kind !== 'dieta') {
    section('Rutina semanal');
    const X = [15, 92, 110, 130, 150];
    if (!routine.days.length) { doc.setFontSize(10); doc.setTextColor(...MU); doc.text('Tu entrenadora todavía no cargó la rutina.', 15, y); y += 8; }
    for (const d of routine.days) {
      ensure(18); doc.setTextColor(...INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5);
      doc.text(`${d.day}${d.focus ? '  ·  ' + d.focus : ''}`, 15, y); y += 5;
      doc.setFillColor(244, 243, 247); doc.rect(15, y - 3.6, 180, 6, 'F'); doc.setFontSize(8); doc.setTextColor(...MU);
      ['EJERCICIO', 'SERIES', 'REPS', 'DESCANSO', 'NOTAS'].forEach((h, i) => doc.text(h, X[i] + 1, y)); y += 6;
      for (const e of d.exercises) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...INK);
        const nm = doc.splitTextToSize(e.name || '', 75), nt = doc.splitTextToSize(e.notes || '', 44);
        const h = Math.max(nm.length, nt.length, 1) * 4.3 + 1.5; ensure(h);
        doc.text(nm, X[0] + 1, y); doc.text(String(e.sets || ''), X[1] + 1, y); doc.text(String(e.reps || ''), X[2] + 1, y); doc.text(String(e.rest || ''), X[3] + 1, y);
        doc.setTextColor(...MU); doc.setFontSize(8.5); doc.text(nt, X[4] + 1, y);
        y += h; doc.setDrawColor(226, 223, 233); doc.setLineWidth(0.2); doc.line(15, y - 3, 195, y - 3);
      }
      y += 5;
    }
  }

  if (kind !== 'rutina') {
    if (kind === 'ambos') y += 2;
    section('Plan de alimentación');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...INK);
    doc.text(`Objetivo diario: ${diet.kcal || '—'} kcal  ·  Proteína: ${diet.protein || '—'} g`, 15, y); y += 8;
    for (const m of diet.meals) {
      const lines = doc.splitTextToSize(m.items || '', 150); ensure(lines.length * 4.6 + 9);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...A); doc.text(m.time || '', 15, y);
      doc.setTextColor(...INK); doc.text(m.name || '', 33, y); y += 5;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.text(lines, 33, y); y += lines.length * 4.6 + 4;
    }
    if (diet.notes) {
      const l = doc.splitTextToSize(diet.notes, 176); ensure(l.length * 4.6 + 10); y += 2;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...MU); doc.text('INDICACIONES', 15, y); y += 5;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...INK); doc.text(l, 15, y);
    }
  }
  footer();
  return doc.output('arraybuffer');
}
