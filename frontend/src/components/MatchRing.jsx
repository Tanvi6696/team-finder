import { motion } from 'framer-motion'

/**
 * Animated circular match percentage ring.
 * Uses SVG stroke-dashoffset for a smooth fill animation.
 */
export default function MatchRing({ value = 0, size = 64, stroke = 6 }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c

  // Colour shifts with match quality
  const color =
    pct >= 70 ? '#22c55e' : pct >= 40 ? '#a855f7' : pct > 0 ? '#f59e0b' : '#94a3b8'

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-slate-200 dark:text-white/10"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <span className="absolute text-xs font-bold tabular-nums" style={{ color }}>
        {pct.toFixed(0)}%
      </span>
    </div>
  )
}
