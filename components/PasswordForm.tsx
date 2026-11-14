import Flash from '@/components/Flash';
import { changePassword } from '@/app/cuenta-actions';

export default function PasswordForm({ back, username, sp }: { back: string; username: string; sp: { ok?: string; error?: string } }) {
  return (
    <section className="panel" style={{ maxWidth: 520 }}>
      <div><h2>Cambiar contraseña</h2><p className="muted" style={{ marginTop: '.3rem' }}>Tu usuario es <strong>{username}</strong>. Usá al menos 8 caracteres.</p></div>
      <Flash sp={sp} />
      <form action={changePassword} style={{ display: 'flex', flexDirection: 'column', gap: '.8rem' }}>
        <input type="hidden" name="back" value={back} />
        <label className="field"><span>Contraseña actual</span><input className="input" name="current" type="password" autoComplete="current-password" required /></label>
        <label className="field"><span>Contraseña nueva</span><input className="input" name="next" type="password" autoComplete="new-password" minLength={8} required /></label>
        <label className="field"><span>Repetir contraseña nueva</span><input className="input" name="confirm" type="password" autoComplete="new-password" minLength={8} required /></label>
        <div><button className="btn primary" type="submit">Cambiar contraseña</button></div>
      </form>
    </section>
  );
}
