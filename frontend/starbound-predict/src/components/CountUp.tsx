import { useEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

interface CountUpProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}

/** Counts from 0 to `value` the first time it scrolls into view. */
const CountUp = ({ value, decimals = 0, prefix = "", suffix = "", duration = 1.4, className }: CountUpProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fmt = (n: number) =>
      `${prefix}${n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
    if (!inView || reduce) {
      el.textContent = fmt(reduce ? value : 0);
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (n) => (el.textContent = fmt(n)),
    });
    return () => controls.stop();
  }, [inView, reduce, value, decimals, prefix, suffix, duration]);

  return <span ref={ref} className={className} />;
};

export default CountUp;
