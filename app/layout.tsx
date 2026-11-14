import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LegDay',
  description: 'Rutinas, dietas y agenda de las alumnas de LegDay.',
  icons: { icon: '/favicon-32x32.png', apple: '/apple-touch-icon.png' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#D92F55' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
