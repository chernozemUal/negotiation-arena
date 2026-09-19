import type { Metadata, Viewport } from 'next';
import './globals.css';
export const viewport: Viewport = { width: 'device-width', initialScale: 1, interactiveWidget: 'resizes-content' };
export const metadata: Metadata = { title: 'Арена — пространство сильных переговоров', description: 'Практикуйте переговоры, пробуйте стратегии и получайте персональный разбор.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ru"><body>{children}</body></html>; }
