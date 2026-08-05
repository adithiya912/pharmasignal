import { MarketingNavbar } from "@/components/marketing/navbar";
import { Hero } from "@/components/marketing/hero";
import { LiveStats } from "@/components/marketing/live-stats";
import { Features } from "@/components/marketing/features";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { TechStack } from "@/components/marketing/tech-stack";
import { EvidenceBase } from "@/components/marketing/evidence-base";
import { FAQ } from "@/components/marketing/faq";
import { MarketingFooter } from "@/components/marketing/footer";

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <MarketingNavbar />
      <main className="flex-1">
        <Hero />
        <LiveStats />
        <Features />
        <HowItWorks />
        <TechStack />
        <EvidenceBase />
        <FAQ />
      </main>
      <MarketingFooter />
    </div>
  );
}
