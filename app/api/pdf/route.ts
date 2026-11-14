import { NextResponse, type NextRequest } from 'next/server';
import { createClient, getCurrentProfile } from '@/lib/supabase/server';
import { buildSummaryPdf, type PdfKind } from '@/lib/pdf';
import { emptyDiet, emptyRoutine } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Descarga el resumen en PDF de la alumna que inició sesión. */
export async function GET(req: NextRequest) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.redirect(new URL('/login', req.url));
  if (me.role === 'alumna' && !me.active) return NextResponse.redirect(new URL('/salir?motivo=pausada', req.url));
  const tipo = req.nextUrl.searchParams.get('tipo') as PdfKind;
  const kind: PdfKind = ['rutina', 'dieta', 'ambos'].includes(tipo) ? tipo : 'ambos';
  const supabase = createClient();
  const [{ data: r }, { data: d }] = await Promise.all([
    supabase.from('routines').select('data').eq('student_id', me.id).maybeSingle(),
    supabase.from('diets').select('data').eq('student_id', me.id).maybeSingle(),
  ]);
  const pdf = buildSummaryPdf({ name: me.full_name, plan: me.plan || '', routine: r?.data || emptyRoutine(), diet: d?.data || emptyDiet(), kind });
  const slug = me.full_name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
  const file = `LegDay-${slug}-${kind === 'ambos' ? 'rutina-y-dieta' : kind}.pdf`;
  return new NextResponse(pdf, {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${file}"`, 'Cache-Control': 'no-store' },
  });
}
