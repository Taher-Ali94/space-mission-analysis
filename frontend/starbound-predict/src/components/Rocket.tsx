import { motion } from "framer-motion";

interface RocketProps {
  /** Show the engine plume */
  burning?: boolean;
  /** Plume strength 0–1 (ignition ramps this up) */
  thrust?: number;
  className?: string;
}

/**
 * A side-on launch vehicle drawn in SVG. The plume flickers with a looping
 * scale animation while `burning` is true.
 */
const Rocket = ({ burning = false, thrust = 1, className }: RocketProps) => (
  <svg viewBox="0 0 80 260" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="rk-body" x1="0" x2="1">
        <stop offset="0" stopColor="#C9D2EC" />
        <stop offset="0.45" stopColor="#F4F6FC" />
        <stop offset="1" stopColor="#9AA6CC" />
      </linearGradient>
      <linearGradient id="rk-plume" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFF4D6" />
        <stop offset="0.25" stopColor="#FFC94A" />
        <stop offset="0.6" stopColor="#FF7A1A" stopOpacity="0.85" />
        <stop offset="1" stopColor="#FF4D1A" stopOpacity="0" />
      </linearGradient>
    </defs>

    {/* Plume — drawn first so it sits behind the nozzle */}
    {burning && (
      <motion.g
        style={{ originX: "40px", originY: "176px" }}
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ scaleY: [thrust * 0.9, thrust * 1.08, thrust * 0.95, thrust], opacity: 1 }}
        transition={{
          scaleY: { duration: 0.18, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" },
          opacity: { duration: 0.2 },
        }}
      >
        <path d="M28 176 C 26 205, 34 235, 40 258 C 46 235, 54 205, 52 176 Z" fill="url(#rk-plume)" />
        <path d="M34 176 C 33 192, 37 208, 40 220 C 43 208, 47 192, 46 176 Z" fill="#FFF8E8" opacity="0.9" />
      </motion.g>
    )}

    {/* Fins */}
    <path d="M24 130 L6 168 L6 178 L26 166 Z" fill="#E2483D" />
    <path d="M56 130 L74 168 L74 178 L54 166 Z" fill="#E2483D" />

    {/* Body */}
    <path d="M40 4 C 56 26, 58 60, 58 96 L58 166 L22 166 L22 96 C 22 60, 24 26, 40 4 Z" fill="url(#rk-body)" />
    {/* Nose band */}
    <path d="M30 30 C 34 22, 46 22, 50 30 L52 38 L28 38 Z" fill="#E2483D" />
    {/* Porthole */}
    <circle cx="40" cy="70" r="8" fill="#1A2550" stroke="#8FD3FF" strokeWidth="2.5" />
    <circle cx="37.5" cy="67.5" r="2.2" fill="#BFE7FF" opacity="0.8" />
    {/* Stage seam */}
    <rect x="22" y="118" width="36" height="3" fill="#7C88B3" />
    {/* Centre fin */}
    <rect x="38" y="140" width="4" height="34" rx="1" fill="#B8352C" />
    {/* Nozzle */}
    <path d="M28 166 L52 166 L49 178 L31 178 Z" fill="#4A557F" />
  </svg>
);

export default Rocket;
