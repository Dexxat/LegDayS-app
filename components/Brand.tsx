/** Logo de LegDay. `size` es el alto (y ancho, porque es circular) en píxeles. */
export default function Brand({ size = 40 }: { size?: number }) {
  return (
    <img
      className="brand"
      src={size > 128 ? '/legday-logo-512.webp' : '/legday-logo-256.webp'}
      alt="LegDay · Personal Trainer"
      width={size}
      height={size}
    />
  );
}
