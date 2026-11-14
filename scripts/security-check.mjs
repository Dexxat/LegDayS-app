#!/usr/bin/env node
/**
 * Chequeo de seguridad del sitio publicado (solo lecturas: no crea, cambia ni borra nada).
 *
 * Uso:
 *   SITE_URL=https://tu-dominio.com \
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co \
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... \
 *   npm run security:check
 *
 * La anon key es pública (va en el navegador), así que se puede usar acá sin riesgo.
 * Prueba lo mismo que podría probar cualquier visitante sin cuenta.
 */
const SITE = (process.env.SITE_URL || '').replace(/\/$/, '');
const SB = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
if (!SITE || !SB || !ANON) {
  console.error('Faltan variables: SITE_URL, NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  process.exit(2);
}

let fails = 0, warns = 0;
const ok = (m) => console.log('  \x1b[32m✓\x1b[0m ' + m);
const bad = (m) => { fails++; console.log('  \x1b[31m✗ ' + m + '\x1b[0m'); };
const warn = (m) => { warns++; console.log('  \x1b[33m! ' + m + '\x1b[0m'); };
const get = (url, init = {}) => fetch(url, { redirect: 'manual', ...init });
const isLoginRedirect = (r) => r.status >= 300 && r.status < 400 && /\/login/.test(r.headers.get('location') || '');

console.log(`\nSitio: ${SITE}`);

console.log('\n1. Páginas privadas sin sesión');
for (const p of ['/admin', '/admin/alumnas', '/admin/ganancias', '/mi-panel']) {
  const r = await get(SITE + p);
  isLoginRedirect(r) ? ok(`${p} → manda al login`) : bad(`${p} respondió ${r.status} sin sesión (debería mandar al login)`);
}

console.log('\n2. Descargas y API sin sesión');
{
  const r = await get(SITE + '/api/pdf?tipo=ambos');
  isLoginRedirect(r) ? ok('/api/pdf → manda al login') : bad(`/api/pdf respondió ${r.status} sin sesión`);
  const c = await get(SITE + '/api/admin/pagos-csv?mes=2026-01');
  c.status === 401 ? ok('/api/admin/pagos-csv → 401') : bad(`/api/admin/pagos-csv respondió ${c.status} sin sesión`);
  for (const auth of [undefined, 'Bearer undefined', 'Bearer ', 'Bearer null']) {
    const k = await get(SITE + '/api/cron/recordatorios', { headers: auth ? { authorization: auth } : {} });
    k.status === 401 ? ok(`cron con ${auth ? `"${auth}"` : 'ninguna clave'} → 401`) : bad(`cron con ${auth || 'ninguna clave'} respondió ${k.status}: ¡cualquiera puede disparar los WhatsApp!`);
  }
}

console.log('\n3. Cabeceras de seguridad');
{
  const r = await get(SITE + '/login');
  const h = (n) => r.headers.get(n);
  h('strict-transport-security') ? ok('HSTS activo') : warn('Falta Strict-Transport-Security');
  (h('x-frame-options') || '').toUpperCase() === 'DENY' || /frame-ancestors/.test(h('content-security-policy') || '')
    ? ok('No se puede meter en un iframe (clickjacking)') : warn('Falta X-Frame-Options: DENY (clickjacking)');
  h('x-content-type-options') === 'nosniff' ? ok('X-Content-Type-Options: nosniff') : warn('Falta X-Content-Type-Options');
  h('x-powered-by') ? warn(`Expone la tecnología del servidor (x-powered-by: ${h('x-powered-by')})`) : ok('No expone x-powered-by');
  const http = await get(SITE.replace(/^https:/, 'http:') + '/login').catch(() => null);
  if (http) http.status >= 300 && http.status < 400 && /^https:/.test(http.headers.get('location') || '') ? ok('http:// redirige a https://') : warn(`http:// respondió ${http.status} sin redirigir a https`);
}

console.log('\n4. Base de datos (Supabase) como visitante anónimo');
const sbh = { apikey: ANON, authorization: `Bearer ${ANON}` };
for (const t of ['profiles', 'routines', 'diets', 'payments', 'messages', 'slots', 'slot_students', 'holidays', 'exercises']) {
  const r = await fetch(`${SB}/rest/v1/${t}?select=*&limit=1`, { headers: sbh });
  const body = await r.json().catch(() => null);
  if (r.ok && Array.isArray(body) && body.length === 0) ok(`${t}: no devuelve datos`);
  else if (!r.ok) ok(`${t}: acceso denegado (${r.status})`);
  else bad(`${t}: ¡un visitante anónimo puede leer datos! Revisá que RLS esté activado (supabase/schema.sql).`);
}

console.log('\n5. Registro de cuentas y archivos');
{
  const r = await fetch(`${SB}/auth/v1/settings`, { headers: { apikey: ANON } });
  const s = await r.json().catch(() => ({}));
  s.disable_signup === true
    ? ok('El registro público de cuentas está desactivado')
    : bad('Cualquiera puede crearse una cuenta en tu Supabase con la anon key. Desactivalo: Authentication → Sign In / Providers → "Allow new users to sign up" = OFF.');
  const l = await fetch(`${SB}/storage/v1/object/list/ejercicios`, { method: 'POST', headers: { ...sbh, 'content-type': 'application/json' }, body: JSON.stringify({ prefix: '', limit: 5 }) });
  const files = await l.json().catch(() => null);
  Array.isArray(files) && files.length ? warn('Se puede listar la carpeta de animaciones (no es grave: son videos de ejercicios)') : ok('No se puede listar la carpeta de archivos');
}

console.log(`\nResultado: ${fails} problema(s), ${warns} advertencia(s).\n`);
process.exit(fails ? 1 : 0);
