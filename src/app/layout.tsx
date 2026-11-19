import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'STRAP — Train Smart. Recover Better. Progress Faster.',
  description:
    'STRAP is an intelligent AI fitness SaaS application that builds and adapts your personalized workout splits, progressive overload, nutrition calculations, and recovery insights.',
  icons: {
    icon: '/favicon.ico',
  },
};

const themeInitScript = `
(function() {
  try {
    var t = localStorage.getItem('strap-theme') || 'dark';
    document.documentElement.classList.toggle('dark', t === 'dark');
    document.documentElement.classList.toggle('light', t === 'light');
    document.documentElement.style.colorScheme = t;
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased selection:bg-brand-DEFAULT selection:text-black">
        <Providers>
          <Navbar />
          <main className="flex-1 w-full">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
