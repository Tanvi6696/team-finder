import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import toast from 'react-hot-toast'
import { Share2 } from 'lucide-react'
import TopBar from '../components/TopBar'
import EmptyState from '../components/EmptyState'
import StudentDrawer from '../components/StudentDrawer'
import { api } from '../api'
import { CONNECTION_COLORS } from '../lib/match'
import { useTheme } from '../context/ThemeContext'

export default function Network() {
  const { dark } = useTheme()
  const graphRef = useRef()
  const wrapRef = useRef()
  const [raw, setRaw] = useState({ nodes: [], edges: [] })
  const [loading, setLoading] = useState(true)
  const [size, setSize] = useState({ w: 600, h: 420 })
  const [selectedId, setSelectedId] = useState(null)
  const [profile, setProfile] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sideLinks, setSideLinks] = useState([])

  useEffect(() => {
    setLoading(true)
    api
      .getConnections()
      .then(setRaw)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Keep graph sized to its container (mobile-friendly)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return undefined
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ w: Math.max(280, width), h: Math.max(320, height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const graphData = useMemo(() => {
    const nodes = (raw.nodes || []).map((n) => ({
      id: n.id,
      name: n.label,
      experience_level: n.experience_level,
      department_code: n.department_code,
      availability_status: n.availability_status,
    }))
    const links = (raw.edges || []).map((e) => ({
      source: e.source,
      target: e.target,
      weight: e.weight,
      connection_type: e.connection_type,
      color: CONNECTION_COLORS[e.connection_type] || '#94a3b8',
    }))
    return { nodes, links }
  }, [raw])

  const openNode = useCallback(async (node) => {
    setSelectedId(node.id)
    setDrawerOpen(true)
    setProfile(null)
    const linked = (raw.edges || [])
      .filter((e) => e.source === node.id || e.target === node.id)
      .map((e) => {
        const otherId = e.source === node.id ? e.target : e.source
        const other = (raw.nodes || []).find((n) => n.id === otherId)
        return {
          ...e,
          other_name: other?.label || `#${otherId}`,
        }
      })
    setSideLinks(linked)
    try {
      const full = await api.getStudent(node.id)
      setProfile(full)
    } catch (err) {
      toast.error(err.message)
    }
  }, [raw])

  return (
    <>
      <TopBar title="Network" subtitle="Force-directed view of team_connections" />

      <div className="flex flex-1 flex-col gap-4 overflow-hidden px-4 py-5 sm:px-6">
        <div className="flex flex-wrap gap-2">
          {Object.entries(CONNECTION_COLORS).map(([type, color]) => (
            <span key={type} className="chip bg-white/60 dark:bg-white/5">
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: color }} />
              {type.replaceAll('_', ' ')}
            </span>
          ))}
        </div>

        <div
          ref={wrapRef}
          className="glass relative min-h-[360px] flex-1 overflow-hidden"
        >
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="skeleton h-40 w-40 !rounded-full" />
            </div>
          ) : graphData.nodes.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6">
              <EmptyState
                icon={Share2}
                title="No connections yet"
                description="team_connections will appear here as a graph."
              />
            </div>
          ) : (
            <ForceGraph2D
              ref={graphRef}
              width={size.w}
              height={size.h}
              graphData={graphData}
              backgroundColor="rgba(0,0,0,0)"
              nodeRelSize={6}
              linkWidth={(l) => Math.max(1, (l.weight || 1) / 25)}
              linkColor={(l) => l.color}
              linkDirectionalParticles={1}
              linkDirectionalParticleWidth={1.5}
              nodeCanvasObject={(node, ctx, globalScale) => {
                const label = node.name || String(node.id)
                const fontSize = 12 / globalScale
                const r = 5
                ctx.beginPath()
                ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false)
                ctx.fillStyle = node.id === selectedId ? '#a855f7' : '#6366f1'
                ctx.fill()
                ctx.font = `${fontSize}px Sans-Serif`
                ctx.textAlign = 'center'
                ctx.textBaseline = 'top'
                ctx.fillStyle = dark ? '#e2e8f0' : '#334155'
                ctx.fillText(label, node.x, node.y + r + 1)
              }}
              onNodeClick={openNode}
            />
          )}
        </div>

        {sideLinks.length > 0 && drawerOpen ? (
          <div className="glass p-3 text-xs text-slate-500 sm:hidden">
            {sideLinks.length} connection(s) — see drawer for details
          </div>
        ) : null}
      </div>

      <StudentDrawer
        student={
          profile
            ? {
                ...profile,
                // Append connection summary into bio area via extra field rendered below — keep profile as-is
              }
            : null
        }
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      {/* Connection list overlay under drawer title area — shown as toast-free panel when open */}
      {drawerOpen && sideLinks.length > 0 ? (
        <div className="pointer-events-none fixed bottom-20 right-4 z-[55] hidden w-72 sm:block">
          <div className="pointer-events-auto glass-strong p-3 text-sm shadow-xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Connections
            </p>
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {sideLinks.map((l) => (
                <li key={l.connection_id || `${l.source}-${l.target}`} className="flex justify-between gap-2">
                  <span>{l.other_name}</span>
                  <span className="text-xs" style={{ color: CONNECTION_COLORS[l.connection_type] }}>
                    {l.weight}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  )
}
