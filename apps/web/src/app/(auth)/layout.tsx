import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-[20px] font-semibold text-foreground hover:opacity-80 transition-opacity"
          >
            English Learning
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
