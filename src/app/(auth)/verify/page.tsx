import { Suspense } from "react";
import VerifyContent from "./verify-content";

export const dynamic = "force-dynamic";

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="text-sm text-foreground-secondary">Loading...</p>
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
