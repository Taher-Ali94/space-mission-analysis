import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Rocket from "@/components/Rocket";

type Phase = "standby" | "countdown" | "ignition" | "liftoff" | "flown";

const COUNT_FROM = 3;
const TICK_MS = 850;
const IGNITION_MS = 1100;
const LIFTOFF_S = 3.4;

/** Smoke puffs that billow out from the pad while the engine fires. */
const SMOKE = [
  { x: -150, y: -10, s: 2.6, d: 0 },
  { x: -95, y: -30, s: 2.1, d: 0.08 },
  { x: -50, y: -6, s: 1.8, d: 0.15 },
  { x: 50, y: -8, s: 1.9, d: 0.05 },
  { x: 100, y: -28, s: 2.2, d: 0.12 },
  { x: 155, y: -12, s: 2.7, d: 0.02 },
  { x: -10, y: -16, s: 1.6, d: 0.2 },
];

const LaunchTower = () => (
  <svg viewBox="0 0 70 300" className="absolute bottom-[34px] left-1/2 h-[min(56vh,420px)] -translate-x-[120%]" aria-hidden="true">
    <g stroke="hsl(var(--line-strong))" strokeWidth="2" fill="none">
      <line x1="10" y1="0" x2="10" y2="300" />
      <line x1="40" y1="0" x2="40" y2="300" />
      {Array.from({ length: 10 }).map((_, i) => (
        <g key={i}>
          <line x1="10" y1={i * 30} x2="40" y2={i * 30 + 30} />
          <line x1="40" y1={i * 30} x2="10" y2={i * 30 + 30} />
        </g>
      ))}
      {/* Swing arms */}
      <line x1="40" y1="70" x2="66" y2="70" />
      <line x1="40" y1="150" x2="66" y2="150" />
    </g>
  </svg>
);

