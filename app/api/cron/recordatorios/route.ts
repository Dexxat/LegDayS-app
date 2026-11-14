import { NextResponse, type NextRequest } from 'next/server';
import { runReminders } from '@/lib/whatsapp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Tarea diaria (vercel.json, 12:00 UTC = 9:00 en Argentina): recordatorios de cuota por WhatsApp. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  // Sin CRON_SECRET configurado, "Bearer undefined" sería una clave válida: se rechaza siempre.
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const sent = await runReminders();
  return NextResponse.json({ ok: true, sent });
}
