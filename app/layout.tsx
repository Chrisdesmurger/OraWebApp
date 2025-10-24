import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProviderWrapper } from '@/components/providers/auth-provider-wrapper';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Ora Admin Dashboard',
  description: 'Admin dashboard for Ora wellbeing platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProviderWrapper>{children}</AuthProviderWrapper>
        <Toaster />
      </body>
    </html>
  );
}
