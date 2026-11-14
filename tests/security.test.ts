/**
 * Seguridad de las acciones del panel: TODA acción exportada de app/admin/actions.ts
 * tiene que rechazar a quien no es la entrenadora ANTES de tocar la base con la clave de servicio.
 * Si mañana se agrega una acción nueva y se olvida requireAdmin(), este test falla.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ profile: null as any, serviceCalls: 0 }));

vi.mock('next/navigation', () => ({ redirect: (url: string) => { throw new Error('REDIRECT:' + url); } }));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('@/lib/supabase/server', () => ({
  getCurrentProfile: async () => state.profile,
  requireAdmin: async () => {
    if (!state.profile || state.profile.role !== 'admin') throw new Error('No autorizado');
    return state.profile;
  },
  createServiceClient: () => { state.serviceCalls++; throw new Error('Se usó la clave de servicio sin permiso'); },
  createClient: () => { throw new Error('no debería llegar a la base'); },
}));
vi.mock('@/lib/whatsapp', () => ({
  notifyUpdate: vi.fn(), runReminders: vi.fn(async () => 0), sendPaymentReceipt: vi.fn(), sendWelcome: vi.fn(), loadHolidays: vi.fn(),
}));

const fd = () => { const f = new FormData(); f.set('id', '00000000-0000-0000-0000-000000000000'); f.set('username', 'hacker'); f.set('pass', 'x'.repeat(10)); return f; };
const ARGS: Record<string, unknown[]> = {
  saveRoutine: [['00000000-0000-0000-0000-000000000000'], { days: [] }],
  saveDiet: [['00000000-0000-0000-0000-000000000000'], { kcal: '', protein: '', notes: '', meals: [] }],
  getExerciseUploadUrl: ['video/mp4'],
  saveExercise: [{ name: 'x', zone: 'Core', muscles: '', equipment: '', level: '', steps: ['a'], mistakes: [], media_path: null, media_type: null }],
  deleteExercise: ['00000000-0000-0000-0000-000000000000'],
  sendRemindersNow: [],
};

describe('acciones del panel de la entrenadora', async () => {
  const actions = await import('@/app/admin/actions');
  const names = Object.entries(actions).filter(([, v]) => typeof v === 'function').map(([k]) => k);

  beforeEach(() => { state.serviceCalls = 0; });

  it('encuentra las acciones a probar', () => expect(names.length).toBeGreaterThan(5));

  for (const who of [{ label: 'sin sesión', profile: null }, { label: 'una alumna', profile: { id: 'a1', role: 'alumna', active: true } }]) {
    for (const name of names) {
      it(`${name} rechaza a ${who.label}`, async () => {
        state.profile = who.profile;
        await expect((actions as any)[name](...(ARGS[name] ?? [fd()]))).rejects.toThrow('No autorizado');
        expect(state.serviceCalls).toBe(0);
      });
    }
  }
});

describe('tarea diaria de recordatorios (cron)', async () => {
  const { GET } = await import('@/app/api/cron/recordatorios/route');
  const req = (auth?: string) => ({ headers: new Headers(auth ? { authorization: auth } : {}) }) as any;

  it('rechaza sin clave', async () => {
    process.env.CRON_SECRET = 'clave-de-prueba';
    expect((await GET(req())).status).toBe(401);
  });
  it('rechaza con clave incorrecta', async () => {
    process.env.CRON_SECRET = 'clave-de-prueba';
    expect((await GET(req('Bearer otra'))).status).toBe(401);
  });
  it('si falta CRON_SECRET en el servidor, "Bearer undefined" NO sirve', async () => {
    delete process.env.CRON_SECRET;
    expect((await GET(req('Bearer undefined'))).status).toBe(401);
  });
  it('acepta la clave correcta', async () => {
    process.env.CRON_SECRET = 'clave-de-prueba';
    expect((await GET(req('Bearer clave-de-prueba'))).status).toBe(200);
  });
});
