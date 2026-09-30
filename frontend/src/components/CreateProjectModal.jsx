import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronLeft, ChevronRight, Loader2, Plus, Search, Sparkles, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useHood } from '../context/HoodContext'
import ProjectCard from './ProjectCard'

const PROFICIENCIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']
const PROFICIENCY_RANK = { BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 3, EXPERT: 4 }
const STEP_TITLES = ['Basics', 'Skills', 'Review']
const DESCRIPTION_LIMIT = 2000

function tomorrowLocal() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function ConfettiBurst() {
  const colors = ['#818cf8', '#c084fc', '#34d399', '#fbbf24', '#fb7185']
  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden" aria-hidden="true">
      {Array.from({ length: 44 }, (_, index) => (
        <motion.i
          key={index}
          className="absolute left-1/2 top-1/3 h-2 w-1.5 rounded-sm"
          style={{ backgroundColor: colors[index % colors.length] }}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
          animate={{
            opacity: 0,
            x: (Math.random() - 0.5) * window.innerWidth * 0.9,
            y: Math.random() * window.innerHeight * 0.8,
            rotate: Math.random() * 900 - 450,
            scale: 0.5,
          }}
          transition={{ duration: 1.15 + Math.random() * 0.65, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

function FieldError({ children }) {
  return children ? <p className="mt-1 text-xs font-medium text-rose-500" role="alert">{children}</p> : null
}

export default function CreateProjectModal({ open, onClose, onPublished }) {
  const { user } = useAuth()
  const { logCommit } = useHood()
  const titleId = useId()
  const domainListId = useId()
  const dialogRef = useRef(null)
  const titleRef = useRef(null)
  const stepContentRef = useRef(null)
  const previousFocusRef = useRef(null)
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    project_title: '',
    project_description: '',
    domain: '',
    difficulty_level: 'MEDIUM',
    max_team_size: 4,
    deadline: '',
  })
  const [skills, setSkills] = useState([])
  const [domains, setDomains] = useState([])
  const [studentSkills, setStudentSkills] = useState([])
  const [picked, setPicked] = useState([])
  const [skillQuery, setSkillQuery] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const [errors, setErrors] = useState({})
  const [errorVersion, setErrorVersion] = useState(0)
  const [publishing, setPublishing] = useState(false)
  const [celebrate, setCelebrate] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    previousFocusRef.current = document.activeElement
    setStep(0)
    setErrors({})
    setForm({ project_title: '', project_description: '', domain: '', difficulty_level: 'MEDIUM', max_team_size: 4, deadline: '' })
    setPicked([])
    setSkillQuery('')
    setLookupError('')
    setLookupLoading(true)
    document.body.style.overflow = 'hidden'
    titleRef.current?.focus()

    Promise.all([api.getSkills(), api.getProjects(), api.getStudent(user?.student_id)])
      .then(([skillRows, projectRows, student]) => {
        setSkills(skillRows)
        setDomains([...new Set(projectRows.map((project) => project.domain).filter(Boolean))].sort())
        setStudentSkills(student.skills || [])
      })
      .catch((error) => {
        setLookupError(error.message || 'Could not load skills. Please try again.')
        toast.error(error.message || 'Could not load project form data')
      })
      .finally(() => setLookupLoading(false))

    return () => {
      document.body.style.overflow = ''
      previousFocusRef.current?.focus?.()
    }
  }, [open, user?.student_id])

  useEffect(() => {
    if (!open) return undefined
    function onKeyDown(event) {
      if (event.key === 'Escape' && !publishing) {
        event.preventDefault()
        onClose()
      }
      if (event.key !== 'Tab') return
      const focusable = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, publishing])

  useEffect(() => {
    if (open) stepContentRef.current?.focus()
  }, [open, step])

  const visibleSkills = useMemo(() => {
    const query = skillQuery.trim().toLowerCase()
    return skills.filter((skill) =>
      `${skill.skill_name} ${skill.skill_category || ''}`.toLowerCase().includes(query),
    )
  }, [skills, skillQuery])

  const skillGroups = useMemo(() => {
    return visibleSkills.reduce((groups, skill) => {
      const category = skill.skill_category || 'Other skills'
      groups[category] = [...(groups[category] || []), skill]
      return groups
    }, {})
  }, [visibleSkills])

  const previewProject = useMemo(() => {
    const ownById = new Map(studentSkills.map((skill) => [skill.skill_id, skill]))
    const required = picked.map((entry) => ({
      ...entry,
      skill_name: skills.find((skill) => skill.skill_id === entry.skill_id)?.skill_name || 'Skill',
    }))
    const matched = []
    const missing = []
    let totalWeight = 0
    let earnedWeight = 0
    required.forEach((requiredSkill) => {
      const weight = Number(requiredSkill.importance_weight) || 0
      totalWeight += weight
      const own = ownById.get(requiredSkill.skill_id)
      if (own && PROFICIENCY_RANK[own.proficiency_level] >= PROFICIENCY_RANK[requiredSkill.minimum_proficiency]) {
        matched.push(requiredSkill)
        earnedWeight += weight
      } else {
        missing.push(requiredSkill)
      }
    })
    const match = totalWeight ? Math.round((earnedWeight / totalWeight) * 1000) / 10 : 0
    const date = form.deadline ? new Date(`${form.deadline}T00:00:00`) : null
    return {
      project_id: 'preview',
      project_title: form.project_title || 'Your project title',
      project_description: form.project_description || 'Your project description will appear here.',
      domain: form.domain || 'Project domain',
      difficulty_level: form.difficulty_level,
      project_status: 'OPEN',
      current_team_size: 1,
      max_team_size: form.max_team_size,
      creator_name: `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'You',
      match_percentage: match,
      matched_skills: matched,
      missing_skills: missing,
      days_left: date ? Math.ceil((date - new Date()) / 86400000) : null,
    }
  }, [picked, skills, studentSkills, form, user])

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  function toggleSkill(skill) {
    const existing = picked.some((entry) => entry.skill_id === skill.skill_id)
    if (existing) {
      setPicked((current) => current.filter((entry) => entry.skill_id !== skill.skill_id))
      setErrors((current) => ({ ...current, skills: undefined }))
      return
    }
    if (picked.length >= 10) {
      setErrors((current) => ({ ...current, skills: 'Choose no more than 10 skills.' }))
      setErrorVersion((version) => version + 1)
      return
    }
    setPicked((current) => [...current, {
      skill_id: skill.skill_id,
      importance_weight: 5,
      minimum_proficiency: 'BEGINNER',
    }])
    setErrors((current) => ({ ...current, skills: undefined }))
  }

  function updatePicked(skillId, key, value) {
    setPicked((current) => current.map((entry) =>
      entry.skill_id === skillId ? { ...entry, [key]: value } : entry,
    ))
  }

  function validateStep() {
    const nextErrors = {}
    if (step === 0) {
      if (!form.project_title.trim()) nextErrors.project_title = 'Enter a project title.'
      if (form.project_title.trim().length > 200) nextErrors.project_title = 'Keep the title under 200 characters.'
      if (!form.project_description.trim()) nextErrors.project_description = 'Add a short description.'
      if (form.project_description.length > DESCRIPTION_LIMIT) nextErrors.project_description = 'Description is too long.'
      if (!form.domain.trim()) nextErrors.domain = 'Enter a project domain.'
      if (!form.deadline || form.deadline < tomorrowLocal()) nextErrors.deadline = 'Choose a future deadline.'
    }
    if (step === 1 && picked.length === 0) nextErrors.skills = 'Pick at least one required skill.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      setErrorVersion((version) => version + 1)
      return false
    }
    return true
  }

  function nextStep() {
    if (!validateStep()) return
    setErrors({})
    setStep((current) => Math.min(2, current + 1))
  }

  async function publishProject() {
    if (!validateStep() || lookupLoading || lookupError) return
    setPublishing(true)
    const payload = {
      ...form,
      project_title: form.project_title.trim(),
      project_description: form.project_description.trim(),
      domain: form.domain.trim(),
      required_skills: picked,
    }
    try {
      const result = await api.createProject(payload)
      logCommit('POST /projects', result.executed)
      setCelebrate(true)
      toast.success('Project published')
      await new Promise((resolve) => window.setTimeout(resolve, 650))
      setCelebrate(false)
      setForm({ project_title: '', project_description: '', domain: '', difficulty_level: 'MEDIUM', max_team_size: 4, deadline: '' })
      setPicked([])
      setStep(0)
      onPublished(result.project_id)
    } catch (error) {
      toast.error(error.message || 'Could not publish project')
    } finally {
      setPublishing(false)
    }
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-slate-950/75 p-0 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !publishing) onClose()
        }}
      >
        <motion.section
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${titleId}-heading`}
          className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-1 flex-col bg-page-light shadow-2xl dark:bg-page-dark sm:my-5 sm:min-h-[calc(100vh-2.5rem)] sm:rounded-3xl sm:border sm:border-white/10"
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        >
          <header className="flex items-start justify-between gap-4 border-b border-white/20 px-5 py-5 dark:border-white/5 sm:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">Constellation · New project</p>
              <h2 id={`${titleId}-heading`} className="mt-1 font-display text-2xl font-bold">Create a project</h2>
            </div>
            <button type="button" className="btn-ghost !p-2" aria-label="Close create project" onClick={onClose} disabled={publishing}>
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="mx-auto flex w-full max-w-3xl items-center px-5 py-5 sm:px-8" aria-label="Project creation steps" aria-live="polite">
            {STEP_TITLES.map((label, index) => (
              <div key={label} className="flex flex-1 items-center last:flex-none">
                <div className="flex items-center gap-2">
                  <motion.span
                    animate={{ scale: index === step ? 1.08 : 1 }}
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${index <= step ? 'bg-accent-gradient text-white shadow-md shadow-indigo-500/30' : 'bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400'}`}
                    aria-current={index === step ? 'step' : undefined}
                  >
                    {index < step ? <Check className="h-4 w-4" /> : index + 1}
                  </motion.span>
                  <span className={`hidden text-xs font-semibold sm:inline ${index === step ? 'text-indigo-600 dark:text-violet-300' : 'text-slate-400'}`}>{label}</span>
                </div>
                {index < STEP_TITLES.length - 1 ? <div className={`mx-3 h-px flex-1 ${index < step ? 'bg-indigo-400' : 'bg-slate-200 dark:bg-white/10'}`} /> : null}
              </div>
            ))}
          </div>

          <div className="flex-1 px-5 pb-6 sm:px-8">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ opacity: 0, x: step > 0 ? 36 : -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: step > 0 ? -24 : 24 }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                className="mx-auto max-w-3xl"
                ref={stepContentRef}
                tabIndex={-1}
              >
                {step === 0 ? (
                  <motion.div key={errorVersion} animate={Object.keys(errors).length ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }} transition={{ duration: 0.32 }} className="space-y-5">
                    <div>
                      <label htmlFor={`${titleId}-title`} className="mb-1.5 block text-sm font-semibold">Project title</label>
                      <input ref={titleRef} id={`${titleId}-title`} maxLength={200} value={form.project_title} onChange={(event) => updateForm('project_title', event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 dark:border-white/10 dark:bg-white/5" placeholder="e.g. Campus navigation app" />
                      <FieldError>{errors.project_title}</FieldError>
                    </div>
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label htmlFor={`${titleId}-description`} className="text-sm font-semibold">Description</label>
                        <span className="text-xs tabular-nums text-slate-400">{form.project_description.length}/{DESCRIPTION_LIMIT}</span>
                      </div>
                      <textarea id={`${titleId}-description`} rows={4} maxLength={DESCRIPTION_LIMIT} value={form.project_description} onChange={(event) => updateForm('project_description', event.target.value)} className="w-full resize-y rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 dark:border-white/10 dark:bg-white/5" placeholder="What are you building, and who would you like to work with?" />
                      <FieldError>{errors.project_description}</FieldError>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor={`${titleId}-domain`} className="mb-1.5 block text-sm font-semibold">Domain</label>
                        <input id={`${titleId}-domain`} list={domainListId} maxLength={100} value={form.domain} onChange={(event) => updateForm('domain', event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 dark:border-white/10 dark:bg-white/5" placeholder="Choose or enter a domain" />
                        <datalist id={domainListId}>{domains.map((domain) => <option key={domain} value={domain} />)}</datalist>
                        <FieldError>{errors.domain}</FieldError>
                      </div>
                      <div>
                        <span className="mb-1.5 block text-sm font-semibold">Difficulty</span>
                        <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-white/50 p-1 dark:border-white/10 dark:bg-white/5" role="group" aria-label="Project difficulty">
                          {['EASY', 'MEDIUM', 'HARD'].map((difficulty) => (
                            <button key={difficulty} type="button" aria-pressed={form.difficulty_level === difficulty} onClick={() => updateForm('difficulty_level', difficulty)} className={`rounded-lg px-2 py-2 text-xs font-semibold transition ${form.difficulty_level === difficulty ? 'bg-accent-gradient text-white shadow' : 'text-slate-500 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/10'}`}>
                              {difficulty[0] + difficulty.slice(1).toLowerCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label htmlFor={`${titleId}-team`} className="mb-1.5 block text-sm font-semibold">Max team size</label>
                        <div className="flex h-11 items-center justify-between rounded-xl border border-slate-200 bg-white/70 px-2 dark:border-white/10 dark:bg-white/5">
                          <button type="button" className="btn-ghost !px-3 !py-1" aria-label="Decrease team size" disabled={form.max_team_size <= 2} onClick={() => updateForm('max_team_size', Math.max(2, form.max_team_size - 1))}>−</button>
                          <input id={`${titleId}-team`} readOnly value={form.max_team_size} className="w-12 bg-transparent text-center text-sm font-bold tabular-nums outline-none" aria-label="Maximum team size" />
                          <button type="button" className="btn-ghost !px-3 !py-1" aria-label="Increase team size" disabled={form.max_team_size >= 10} onClick={() => updateForm('max_team_size', Math.min(10, form.max_team_size + 1))}>+</button>
                        </div>
                      </div>
                      <div>
                        <label htmlFor={`${titleId}-deadline`} className="mb-1.5 block text-sm font-semibold">Deadline</label>
                        <input id={`${titleId}-deadline`} type="date" min={tomorrowLocal()} value={form.deadline} onChange={(event) => updateForm('deadline', event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 dark:border-white/10 dark:bg-white/5" />
                        <FieldError>{errors.deadline}</FieldError>
                      </div>
                    </div>
                  </motion.div>
                ) : null}

                {step === 1 ? (
                  <motion.div key={errorVersion} animate={Object.keys(errors).length ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }} transition={{ duration: 0.32 }} className="space-y-5">
                    <div>
                      <h3 className="font-display text-xl font-bold">What skills are you looking for?</h3>
                      <p className="mt-1 text-sm text-slate-500">Pick 1–10 skills. Set a weight and minimum proficiency for each.</p>
                    </div>
                    {lookupLoading ? (
                      <div className="space-y-3 rounded-2xl p-4"><div className="skeleton h-10 w-full" /><div className="skeleton h-20 w-full" /><div className="skeleton h-20 w-full" /></div>
                    ) : lookupError ? (
                      <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" role="alert">{lookupError}</div>
                    ) : (
                      <>
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input type="search" value={skillQuery} onChange={(event) => setSkillQuery(event.target.value)} aria-label="Search available skills" placeholder="Search available skills…" className="w-full rounded-xl border border-slate-200 bg-white/70 py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400 dark:border-white/10 dark:bg-white/5" />
                        </div>
                        <div className="max-h-52 space-y-3 overflow-y-auto rounded-2xl border border-white/30 bg-white/30 p-3 dark:border-white/5 dark:bg-white/[0.02]">
                          {Object.keys(skillGroups).length ? Object.entries(skillGroups).map(([category, rows]) => (
                            <section key={category}>
                              <h4 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">{category}</h4>
                              <div className="flex flex-wrap gap-1.5">
                                {rows.map((skill) => {
                                  const selected = picked.some((entry) => entry.skill_id === skill.skill_id)
                                  return <button key={skill.skill_id} type="button" aria-pressed={selected} onClick={() => toggleSkill(skill)} className={`chip border transition ${selected ? 'border-transparent bg-accent-gradient text-white' : 'border-slate-200 bg-white/70 text-slate-600 hover:border-indigo-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'}`}>{selected ? '✓ ' : '+ '}{skill.skill_name}</button>
                                })}
                              </div>
                            </section>
                          )) : <p className="px-2 py-4 text-center text-sm text-slate-400">No skills found.</p>}
                        </div>
                        <FieldError>{errors.skills}</FieldError>
                        <div className="space-y-2">
                          {picked.map((entry) => {
                            const skill = skills.find((item) => item.skill_id === entry.skill_id)
                            return (
                              <div key={entry.skill_id} className="grid gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3 dark:border-indigo-400/10 dark:bg-indigo-500/5 sm:grid-cols-[minmax(8rem,1fr)_minmax(8rem,1.2fr)_minmax(8rem,1fr)_auto] sm:items-center">
                                <span className="truncate text-sm font-semibold">{skill?.skill_name}</span>
                                <label className="text-xs text-slate-500">Importance <strong className="ml-1 text-indigo-600 dark:text-violet-300">{entry.importance_weight}</strong>
                                  <input type="range" min="1" max="10" value={entry.importance_weight} aria-label={`${skill?.skill_name} importance`} onChange={(event) => updatePicked(entry.skill_id, 'importance_weight', Number(event.target.value))} className="mt-1 block w-full accent-indigo-500" />
                                </label>
                                <label className="text-xs text-slate-500">Minimum proficiency
                                  <select value={entry.minimum_proficiency} onChange={(event) => updatePicked(entry.skill_id, 'minimum_proficiency', event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 dark:border-white/10 dark:bg-ink-900 dark:text-slate-100">
                                    {PROFICIENCIES.map((level) => <option key={level} value={level}>{level[0] + level.slice(1).toLowerCase()}</option>)}
                                  </select>
                                </label>
                                <button type="button" className="btn-ghost !p-2 text-rose-500" aria-label={`Remove ${skill?.skill_name}`} onClick={() => setPicked((current) => current.filter((item) => item.skill_id !== entry.skill_id))}><X className="h-4 w-4" /></button>
                              </div>
                            )
                          })}
                        </div>
                        <p className="text-xs text-slate-400">{picked.length}/10 skills selected</p>
                      </>
                    )}
                  </motion.div>
                ) : null}

                {step === 2 ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-display text-xl font-bold">Review your project</h3>
                      <p className="mt-1 text-sm text-slate-500">This is how your project will appear in Discover.</p>
                    </div>
                    <div className="mx-auto max-w-lg">
                      <ProjectCard project={previewProject} />
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-indigo-200/60 bg-indigo-50/60 p-3 text-xs text-indigo-800 dark:border-indigo-400/10 dark:bg-indigo-500/10 dark:text-indigo-200">
                      <Sparkles className="h-4 w-4 shrink-0" /> Your creator match is calculated from your skills and the requirements above.
                    </div>
                    <div className="text-xs text-slate-400">Deadline: {form.deadline} · Creator starts the team at 1/{form.max_team_size}</div>
                  </div>
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>

          <footer className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-white/20 bg-white/70 px-5 py-4 backdrop-blur-xl dark:border-white/5 dark:bg-ink-950/70 sm:px-8">
            <button type="button" className="btn-ghost" onClick={() => (step === 0 ? onClose() : setStep((current) => current - 1))} disabled={publishing}>
              <ChevronLeft className="h-4 w-4" /> {step === 0 ? 'Cancel' : 'Back'}
            </button>
            {step < 2 ? (
              <button type="button" className="btn-primary" onClick={nextStep} disabled={(step === 1 && (lookupLoading || Boolean(lookupError)))}>
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" className="btn-primary min-w-40" onClick={publishProject} disabled={publishing || lookupLoading}>
                {publishing ? <><Loader2 className="h-4 w-4 animate-spin" /> Publishing…</> : <><Plus className="h-4 w-4" /> Publish project</>}
              </button>
            )}
          </footer>
        </motion.section>
      </motion.div>
      {celebrate ? <ConfettiBurst /> : null}
    </AnimatePresence>
  )
}
