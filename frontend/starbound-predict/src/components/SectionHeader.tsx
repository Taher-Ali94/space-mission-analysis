const SectionHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="text-center mb-12">
    <h2 className="text-3xl sm:text-4xl font-bold gradient-text mb-3">{title}</h2>
    <p className="text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
  </div>
);

export default SectionHeader;
