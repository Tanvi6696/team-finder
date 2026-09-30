import { useEffect, useMemo, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Users,
  Calendar,
  Gauge,
  Send,
  Sparkles,
  Wand2,
  UserPlus,
  Loader2,
  MoreVertical,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useHood } from '../context/HoodContext'
import {
  computeMatchPercent,
  bestLearnHint,
} from '../lib/match'
import MatchRing from './MatchRing'
import JoinModal from './JoinModal'
import DrawerShell from './DrawerShell'

/**
 * Project detail drawer: match ring, What-If sim, Dream Team, Recruit.
 */
export default function ProjectDrawer({ projectId, open, onClose, onJoined, onStatusChanged }) {
  const { user } = useAuth()
  const studentId = user?.student_id
  const { logCommit, logRollback } = useHood()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const [statusBusy, setStatusBusy] = useState(false)

  // What-If: set of skill_ids counted as "known"
  const [activeSkills, setActiveSkills] = useState(() => new Set())

  // Dream team
  const [dreamLoading, setDreamLoading] = useState(false)
  const [dreamResult, setDreamResult] = useState(null)
  const [visiblePicks, setVisiblePicks] = useState(0)

  // Recruit (creator only)
  const [recruit, setRecruit] = useState(null)

  const load = useCallback(() => {
    if (!open || !projectId) return
    setLoading(true)
    setDreamResult(null)
    setVisiblePicks(0)
    setRecruit(null)
    api
      .getProject(projectId)
      .then((data) => {
        setProject(data)
        // Seed What-If with skills the student already matches
        const seed = new Set((data.matched_skills || []).map((s) => s.skill_id))
        setActiveSkills(seed)

        if (data.created_by === studentId) {
          api
            .recruitSuggestions(projectId)
            .then(setRecruit)
            .catch(() => setRecruit(null))
        }
      })
      .catch((err) => {
        toast.error(err.message)
        onClose()
      })
      .finally(() => setLoading(false))
  }, [open, projectId, studentId, onClose])

  useEffect(() => {
    load()
  }, [load])

  const whatIfPercent = useMemo(
    () => computeMatchPercent(project?.required_skills, activeSkills),
    [project, activeSkills],
  )

  const hint = useMemo(
    () => bestLearnHint(project?.required_skills, activeSkills),
    [project, activeSkills],
  )

  function toggleSkill(skillId) {
    setActiveSkills((prev) => {
      const next = new Set(prev)
      if (next.has(skillId)) next.delete(skillId)
      else next.add(skillId)
      return next
    })
  }

  async function runDreamTeam() {
    if (!project) return
    setDreamLoading(true)
    setDreamResult(null)
    setVisiblePicks(0)
    try {
      const res = await api.dreamTeam(project.project_id, 3)
      logCommit(`POST /projects/${project.project_id}/dream-team`, res.executed)
      setDreamResult(res)
      // Animate picks in one by one
      const n = (res.picks || []).length
      for (let i = 1; i <= n; i += 1) {
        await new Promise((r) => setTimeout(r, 380))
        setVisiblePicks(i)
      }
    } catch (err) {
      logRollback(`POST /projects/${project.project_id}/dream-team`, err.message)
      toast.error(err.message)
    } finally {
      setDreamLoading(false)
    }
  }

  async function changeStatus(nextStatus) {
    if (!project || statusBusy) return
    if (nextStatus === 'CANCELLED') {
      const confirmed = window.confirm(`Cancel "${project.project_title}"? Teammates will no longer find it in Discover.`)
      if (!confirmed) return
    }

    setStatusBusy(true)
    try {
      const result = await api.updateProjectStatus(project.project_id, nextStatus)
      setProject((current) => ({ ...current, project_status: result.project_status }))
      logCommit(`PATCH /projects/${project.project_id}/status`, result.executed)
      toast.success(nextStatus === 'CANCELLED' ? 'Project cancelled' : 'Project moved to In Progress')
      setManageOpen(false)
      onStatusChanged?.(result)
      if (nextStatus === 'CANCELLED') onClose()
    } catch (error) {
      logRollback(`PATCH /projects/${project.project_id}/status`, error.message, error.data?.executed)
      toast.error(error.message || 'Could not update project status')
    } finally {
      setStatusBusy(false)
    }
  }

  const progress =
    project && project.max_team_size
      ? Math.min(100, (project.current_team_size / project.max_team_size) * 100)
      : 0

  const isOwn = project && project.created_by === studentId
  const isFull = project?.project_status === 'FULL'
  const isCancelled = project?.project_status === 'CANCELLED'

  // Does the student actually have this required skill at min proficiency?
  function reallyHas(req) {
    return (project?.matched_skills || []).some((m) => m.skill_id === req.skill_id)
  }

  return (
    <>
      <DrawerShell
        open={open}
        onClose={onClose}
        subtitle="Project detail"
        title={loading ? 'Loading…' : project?.project_title || 'Project'}
        wide
        footer={
          <button
            type="button"
            className="btn-primary w-full"
            disabled={!project || isOwn || isFull || isCancelled || loading}
            onClick={() => setJoinOpen(true)}
          >
            <Send className="h-4 w-4" />
            {isOwn ? 'Your project' : isCancelled ? 'Project cancelled' : isFull ? 'Team full' : 'Request to Join'}
          </button>
        }
      >
        {loading || !project ? (
          <div className="space-y-3">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-5/6" />
            <div className="skeleton h-24 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {isOwn ? (
              <div className="flex items-center justify-between gap-3">
                <span className={`chip ${project.project_status === 'CANCELLED'
                  ? 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                  : 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200'}`}>
                  {project.project_status}
                </span>
                <div className="relative">
                  <button
                    type="button"
                    className="btn-ghost !py-2"
                    aria-haspopup="menu"
                    aria-expanded={manageOpen}
                    onClick={() => setManageOpen((value) => !value)}
                  >
                    <MoreVertical className="h-4 w-4" /> Manage
                  </button>
                  <AnimatePresence>
                    {manageOpen ? (
                      <motion.div
                        role="menu"
                        initial={{ opacity: 0, y: 5, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.98 }}
                        className="glass-strong absolute right-0 z-20 mt-2 w-56 overflow-hidden p-1 shadow-lift"
                      >
                        {project.project_status === 'COMPLETED' ? (
                          <p className="px-3 py-2 text-xs text-slate-500">Completed projects cannot be changed.</p>
                        ) : (
                          <>
                            <button
                              type="button"
                              role="menuitem"
                              className="w-full rounded-xl px-3 py-2 text-left text-sm transition hover:bg-indigo-50 disabled:opacity-50 dark:hover:bg-white/5"
                              disabled={statusBusy || project.project_status === 'IN_PROGRESS'}
                              onClick={() => changeStatus('IN_PROGRESS')}
                            >
                              Mark in progress
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              className="w-full rounded-xl px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
                              disabled={statusBusy || project.project_status === 'CANCELLED'}
                              onClick={() => changeStatus('CANCELLED')}
                            >
                              Cancel project
                            </button>
                          </>
                        )}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>
            ) : null}

            <div className="flex items-center gap-4">
              <MatchRing value={whatIfPercent} size={72} stroke={7} />
              <div className="space-y-1 text-sm text-slate-500 dark:text-slate-400">
                <p className="text-xs text-indigo-500">
                  What-If match · server base {project.match_percentage ?? 0}%
                </p>
                <p className="flex items-center gap-1.5">
                  <Gauge className="h-3.5 w-3.5" /> {project.difficulty_level}
                </p>
                <p className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> {project.deadline}
                  {project.days_left != null ? ` · ${project.days_left}d left` : ''}
                </p>
                <p>by {project.creator_name}</p>
              </div>
            </div>

            <section>
              <h3 className="mb-2 text-sm font-semibold">Description</h3>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {project.project_description}
              </p>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between text-sm">
                <h3 className="font-semibold">Team progress</h3>
                <span className="tabular-nums text-slate-500">
                  {project.current_team_size}/{project.max_team_size}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-accent-gradient"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.6 }}
                />
              </div>
            </section>

            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <Users className="h-4 w-4" /> Members
              </h3>
              <ul className="space-y-2">
                {(project.team_members || []).map((m) => (
                  <li
                    key={m.team_member_id}
                    className="flex items-center justify-between rounded-xl bg-white/50 px-3 py-2 text-sm dark:bg-white/5"
                  >
                    <span className="font-medium">{m.student_name}</span>
                    <span className="chip bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">
                      {m.member_role.replaceAll('_', ' ')}
                    </span>
                  </li>
                ))}
                {!project.team_members?.length ? (
                  <li className="text-sm text-slate-400">No members yet</li>
                ) : null}
              </ul>
            </section>

            {/* What-If simulator */}
            <section className="rounded-2xl border border-indigo-200/50 bg-indigo-50/40 p-4 dark:border-violet-500/20 dark:bg-violet-500/5">
              <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
                <Wand2 className="h-4 w-4 text-violet-500" /> What-If simulator
              </h3>
              <p className="mb-3 text-xs text-slate-500">
                Toggle required skills to simulate learning them. Match % updates instantly.
              </p>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {(project.required_skills || []).map((sk) => {
                  const on = activeSkills.has(sk.skill_id)
                  const owned = reallyHas(sk)
                  return (
                    <button
                      key={sk.skill_id}
                      type="button"
                      onClick={() => toggleSkill(sk.skill_id)}
                      className={[
                        'chip border transition',
                        on
                          ? 'border-transparent bg-accent-gradient text-white'
                          : 'border-slate-200 bg-white/70 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300',
                      ].join(' ')}
                      title={`weight ${sk.importance_weight}, min ${sk.minimum_proficiency}`}
                    >
                      {sk.skill_name}
                      {owned ? ' ✓' : ''}
                    </button>
                  )
                })}
              </div>
              {hint ? (
                <p className="text-xs font-medium text-violet-700 dark:text-violet-300">
                  Hint: learn <strong>{hint.skill_name}</strong> to reach{' '}
                  <strong>{hint.nextPercent}%</strong>
                </p>
              ) : (
                <p className="text-xs text-emerald-600 dark:text-emerald-300">
                  All required skills are active — max coverage for this project.
                </p>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold">Required skills</h3>
              <ul className="space-y-2">
                {(project.required_skills || []).map((sk) => {
                  const matched = activeSkills.has(sk.skill_id)
                  return (
                    <li
                      key={sk.skill_id}
                      className="flex items-center justify-between rounded-xl border border-white/40
                        bg-white/40 px-3 py-2 text-sm dark:border-white/5 dark:bg-white/5"
                    >
                      <div>
                        <p className="font-medium">{sk.skill_name}</p>
                        <p className="text-xs text-slate-500">min {sk.minimum_proficiency}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-violet-600 dark:text-violet-300">
                          wt {sk.importance_weight}
                        </span>
                        <span
                          className={`chip ${
                            matched
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                          }`}
                        >
                          {matched ? 'on' : 'off'}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>

            {/* Dream Team Builder */}
            <section>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                  <Sparkles className="h-4 w-4 text-indigo-500" /> Dream Team Builder
                </h3>
                <button
                  type="button"
                  className="btn-primary !px-3 !py-2"
                  disabled={dreamLoading}
                  onClick={runDreamTeam}
                >
                  {dreamLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Build
                </button>
              </div>

              <AnimatePresence>
                {dreamResult ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3"
                  >
                    <ul className="space-y-2">
                      <AnimatePresence>
                        {(dreamResult.picks || []).slice(0, visiblePicks).map((pick, idx) => (
                          <motion.li
                            key={pick.student_id}
                            initial={{ opacity: 0, x: 24 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.05 }}
                            className="rounded-xl bg-white/60 p-3 text-sm dark:bg-white/5"
                          >
                            <div className="mb-1 flex items-center justify-between">
                              <span className="font-semibold">
                                #{idx + 1} {pick.name}
                              </span>
                              <span className="text-xs text-indigo-500">
                                +{pick.weight_gained} wt
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {(pick.newly_covered_skills || []).map((sk) => (
                                <span
                                  key={sk.skill_id}
                                  className="chip bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                                >
                                  {sk.skill_name}
                                </span>
                              ))}
                            </div>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>

                    {visiblePicks >= (dreamResult.picks || []).length ? (
                      <div>
                        <div className="mb-1 flex justify-between text-xs">
                          <span>Final coverage</span>
                          <span className="font-semibold tabular-nums">
                            {dreamResult.final_coverage_percent}%
                          </span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
                          <motion.div
                            className="h-full rounded-full bg-accent-gradient"
                            initial={{ width: 0 }}
                            animate={{
                              width: `${dreamResult.final_coverage_percent || 0}%`,
                            }}
                            transition={{ duration: 0.7 }}
                          />
                        </div>
                        {!dreamResult.picks?.length ? (
                          <p className="mt-2 text-xs text-slate-500">
                            No available candidates add new skill coverage (seed data limit).
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </motion.div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Greedy picks: each step chooses the student covering the most uncovered weight.
                  </p>
                )}
              </AnimatePresence>
            </section>

            {/* Recruit suggestions — creator only */}
            {isOwn && recruit ? (
              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  <UserPlus className="h-4 w-4 text-violet-500" /> Recruit suggestions
                </h3>
                {recruit.uncovered_skills?.length ? (
                  <>
                    <p className="mb-2 text-xs text-slate-500">Uncovered skills on your team:</p>
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {recruit.uncovered_skills.map((s) => (
                        <span
                          key={s.skill_id}
                          className="chip bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
                        >
                          {s.skill_name}
                        </span>
                      ))}
                    </div>
                    <ul className="space-y-2">
                      {(recruit.best_fit_students || []).slice(0, 5).map((s) => (
                        <li
                          key={s.student_id}
                          className="flex items-center justify-between rounded-xl bg-white/50 px-3 py-2 text-sm dark:bg-white/5"
                        >
                          <div>
                            <p className="font-medium">{s.name}</p>
                            <p className="text-xs text-slate-500">
                              {(s.skills_covered || []).join(', ')}
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-indigo-500">
                            +{s.weight_covered} wt
                          </span>
                        </li>
                      ))}
                      {!recruit.best_fit_students?.length ? (
                        <li className="text-xs text-slate-400">
                          No available students cover the gaps right now.
                        </li>
                      ) : null}
                    </ul>
                  </>
                ) : (
                  <p className="text-xs text-emerald-600 dark:text-emerald-300">
                    Your team already covers every required skill.
                  </p>
                )}
              </section>
            ) : null}
          </div>
        )}
      </DrawerShell>

      <JoinModal
        open={joinOpen}
        project={project}
        onClose={() => setJoinOpen(false)}
        onSuccess={() => {
          setJoinOpen(false)
          onJoined?.()
          load()
        }}
      />
    </>
  )
}
