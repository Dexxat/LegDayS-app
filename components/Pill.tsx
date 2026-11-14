export default function Pill({ k, children }: { k: 'ok' | 'warn' | 'bad' | 'new'; children: React.ReactNode }) {
  return <span className={`pill ${k}`}>{children}</span>;
}
