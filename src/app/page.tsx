import { Navbar } from "@/components/landing/navbar";
import { TerminalHero } from "@/components/landing/terminal-hero";
import { SocialProofBar } from "@/components/landing/social-proof-bar";
import { FeaturesSection } from "@/components/landing/features-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { StatsSection } from "@/components/landing/stats-section";
import { DeveloperSection } from "@/components/landing/developer-section";
import { SecuritySection } from "@/components/landing/security-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { CtaSection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";
import { MobileCtaBar } from "@/components/landing/mobile-cta-bar";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="pb-16 md:pb-0">
        <TerminalHero />
        <SocialProofBar />
        <FeaturesSection />
        <HowItWorks />
        <DeveloperSection />
        <SecuritySection />
        <StatsSection />
        <PricingSection />
        <CtaSection />
      </main>
      <Footer />
      <MobileCtaBar />
    </>
  );
}
