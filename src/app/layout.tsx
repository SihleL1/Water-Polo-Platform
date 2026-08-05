import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Water Polo Platform',
  description: 'A local Next.js app scaffold for the Water Polo platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
