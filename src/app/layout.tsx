import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '행운행',
  description: '행운행',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
