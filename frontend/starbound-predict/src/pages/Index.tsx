import StarField from "@/components/StarField";
import Navbar from "@/components/Navbar";
import LaunchHero from "@/components/LaunchHero";
import KPICards from "@/components/KPICards";
import AnalyticsCharts from "@/components/AnalyticsCharts";
import PredictionForm from "@/components/PredictionForm";
import SectionHeader from "@/components/SectionHeader";

const Index = () => (
  <div id="top" className="relative min-h-screen">
    <StarField />
    <Navbar />

    <main className="relative z-10">
      <LaunchHero />

      <section id="overview" className="container scroll-mt-24 pb-24">
        <SectionHeader title="The dataset at a glance" subtitle="Every figure on this page comes from the same 500 missions the model was trained on." />
        <KPICards />
      </section>

      <section id="analytics" className="container scroll-mt-24 pb-24">
        <SectionHeader title="What the missions looked like" subtitle="How often they flew, on what, for what purpose, and whether spending more bought more science." />
        <AnalyticsCharts />
      </section>

      <section id="predictor" className="container scroll-mt-24 pb-28">
        <SectionHeader
          title="Test a mission"
          subtitle="Set the parameters and launch. The rocket climbs to the success rate the model predicts."
        />
        <PredictionForm />
      </section>
    </main>

    <footer className="relative z-10 border-t border-line py-8">
      <div className="container flex flex-col justify-between gap-2 text-sm text-ink-muted sm:flex-row">
        <span className="font-display text-ink">Starbound<span className="text-flame">.</span></span>
        <span>Space mission analytics and success prediction, built with FastAPI and scikit-learn.</span>
      </div>
    </footer>
  </div>
);

export default Index;
