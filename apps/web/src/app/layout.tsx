import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'English Learning Platform',
  description: 'Adaptive English learning for B1-C1 learners',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900">{children}</body>
    </html>
  );
}
