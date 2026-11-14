import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Cierra la sesión y vuelve al login (se usa cuando una alumna fue pausada con la sesión abierta). */
export async function GET(req: NextRequest) {
  await createClient().auth.signOut();
  const motivo = req.nextUrl.searchParams.get('motivo');
  const msg = motivo === 'pausada' ? 'Tu acceso está pausado. Escribile a tu entrenadora para reactivarlo.' : '';
  return NextResponse.redirect(new URL('/login' + (msg ? '?error=' + encodeURIComponent(msg) : ''), req.url));
}
