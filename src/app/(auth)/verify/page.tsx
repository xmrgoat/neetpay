import dynamic from "next/dynamic";

const VerifyContent = dynamic(() => import("./verify-content"), {
  ssr: false,
  loading: () => (
    <div className="text-center">
      <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      <p className="text-sm text-foreground-secondary">Loading...</p>
    </div>
  ),
});

export default function VerifyPage() {
  return <VerifyContent />;
}
