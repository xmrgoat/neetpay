import Image from "next/image";
import { Navbar } from "@/components/landing/navbar";
import { TerminalHero } from "@/components/landing/terminal-hero";
import { CryptoUniverse } from "@/components/landing/crypto-universe";
import { PrivacySection } from "@/components/landing/privacy-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { CtaSection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";
import { MobileCtaBar } from "@/components/landing/mobile-cta-bar";

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-[#08080c]">
      {/* ── Full-page background image ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <Image
          src="/hero-bg.jpg"
          alt=""
          fill
          priority
          className="object-cover object-center"
          style={{ filter: "blur(70px)" }}
        />
      </div>

      {/* ── Content (above the background) ── */}
      <div className="relative z-10">
        <Navbar />
        <main className="pb-16 md:pb-0">
          <TerminalHero />
          <CryptoUniverse />
          <PrivacySection />
          <FeaturesSection />
          <PricingSection />
          <CtaSection />
        </main>
        <Footer />
        <MobileCtaBar />
      </div>
    </div>
  );
}
