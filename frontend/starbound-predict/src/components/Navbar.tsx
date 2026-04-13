const navItems = [
  { label: "Dashboard", href: "#dashboard" },
  { label: "Analytics", href: "#analytics" },
  { label: "Predictor", href: "#predictor" },
];

const Navbar = () => (
  <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
    <div className="container flex h-16 items-center justify-between">
      <span className="text-xl font-bold gradient-text">🚀 Space Mission Analytics</span>
      <div className="hidden sm:flex gap-1">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            {item.label}
          </a>
        ))}
      </div>
    </div>
  </nav>
);

export default Navbar;
