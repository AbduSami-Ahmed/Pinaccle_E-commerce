import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toast';

export const metadata: Metadata = {
  title: 'Pinnacle Automotive Parts | Quality Tyres & Reconditioned Seat Belts',
  description:
    'Production-grade automotive parts e-commerce platform specializing in verified fitment tyres and tested seat belts.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
