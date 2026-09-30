import { useEffect, useRef } from 'react'

/**
 * Animated constellation canvas — drifting student nodes that connect when close,
 * gently attract toward the cursor, and can warp/zoom on successful login.
 * Honors prefers-reduced-motion (static starfield only).
 */
export default function ConstellationCanvas({ warping = false, className = '' }) {
  const canvasRef = useRef(null)
  const mouseRef = useRef({ x: -9999, y: -9999, active: false })
  const warpRef = useRef(0)
  const nodesRef = useRef([])
  const rafRef = useRef(0)

  useEffect(() => {
    warpRef.current = warping ? 1 : 0
  }, [warping])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const ctx = canvas.getContext('2d')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const NODE_COUNT = 48
    const CONNECT_DIST = 110

    function resize() {
      const parent = canvas.parentElement
      const w = parent?.clientWidth || window.innerWidth
      const h = parent?.clientHeight || window.innerHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      return { w, h }
    }

    let { w, h } = resize()

    // Seed nodes once (random but stable for this mount)
    nodesRef.current = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: 1.6 + Math.random() * 2.4,
      hue: 160 + Math.random() * 80, // teal → cyan → soft violet
      pulse: Math.random() * Math.PI * 2,
    }))

    function onMove(e) {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      }
    }
    function onLeave() {
      mouseRef.current.active = false
    }
    function onResize() {
      ;({ w, h } = resize())
    }

    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerleave', onLeave)
    window.addEventListener('resize', onResize)

    function drawStatic() {
      ctx.clearRect(0, 0, w, h)
      // Soft aurora wash
      const g = ctx.createRadialGradient(w * 0.3, h * 0.2, 0, w * 0.5, h * 0.5, w * 0.8)
      g.addColorStop(0, 'rgba(45, 212, 191, 0.12)')
      g.addColorStop(0.45, 'rgba(56, 189, 248, 0.06)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)

      for (const n of nodesRef.current) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${n.hue}, 80%, 70%, 0.7)`
        ctx.fill()
      }
    }

    function tick() {
      if (reduceMotion) {
        drawStatic()
        return
      }

      const mouse = mouseRef.current
      const warp = warpRef.current
      const cx = w / 2
      const cy = h / 2

      // Fade trail for a soft motion blur feel
      ctx.fillStyle = 'rgba(4, 6, 12, 0.28)'
      ctx.fillRect(0, 0, w, h)

      // Aurora glow behind nodes
      const aurora = ctx.createRadialGradient(
        w * 0.35 + Math.sin(Date.now() / 4000) * 40,
        h * 0.3,
        40,
        w * 0.5,
        h * 0.55,
        Math.max(w, h) * 0.7,
      )
      aurora.addColorStop(0, 'rgba(45, 212, 191, 0.07)')
      aurora.addColorStop(0.4, 'rgba(56, 189, 248, 0.04)')
      aurora.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = aurora
      ctx.fillRect(0, 0, w, h)

      const nodes = nodesRef.current

      for (const n of nodes) {
        // Cursor attraction
        if (mouse.active) {
          const dx = mouse.x - n.x
          const dy = mouse.y - n.y
          const dist = Math.hypot(dx, dy) || 1
          if (dist < 180) {
            n.vx += (dx / dist) * 0.04
            n.vy += (dy / dist) * 0.04
          }
        }

        // Warp: pull toward center and accelerate outward
        if (warp > 0) {
          const dx = n.x - cx
          const dy = n.y - cy
          n.vx += dx * 0.012
          n.vy += dy * 0.012
          n.x = cx + dx * (1 + 0.018)
          n.y = cy + dy * (1 + 0.018)
        }

        n.vx *= 0.99
        n.vy *= 0.99
        n.x += n.vx
        n.y += n.vy
        n.pulse += 0.03

        // Soft wrap
        if (n.x < -20) n.x = w + 20
        if (n.x > w + 20) n.x = -20
        if (n.y < -20) n.y = h + 20
        if (n.y > h + 20) n.y = -20
      }

      // Connection lines
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i]
          const b = nodes[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.hypot(dx, dy)
          if (dist < CONNECT_DIST) {
            const alpha = (1 - dist / CONNECT_DIST) * 0.45
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = `rgba(125, 211, 252, ${alpha})`
            ctx.lineWidth = 0.8
            ctx.stroke()
          }
        }
      }

      // Nodes
      for (const n of nodes) {
        let glow = 0
        if (mouse.active) {
          const dist = Math.hypot(mouse.x - n.x, mouse.y - n.y)
          if (dist < 140) glow = 1 - dist / 140
        }
        const pulse = 0.6 + Math.sin(n.pulse) * 0.25
        const radius = n.r * (1 + glow * 1.4) * (1 + warp * 0.8)

        if (glow > 0.05 || warp > 0) {
          const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, radius * 6)
          grd.addColorStop(0, `hsla(${n.hue}, 90%, 70%, ${0.35 + glow * 0.4})`)
          grd.addColorStop(1, 'hsla(180, 80%, 60%, 0)')
          ctx.fillStyle = grd
          ctx.beginPath()
          ctx.arc(n.x, n.y, radius * 6, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${n.hue}, 85%, ${65 + glow * 20}%, ${pulse})`
        ctx.fill()
      }

      // Warp vignette stretch
      if (warp > 0) {
        const vg = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(w, h) * 0.7)
        vg.addColorStop(0, 'rgba(255,255,255,0.08)')
        vg.addColorStop(0.4, 'rgba(56,189,248,0.05)')
        vg.addColorStop(1, 'rgba(4,6,12,0.55)')
        ctx.fillStyle = vg
        ctx.fillRect(0, 0, w, h)
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    // Initial clear to near-black
    ctx.fillStyle = '#04060c'
    ctx.fillRect(0, 0, w, h)

    if (reduceMotion) {
      drawStatic()
    } else {
      rafRef.current = requestAnimationFrame(tick)
    }

    return () => {
      cancelAnimationFrame(rafRef.current)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
    />
  )
}
