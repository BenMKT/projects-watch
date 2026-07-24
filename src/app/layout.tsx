import type { Metadata } from 'next';
import { Fraunces, Source_Sans_3 } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { SiteHeader } from '@/components/SiteHeader';

const display = Fraunces({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});

const body = Source_Sans_3({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Citizen Development Watch (CDW)',
  description:
    'Civic technology platform for project monitoring, community feedback, RAG traffic lights, and ministry accountability.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <Providers>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-teal-900/10 bg-teal-950 text-teal-50/80">
            <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="font-[family-name:var(--font-display)] text-lg text-white">
                Citizen Development Watch
              </p>
              <p className="max-w-md text-sm">
                Evidence-based civic oversight · AES-256 encrypted uploads ·
                Anonymised reporters · GDPR-aligned retention
              </p>
            </div>
          </footer>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
