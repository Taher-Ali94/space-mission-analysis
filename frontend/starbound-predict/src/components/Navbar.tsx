import { useEffect, useState } from "react";

const navItems = [
  { label: "Overview", href: "#overview" },
  { label: "Analytics", href: "#analytics" },
  { label: "Predictor", href: "#predictor" },
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? "border-b border-line bg-night/80 backdrop-blur-xl" : "border-b border-transparent"
      }`}
    >
      <div className="container flex h-16 items-center justify-between">
        <a href="#top" className="font-display text-[0.95rem] font-semibold tracking-tight text-ink">
          Starbound<span className="text-flame">.</span>
        </a>
        <div className="flex gap-0.5 sm:gap-1">
          {navItems.map((item, i) => (
            <a
              key={item.href}
              href={item.href}
              className={`${i === 0 ? "hidden sm:inline-flex " : ""}rounded-full px-2.5 py-2 text-sm text-ink-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-flame sm:px-4`}
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
