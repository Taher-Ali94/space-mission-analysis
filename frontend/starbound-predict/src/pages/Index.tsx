import StarField from "@/components/StarField";
import Navbar from "@/components/Navbar";
import KPICards from "@/components/KPICards";
import AnalyticsCharts from "@/components/AnalyticsCharts";
import PredictionForm from "@/components/PredictionForm";
import SectionHeader from "@/components/SectionHeader";

const Index = () => (
  <div className="relative min-h-screen">
    <StarField />
    <Navbar />

    <main className="relative z-10 pt-24 pb-20 px-4">
      {/* Hero */}
      <section className="container mb-20 text-center animate-rocket-launch">
        <p className="text-sm font-medium text-primary mb-3 tracking-widest uppercase">Mission Control Center</p>
        <h1 className="text-4xl sm:text-6xl font-extrabold gradient-text mb-4">
          Space Mission Analytics
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Explore mission data, visualize trends, and predict success rates with machine learning.
        </p>
      </section>

      {/* Dashboard */}
      <section id="dashboard" className="container mb-24 scroll-mt-20">
        <SectionHeader title="Dashboard Overview" subtitle="Key performance indicators across all space missions" />
        <KPICards />
      </section>

      {/* Analytics */}
      <section id="analytics" className="container mb-24 scroll-mt-20">
        <SectionHeader title="Mission Analytics" subtitle="Interactive visualizations of mission data and launch vehicle performance" />
        <AnalyticsCharts />
      </section>

      {/* Predictor */}
      <section id="predictor" className="container scroll-mt-20">
        <SectionHeader title="ML Prediction Tool" subtitle="Enter mission parameters to predict the probability of success" />
        <PredictionForm />
      </section>
    </main>

    <footer className="relative z-10 border-t border-border py-6 text-center text-sm text-muted-foreground">
      <p>🚀 Space Mission Analytics & Predictor — Powered by ML</p>
    </footer>
  </div>
);

export default Index;
