import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-12">
      <Link
        href="/"
        className="mb-12 font-heading text-xl font-bold tracking-tight"
      >
        <span className="text-foreground">neet</span>
        <span className="text-primary">pay</span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
