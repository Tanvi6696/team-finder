import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  X,
  Loader2,
  Compass,
  FolderKanban,
  Sparkles,
  Send,
  AlertCircle,
  Plus,
} from 'lucide-react'
import toast from 'react-hot-toast'
import TopBar from '../components/TopBar'
import MatchRing from '../components/MatchRing'
import EmptyState from '../components/EmptyState'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useHood, extractTeamSizes } from '../context/HoodContext'
import CreateProjectModal from '../components/CreateProjectModal'

const STATUS_STYLES = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
  ACCEPTED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  REJECTED: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  CANCELLED: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4, ease: 'easeOut' },
})

function SectionTitle({ children, action }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="font-display text-lg font-bold">{children}</h2>
      {action}
    </div>
  )
}

export default function Home() {
  const { user } = useAuth()
  const { logCommit, logRollback } = useHood()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [highlightProjectId, setHighlightProjectId] = useState(null)
  const [dismissProfileHint, setDismissProfileHint] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    return api
      .getMeDashboard()
      .then(setData)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const refresh = () => load()
    window.addEventListener('profile-data-invalidated', refresh)
    return () => window.removeEventListener('profile-data-invalidated', refresh)
  }, [load])

  useEffect(() => {
    if (!highlightProjectId || loading) return undefined
    const timer = window.setTimeout(() => {
      document.getElementById(`home-project-${highlightProjectId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
      window.setTimeout(() => setHighlightProjectId(null), 2400)
    }, 120)
    return () => window.clearTimeout(timer)
  }, [highlightProjectId, loading, data])

  function handlePublished(projectId) {
    setCreateOpen(false)
    setHighlightProjectId(projectId)
    load()
  }

  async function handleAccept(item) {
    setBusyId(item.request_id)
    try {
      const res = await api.acceptJoinRequest(item.request_id)
      const { before, after } = extractTeamSizes(res.executed)
      logCommit(`CALL accept_join_request(${item.request_id})`, res.executed)
      toast.success(`Accepted — team size ${before} → ${after}`)
      setData((prev) =>
        prev
          ? {
              ...prev,
              pending_received: prev.pending_received.filter(
                (r) => r.request_id !== item.request_id,
              ),
            }
          : prev,
      )
      // Refresh projects / matches after membership change
      setTimeout(load, 400)
    } catch (err) {
      logRollback(`CALL accept_join_request(${item.request_id})`, err.message, err.data?.executed)
      toast.error(err.message || 'Accept failed')
    } finally {
      setBusyId(null)
    }
  }

  async function handleReject(item) {
    setBusyId(item.request_id)
    try {
      const res = await api.rejectJoinRequest(item.request_id)
      logCommit(`CALL reject_join_request(${item.request_id})`, res.executed)
      toast.success('Request rejected')
      setData((prev) =>
        prev
          ? {
              ...prev,
              pending_received: prev.pending_received.filter(
                (r) => r.request_id !== item.request_id,
              ),
            }
          : prev,
      )
    } catch (err) {
      logRollback(`CALL reject_join_request(${item.request_id})`, err.message, err.data?.executed)
      toast.error(err.message || 'Reject failed')
    } finally {
      setBusyId(null)
    }
  }

  const name = data?.profile?.first_name || user?.first_name || 'there'
  const strength = data?.profile_strength?.percentage ?? 0
  const missing = data?.profile_strength?.missing || []

  return (
    <>
      <TopBar
        title="Home"
        subtitle="Your personal constellation"
        action={(
          <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Project
          </button>
        )}
      />

      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:px-6">
        {loading ? (
          <div className="space-y-4">
            <div className="glass h-40 skeleton" />
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="glass h-48 skeleton" />
              <div className="glass h-48 skeleton" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="glass h-40 skeleton" />
              <div className="glass h-40 skeleton" />
              <div className="glass h-40 skeleton" />
            </div>
          </div>
        ) : (
          <>
            {data.profile_strength?.percentage < 75 && !dismissProfileHint ? (
              <motion.aside {...fadeUp(0)} className="glass flex flex-wrap items-center justify-between gap-3 border-amber-300/30 bg-amber-50/60 px-4 py-3 dark:border-amber-400/10 dark:bg-amber-500/10">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Complete your profile to get better matches.{' '}
                  <Link to="/profile" className="font-bold underline underline-offset-2">Complete profile</Link>
                </p>
                <button type="button" className="btn-ghost !p-1.5" aria-label="Dismiss profile reminder" onClick={() => setDismissProfileHint(true)}>
                  <X className="h-4 w-4" />
                </button>
              </motion.aside>
            ) : null}

            {/* Hero */}
            <motion.section
              {...fadeUp(0)}
              className="glass relative overflow-hidden p-6 sm:p-8"
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-400/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-16 left-10 h-36 w-36 rounded-full bg-indigo-400/20 blur-3xl" />
              <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">
                    Constellation
                  </p>
                  <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                    Welcome back, <span className="accent-text">{name}</span>
                  </h1>
                  <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
                    {name !== 'there'
                      ? `Good to see you, ${name} — here is your match orbit for today.`
                      : 'Your match signals, requests, and project orbit — all in one place.'}
                  </p>
                  {missing.length > 0 ? (
                    <p className="mt-3 inline-flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      Complete your profile: {missing[0]}
                      {missing.length > 1 ? ` (+${missing.length - 1} more)` : ''}
                    </p>
                  ) : (
                    <p className="mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-300">
                      Profile looking strong — you are ready to collaborate.
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-center gap-2">
                  <MatchRing value={strength} size={96} stroke={8} />
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Profile strength
                  </span>
                </div>
              </div>
            </motion.section>

            <div className="grid gap-5 lg:grid-cols-2">
              {/* Needs your action */}
              <motion.section {...fadeUp(0.06)} className="glass p-5">
                <SectionTitle>Needs your action</SectionTitle>
                <AnimatePresence mode="popLayout">
                  {(data.pending_received || []).length === 0 ? (
                    <EmptyState
                      icon={Send}
                      title="No requests yet"
                      description="Explore projects and teammates will find you."
                      action={
                        <Link to="/discover" className="btn-primary">
                          <Compass className="h-4 w-4" /> Explore projects
                        </Link>
                      }
                    />
                  ) : (
                    <ul className="space-y-3">
                      {data.pending_received.map((item) => (
                        <motion.li
                          key={item.request_id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 60 }}
                          className="rounded-2xl border border-white/40 bg-white/50 p-4 dark:border-white/5 dark:bg-white/5"
                        >
                          <p className="font-display font-semibold">{item.project_title}</p>
                          <p className="text-sm text-slate-500">
                            from <span className="font-medium text-slate-700 dark:text-slate-200">{item.sender_name}</span>
                          </p>
                          {item.message ? (
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                              “{item.message}”
                            </p>
                          ) : null}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="btn-primary !px-3 !py-2"
                              disabled={busyId === item.request_id}
                              onClick={() => handleAccept(item)}
                            >
                              {busyId === item.request_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                              Accept
                            </button>
                            <button
                              type="button"
                              className="btn-ghost"
                              disabled={busyId === item.request_id}
                              onClick={() => handleReject(item)}
                            >
                              <X className="h-4 w-4" />
                              Reject
                            </button>
                          </div>
                        </motion.li>
                      ))}
                    </ul>
                  )}
                </AnimatePresence>
              </motion.section>

              {/* Skill gap */}
              <motion.section {...fadeUp(0.1)} className="glass p-5">
                <SectionTitle>Skill gap</SectionTitle>
                {(data.skill_gap || []).length === 0 ? (
                  <EmptyState
                    icon={Sparkles}
                    title="No gaps flagged"
                    description="Your skills already cover the open project graph."
                  />
                ) : (
                  <ul className="space-y-3">
                    {data.skill_gap.map((g, i) => (
                      <motion.li
                        key={g.skill_id}
                        {...fadeUp(0.12 + i * 0.04)}
                        className="rounded-2xl border border-violet-200/40 bg-violet-50/50 p-4 text-sm dark:border-violet-500/20 dark:bg-violet-500/10"
                      >
                        <p>
                          Learn <strong className="accent-text">{g.skill_name}</strong> to reach{' '}
                          <strong>{g.best_match_percent_if_added}%</strong>
                          {g.best_project_title ? (
                            <>
                              {' '}
                              on <strong>{g.best_project_title}</strong>
                            </>
                          ) : null}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Needed by {g.open_projects_needing} open project
                          {g.open_projects_needing === 1 ? '' : 's'}
                        </p>
                      </motion.li>
                    ))}
                  </ul>
                )}
              </motion.section>
            </div>

            {/* My projects carousel */}
            <motion.section {...fadeUp(0.14)}>
              <SectionTitle
                action={
                  <Link to="/discover" className="text-xs font-semibold text-indigo-500 hover:underline">
                    Browse all
                  </Link>
                }
              >
                My projects
              </SectionTitle>
              {(data.my_projects || []).length === 0 ? (
                <EmptyState
                  icon={FolderKanban}
                  title="No projects yet"
                  description="Create or join a project from Discover."
                  action={
                    <Link to="/discover" className="btn-primary">
                      <Compass className="h-4 w-4" /> Explore projects
                    </Link>
                  }
                />
              ) : (
                <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2">
                  {data.my_projects.map((p, i) => {
                    const pct = p.max_team_size
                      ? Math.min(100, (p.current_team_size / p.max_team_size) * 100)
                      : 0
                    return (
                      <motion.div
                        key={p.project_id}
                        id={`home-project-${p.project_id}`}
                        {...fadeUp(0.16 + i * 0.04)}
                        className={`glass w-72 shrink-0 snap-start p-4 ${p.project_id === highlightProjectId ? 'project-highlight' : ''}`}
                      >
                        <p className="font-display font-semibold leading-snug">{p.project_title}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="chip bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">
                            {p.role}
                          </span>
                          <span className={`chip ${p.project_status === 'CANCELLED'
                            ? 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                            : p.project_status === 'IN_PROGRESS'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200'
                              : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'}`}>
                            {p.project_status}
                          </span>
                        </div>
                        <div className="mt-4">
                          <div className="mb-1 flex justify-between text-xs text-slate-500">
                            <span>Team</span>
                            <span className="tabular-nums">
                              {p.current_team_size}/{p.max_team_size}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
                            <motion.div
                              className="h-full rounded-full bg-accent-gradient"
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6, delay: 0.2 }}
                            />
                          </div>
                          {p.deadline ? (
                            <p className="mt-2 text-xs text-slate-400">Due {p.deadline}</p>
                          ) : null}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </motion.section>

            {/* Best matches */}
            <motion.section {...fadeUp(0.18)}>
              <SectionTitle>Best matches for you</SectionTitle>
              {(data.top_matches || []).length === 0 ? (
                <EmptyState
                  title="No open matches"
                  description="You are already on every open project, or none are available."
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {data.top_matches.map((p, i) => (
                    <motion.div
                      key={p.project_id}
                      {...fadeUp(0.2 + i * 0.05)}
                      className="glass p-5"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-display font-semibold leading-snug">
                            {p.project_title}
                          </h3>
                          <p className="text-xs text-slate-500">{p.domain}</p>
                        </div>
                        <MatchRing value={p.match_percentage} size={56} stroke={5} />
                      </div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Missing skills
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(p.missing_skills || []).length === 0 ? (
                          <span className="chip bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                            Fully covered
                          </span>
                        ) : (
                          p.missing_skills.map((s) => (
                            <span
                              key={s.skill_id}
                              className="chip bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
                            >
                              {s.skill_name}
                            </span>
                          ))
                        )}
                      </div>
                      <Link
                        to="/discover"
                        className="mt-4 inline-flex text-xs font-semibold text-indigo-500 hover:underline"
                      >
                        Open in Discover →
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.section>

            {/* Sent requests */}
            <motion.section {...fadeUp(0.24)} className="glass p-5">
              <SectionTitle>My sent requests</SectionTitle>
              {(data.sent_requests || []).length === 0 ? (
                <EmptyState
                  icon={Send}
                  title="No requests yet"
                  description="Explore projects and send a join request."
                  action={
                    <Link to="/discover" className="btn-primary">
                      <Compass className="h-4 w-4" /> Explore projects
                    </Link>
                  }
                />
              ) : (
                <ul className="divide-y divide-white/30 dark:divide-white/5">
                  {data.sent_requests.map((r) => (
                    <li
                      key={r.request_id}
                      className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium">{r.project_title}</p>
                        <p className="text-xs text-slate-500">to {r.receiver_name}</p>
                      </div>
                      <span className={`chip ${STATUS_STYLES[r.request_status] || STATUS_STYLES.PENDING}`}>
                        {r.request_status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </motion.section>
          </>
        )}
      </div>
      <CreateProjectModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onPublished={handlePublished}
      />
    </>
  )
}
