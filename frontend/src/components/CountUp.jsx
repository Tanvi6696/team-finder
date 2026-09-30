import { useEffect, useState } from 'react'
import { animate } from 'framer-motion'

/**
 * Animated count-up number for dashboard stat cards.
 */
export default function CountUp({ value = 0, duration = 1.1 }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const controls = animate(0, Number(value) || 0, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(Math.round(v)),
    })
    return () => controls.stop()
  }, [value, duration])

  return <span className="tabular-nums">{display}</span>
}
