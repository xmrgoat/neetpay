import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { DocsNav } from "@/components/docs/docs-nav";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-6xl px-6 pt-24 pb-16">
        <div className="flex gap-12">
          <DocsNav />
          <main className="min-w-0 flex-1 py-8">{children}</main>
        </div>
      </div>
      <Footer />
    </>
  );
}
