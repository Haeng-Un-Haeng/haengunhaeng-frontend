import type { Metadata } from 'next';
import './globals.css';
import { cn } from '@/shared/lib/cn';

export const metadata: Metadata = {
  title: '행운행',
  description: '행운행',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-dvh bg-zinc-800">
        <div
          className={cn(
            'mx-auto min-h-dvh w-full max-w-[430px] bg-surface',
            'text-ink',
          )}
        >
          {children}
        </div>
      </body>
    </html>
  );
}
