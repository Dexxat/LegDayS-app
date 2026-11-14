import Brand from '@/components/Brand';
import { login } from './actions';

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="login-wrap">
      <div className="login">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.8rem', textAlign: 'center' }}>
          <span className="login-brand"><Brand size={200} /></span>
          <p className="muted">Tu entrenamiento, tu dieta y tu agenda en un solo lugar.</p>
        </div>
        <form className="login-card" action={login}>
          <label className="field"><span>Usuario</span><input className="input" name="user" autoComplete="username" required /></label>
          <label className="field"><span>Contraseña</span><input className="input" name="pass" type="password" autoComplete="current-password" required /></label>
          {searchParams.error && <p className="err">{searchParams.error}</p>}
          <button className="btn primary" type="submit">Ingresar</button>
        </form>
        <p className="demo-note">¿Olvidaste tu contraseña? Escribile a tu entrenadora y te la cambia.</p>
      </div>
    </div>
  );
}
