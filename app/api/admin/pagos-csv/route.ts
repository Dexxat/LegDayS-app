import { NextResponse, type NextRequest } from 'next/server';
import { createClient, getCurrentProfile } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** Exporta los pagos de un mes en CSV (se abre en Excel o Google Sheets). */
export async function GET(req: NextRequest) {
  const me = await getCurrentProfile();
  if (!me || me.role !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const mes = req.nextUrl.searchParams.get('mes') || '';
  if (!/^\d{4}-\d{2}$/.test(mes)) return NextResponse.json({ error: 'Mes inválido' }, { status: 400 });
  const supabase = createClient();
  const [y, m] = mes.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  const { data } = await supabase.from('payments').select('paid_on, amount, method, profiles(full_name)')
    .gte('paid_on', `${mes}-01`).lte('paid_on', `${mes}-${last}`).order('paid_on');
  const q = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [['Fecha', 'Alumna', 'Medio', 'Monto'], ...(data || []).map((p: any) => [p.paid_on, p.profiles?.full_name, p.method, p.amount])];
  const csv = '﻿' + rows.map((r) => r.map(q).join(';')).join('\n');
  return new NextResponse(csv, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="LegDay-pagos-${mes}.csv"` },
  });
}
