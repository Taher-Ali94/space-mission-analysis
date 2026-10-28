const SectionHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <header className="mb-10 max-w-2xl">
    <h2 className="font-display text-[clamp(1.75rem,3.4vw,2.6rem)] font-semibold leading-tight tracking-[-0.015em] text-ink">
      {title}
    </h2>
    <p className="mt-3 text-base leading-relaxed text-ink-muted">{subtitle}</p>
  </header>
);

export default SectionHeader;
