/** Mensaje de confirmación que llega por la URL (?ok=... o ?error=...). */
export default function Flash({ sp }: { sp: { ok?: string; error?: string } }) {
  if (sp.error) return <p className="flash error" role="alert">{sp.error}</p>;
  if (sp.ok) return <p className="flash" role="status">{sp.ok}</p>;
  return null;
}
