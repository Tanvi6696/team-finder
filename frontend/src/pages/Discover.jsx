import { useCallback, useEffect, useMemo, useState } from 'react'
import { Filter, Plus, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import TopBar from '../components/TopBar'
import SkeletonCard from '../components/SkeletonCard'
import ProjectDrawer from '../components/ProjectDrawer'
import ProjectCard from '../components/ProjectCard'
import CreateProjectModal from '../components/CreateProjectModal'
import EmptyState from '../components/EmptyState'
import { api } from '../api'

function FilterChip({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'chip border transition',
        active
          ? 'border-transparent bg-accent-gradient text-white shadow-sm'
          : 'border-slate-200/80 bg-white/60 text-slate-600 hover:border-indigo-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

export default function Discover() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [domain, setDomain] = useState('ALL')
  const [difficulty, setDifficulty] = useState('ALL')
  const [status, setStatus] = useState('ALL')
  const [selectedId, setSelectedId] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [highlightId, setHighlightId] = useState(null)
  const [ownSkillCount, setOwnSkillCount] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    return api
      .getProjects()
      .then(setProjects)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const loadMySkillCount = useCallback(() => {
    return api.getMyProfile()
      .then((profile) => setOwnSkillCount((profile.skills || []).length))
      .catch(() => setOwnSkillCount(null))
  }, [])

  useEffect(() => {
    loadMySkillCount()
    const refresh = () => {
      load()
      loadMySkillCount()
    }
    window.addEventListener('profile-data-invalidated', refresh)
    return () => window.removeEventListener('profile-data-invalidated', refresh)
  }, [load, loadMySkillCount])

  useEffect(() => {
    if (!highlightId || loading) return undefined
    const timer = window.setTimeout(() => {
      document.getElementById(`project-card-${highlightId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
      window.setTimeout(() => setHighlightId(null), 2400)
    }, 120)
    return () => window.clearTimeout(timer)
  }, [highlightId, loading, projects])

  const domains = useMemo(
    () => ['ALL', ...new Set(projects.map((project) => project.domain).filter(Boolean))],
    [projects],
  )
  const difficulties = ['ALL', 'EASY', 'MEDIUM', 'HARD']
  const statuses = ['ALL', 'OPEN', 'FULL', 'IN_PROGRESS', 'COMPLETED']

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return projects
      .filter((project) => {
        if (domain !== 'ALL' && project.domain !== domain) return false
        if (difficulty !== 'ALL' && project.difficulty_level !== difficulty) return false
        if (status !== 'ALL' && project.project_status !== status) return false
        if (!query) return true
        const haystack = `${project.project_title} ${project.project_description} ${project.domain} ${project.creator_name}`.toLowerCase()
        return haystack.includes(query)
      })
      .sort((a, b) => (b.match_percentage || 0) - (a.match_percentage || 0))
  }, [projects, search, domain, difficulty, status])

  function openProject(id) {
    setSelectedId(id)
    setDrawerOpen(true)
  }

  function handlePublished(projectId) {
    setCreateOpen(false)
    setSearch('')
    setDomain('ALL')
    setDifficulty('ALL')
    setStatus('ALL')
    setHighlightId(projectId)
    load()
  }

  return (
    <>
      <TopBar
        title="Discover"
        subtitle="Browse open projects ranked by your skill match"
        action={(
          <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Project
          </button>
        )}
      />

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        <div className="glass p-4">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search projects, domains, creators…"
              className="w-full rounded-xl border border-slate-200/70 bg-white/70 py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400 dark:border-white/10 dark:bg-white/5"
            />
          </div>

          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <Filter className="h-3.5 w-3.5" /> Filters
          </div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {domains.map((item) => (
              <FilterChip key={item} active={domain === item} onClick={() => setDomain(item)}>
                {item === 'ALL' ? 'All domains' : item}
              </FilterChip>
            ))}
          </div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {difficulties.map((item) => (
              <FilterChip key={item} active={difficulty === item} onClick={() => setDifficulty(item)}>
                {item === 'ALL' ? 'All difficulty' : item}
              </FilterChip>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {statuses.map((item) => (
              <FilterChip key={item} active={status === item} onClick={() => setStatus(item)}>
                {item === 'ALL' ? 'All status' : item}
              </FilterChip>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-slate-500">
          <p>Sorted by <span className="font-semibold text-indigo-600 dark:text-indigo-300">match %</span></p>
          <p className="tabular-nums">{loading ? '…' : `${filtered.length} projects`}</p>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)}
          </div>
        ) : projects.length === 0 ? (
          <div className="space-y-4">
            {ownSkillCount === 0 ? (
              <EmptyState
                title="Add skills to see your match %"
                description="Add your skills to see relevant project matches and teammate suggestions."
                action={<Link to="/profile#skills" className="btn-primary">Add skills</Link>}
              />
            ) : null}
            <EmptyState
              title="No projects yet. Be the first to create one."
              description="Start a project and find teammates with the skills you need."
              action={(
                <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" /> Create your first project
                </button>
              )}
            />
          </div>
        ) : ownSkillCount === 0 ? (
          <EmptyState
            title="Add skills to see your match %"
            description="Add your skills to see relevant project matches and teammate suggestions."
            action={<Link to="/profile#skills" className="btn-primary">Add skills</Link>}
          />
        ) : filtered.length === 0 ? (
          <EmptyState title="No projects match" description="Try clearing search or filter chips." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((project) => (
              <ProjectCard
                key={project.project_id}
                project={project}
                onOpen={openProject}
                highlight={project.project_id === highlightId}
              />
            ))}
          </div>
        )}
      </div>

      <ProjectDrawer
        projectId={selectedId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onJoined={load}
        onStatusChanged={load}
      />
      <CreateProjectModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onPublished={handlePublished}
      />
    </>
  )
}