const LaunchHero = () => {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("standby");
  const [count, setCount] = useState(COUNT_FROM);
  const [run, setRun] = useState(0);

  // Drive the launch sequence. Each `run` replays it from the top.
  useEffect(() => {
    if (reduceMotion) return;
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));

    setPhase("standby");
    setCount(COUNT_FROM);
    const start = run === 0 ? 700 : 150;

    at(start, () => setPhase("countdown"));
    for (let i = 1; i < COUNT_FROM; i++) at(start + i * TICK_MS, () => setCount(COUNT_FROM - i));
    const ignite = start + COUNT_FROM * TICK_MS;
    at(ignite, () => {
      setCount(0);
      setPhase("ignition");
    });
    at(ignite + IGNITION_MS, () => setPhase("liftoff"));
    at(ignite + IGNITION_MS + LIFTOFF_S * 1000, () => setPhase("flown"));

    return () => timers.forEach(clearTimeout);
  }, [run, reduceMotion]);

  const burning = phase === "ignition" || phase === "liftoff";
  const smoking = phase === "ignition" || phase === "liftoff";

  return (
    <section className="relative overflow-hidden pt-16 md:min-h-[100svh]">
      <div className="container grid items-center md:min-h-[calc(100svh-4rem)] gap-4 md:grid-cols-[1.05fr_0.95fr] md:gap-10">
        {/* Copy */}
        <div className="relative z-10 max-w-xl pt-8 md:py-12">
          <h1 className="font-display text-[clamp(2.6rem,6.4vw,5.2rem)] font-semibold leading-[0.98] tracking-[-0.02em] text-ink">
            Will this mission reach orbit?
          </h1>
          <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-ink-muted">
            Explore 500 simulated missions launched between 2025 and 2034, see which parameters decide
            success, and test a mission of your own against a Random Forest model.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a
              href="#predictor"
              className="inline-flex h-12 items-center rounded-full bg-flame px-6 font-medium text-night transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-flame"
            >
              Test a mission
            </a>
            <a
              href="#analytics"
              className="inline-flex h-12 items-center rounded-full border border-line-strong px-6 font-medium text-ink transition-colors hover:border-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plasma"
            >
              Explore the data
            </a>
          </div>
        </div>

        {/* Launch scene */}
        <div className="relative h-[40svh] min-h-[300px] md:h-[78vh] md:min-h-[420px]" aria-label="Rocket launch animation" role="img">
          {/* Ground + pad */}
          <div className="absolute inset-x-0 bottom-0 h-[34px] border-t border-line-strong bg-gradient-to-b from-panel to-transparent" />
          <div className="absolute bottom-[34px] left-1/2 h-3 w-40 -translate-x-1/2 rounded-t-md bg-line-strong" />
          <LaunchTower />

          {/* Exhaust trail, grows upward as the rocket climbs */}
          <div className="absolute bottom-[46px] left-1/2 -translate-x-1/2">
          <motion.div
            className="absolute bottom-0 left-[-3px] w-[6px] rounded-full"
            style={{
              height: "200vh",
              originY: 1,
              background: "linear-gradient(to top, hsl(var(--flame) / 0.0), hsl(var(--flame) / 0.55) 8%, hsl(var(--flame) / 0.15) 60%, transparent)",
              filter: "blur(2px)",
            }}
            initial={{ scaleY: 0, opacity: 0 }}
            animate={
              phase === "liftoff"
                ? { scaleY: 1, opacity: 1, transition: { duration: LIFTOFF_S, ease: [0.55, 0, 0.9, 0.55] } }
                : phase === "flown"
                  ? { scaleY: 1, opacity: 0.25, transition: { duration: 1.6 } }
                  : { scaleY: 0, opacity: 0, transition: { duration: 0.3 } }
            }
          />
          </div>

          {/* Smoke */}
          <div className="pointer-events-none absolute bottom-[40px] left-1/2">
            {SMOKE.map((p, i) => (
              <motion.span
                key={i}
                className="absolute -left-10 -top-10 h-20 w-20 rounded-full bg-[hsl(var(--smoke)/0.7)] blur-lg"
                initial={{ opacity: 0, scale: 0.2, x: 0, y: 0 }}
                animate={
                  smoking
                    ? {
                        opacity: [0, 0.85, 0],
                        scale: [0.3, p.s],
                        x: [0, p.x],
                        y: [0, p.y],
                        transition: { duration: 2.4, delay: p.d, repeat: Infinity, ease: "easeOut" },
                      }
                    : { opacity: 0, transition: { duration: 1.2 } }
                }
              />
            ))}
          </div>

          {/* Rocket */}
          <div className="absolute bottom-[46px] left-1/2 w-[clamp(64px,7vw,92px)] -translate-x-1/2">
          <motion.div
            key={run}
            initial={{ y: 0, opacity: run === 0 ? 1 : 0 }}
            animate={
              phase === "ignition"
                ? { y: 0, x: [-1.5, 1.5, -1, 1, 0], opacity: 1, transition: { x: { duration: 0.12, repeat: Infinity } } }
                : phase === "liftoff" || phase === "flown"
                  ? { y: "-140vh", x: 0, opacity: 1, transition: { duration: LIFTOFF_S, ease: [0.55, 0, 0.9, 0.55] } }
                  : { y: 0, x: 0, opacity: 1, transition: { duration: 0.4 } }
            }
          >
            <Rocket burning={burning} thrust={phase === "ignition" ? 0.55 : 1} className="h-auto w-full drop-shadow-[0_0_24px_rgba(255,166,43,0.25)]" />
          </motion.div>
          </div>

          {/* Countdown readout */}
          <div className="absolute bottom-[70px] left-1/2 ml-[clamp(60px,8vw,110px)] min-w-[9rem]" aria-live="polite">
            <AnimatePresence mode="wait">
              {phase === "countdown" && (
                <motion.span
                  key={count}
                  className="block font-display text-6xl font-semibold tabular-nums text-ink"
                  initial={{ opacity: 0, y: 12, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                >
                  T–{count}
                </motion.span>
              )}
              {(phase === "ignition" || phase === "liftoff") && (
                <motion.span
                  key="liftoff"
                  className="block font-display text-2xl font-semibold text-flame"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {phase === "ignition" ? "Ignition" : "Liftoff"}
                </motion.span>
              )}
              {phase === "flown" && (
                <motion.button
                  key="again"
                  type="button"
                  onClick={() => setRun((r) => r + 1)}
                  className="rounded-full border border-line-strong px-4 py-2 text-sm text-ink-muted transition-colors hover:border-flame hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  Launch again
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LaunchHero;
