'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SideNav({ items }: { items: { href: string; label: string; badge?: number }[] }) {
  const path = usePathname();
  return (
    <nav className="side" aria-label="Secciones">
      {items.map((it) => {
        const current = it.href === path || (it.href !== '/admin' && it.href !== '/mi-panel' && path.startsWith(it.href));
        return (
          <Link key={it.href} href={it.href} aria-current={current ? 'page' : undefined}>
            {it.label}
            {it.badge ? <span className="count">{it.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
