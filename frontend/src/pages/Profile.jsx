import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check, ChevronDown, ChevronUp, CircleHelp, Loader2, Plus, Search,
  ShieldCheck, Trash2, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import TopBar from '../components/TopBar'
import MatchRing from '../components/MatchRing'
import EmptyState from '../components/EmptyState'
import { api, invalidateProfileData } from '../api'
import { useAuth } from '../context/AuthContext'
import { useHood } from '../context/HoodContext'

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']
const AVAILABILITY = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'PARTIALLY_AVAILABLE', label: 'Partially' },
  { value: 'NOT_AVAILABLE', label: 'Not available' },
]

function initials(profile) {
  return `${profile?.first_name?.[0] || ''}${profile?.last_name?.[0] || ''}`.toUpperCase() || '?'
}

function SectionCard({ id, title, subtitle, children, action }) {
  return (
    <section id={id} className="glass p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Segmented({ value, options, onChange, label }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white/40 p-1 dark:border-white/10 dark:bg-white/5" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-lg px-2.5 py-2 text-xs font-semibold transition ${value === option.value ? 'bg-accent-gradient text-white shadow' : 'text-slate-500 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-white/10'}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function errorMessage(error) {
  return error?.message || 'Something went wrong. Please try again.'
}

export default function Profile() {
  const { updateUser } = useAuth()
  const { logCommit, logRollback } = useHood()
  const [profile, setProfile] = useState(null)
  const [strength, setStrength] = useState(null)
  const [catalog, setCatalog] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [about, setAbout] = useState(null)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [skillSearch, setSkillSearch] = useState('')
  const [selectedSkill, setSelectedSkill] = useState(null)
  const [newSkill, setNewSkill] = useState({ proficiency_level: 'BEGINNER', years_of_experience: 0 })
  const [addingSkill, setAddingSkill] = useState(false)
  const [busySkills, setBusySkills] = useState({})
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ownProfile, dashboard, skillRows, departmentRows] = await Promise.all([
        api.getMyProfile(),
        api.getMeDashboard(),
        api.getSkills(),
        api.getDepartments(),
      ])
      setProfile(ownProfile)
      setAbout({
        bio: ownProfile.bio || '',
        github_portfolio: ownProfile.github_portfolio || '',
        college: ownProfile.college || '',
        year_of_study: ownProfile.year_of_study,
        department_id: ownProfile.department_id,
        experience_level: ownProfile.experience_level,
        availability_status: ownProfile.availability_status,
      })
      setStrength(dashboard.profile_strength)
      setCatalog(skillRows)
      setDepartments(departmentRows)
      updateUser(ownProfile)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [updateUser])

  useEffect(() => {
    load()
  }, [load])

  const changedAbout = useMemo(() => {
    if (!profile || !about) return false
    return ['bio', 'github_portfolio', 'college', 'year_of_study', 'department_id', 'experience_level', 'availability_status']
      .some((field) => String(about[field] ?? '') !== String(profile[field] ?? ''))
  }, [profile, about])

  const groupedSkills = useMemo(() => {
    return (profile?.skills || []).reduce((groups, skill) => {
      const category = skill.skill_category || 'Other skills'
      groups[category] = [...(groups[category] || []), skill]
      return groups
    }, {})
  }, [profile])

  const groupedCatalog = useMemo(() => {
    const query = skillSearch.trim().toLowerCase()
    return catalog
      .filter((skill) => `${skill.skill_name} ${skill.skill_category || ''}`.toLowerCase().includes(query))
      .reduce((groups, skill) => {
        const category = skill.skill_category || 'Other skills'
        groups[category] = [...(groups[category] || []), skill]
        return groups
      }, {})
  }, [catalog, skillSearch])

  async function refreshStrength() {
    try {
      const dashboard = await api.getMeDashboard()
      setStrength(dashboard.profile_strength)
    } catch {
      // The successful profile or skill change is already saved; keep the current ring on a read error.
    }
  }

  async function saveProfile() {
    if (!changedAbout || savingProfile) return
    if (about.bio.length > 500 || about.github_portfolio.length > 255 || about.college.length > 150) {
      toast.error('One or more fields are over their character limit')
      return
    }
    setSavingProfile(true)
    try {
      const result = await api.updateMyProfile(about)
      const executed = result.executed || []
      logCommit('PUT /me/profile', executed)
      setProfile(result)
      setAbout({
        bio: result.bio || '',
        github_portfolio: result.github_portfolio || '',
        college: result.college || '',
        year_of_study: result.year_of_study,
        department_id: result.department_id,
        experience_level: result.experience_level,
        availability_status: result.availability_status,
      })
      updateUser(result)
      await refreshStrength()
      invalidateProfileData()
      setEditing(false)
      toast.success('Profile updated')
    } catch (error) {
      logRollback('PUT /me/profile', errorMessage(error), error.data?.executed)
      toast.error(errorMessage(error))
    } finally {
      setSavingProfile(false)
    }
  }

  function updateSkillLocally(skillId, transform) {
    setProfile((current) => ({
      ...current,
      skills: current.skills.map((skill) => skill.skill_id === skillId ? transform(skill) : skill),
    }))
  }

  async function updateSkill(skill, changes) {
    if (busySkills[skill.skill_id]) return
    const before = { ...skill }
    const optimistic = { ...skill, ...changes }
    if (changes.proficiency_level && changes.proficiency_level !== before.proficiency_level) optimistic.is_verified = 0
    updateSkillLocally(skill.skill_id, () => optimistic)
    setBusySkills((current) => ({ ...current, [skill.skill_id]: true }))
    try {
      const result = await api.updateMySkill(skill.skill_id, changes)
      logCommit(`PUT /me/skills/${skill.skill_id}`, result.executed)
      updateSkillLocally(skill.skill_id, () => result.skill || optimistic)
      await refreshStrength()
      invalidateProfileData()
    } catch (error) {
      updateSkillLocally(skill.skill_id, () => before)
      logRollback(`PUT /me/skills/${skill.skill_id}`, errorMessage(error), error.data?.executed)
      toast.error(errorMessage(error))
    } finally {
      setBusySkills((current) => ({ ...current, [skill.skill_id]: false }))
    }
  }

  async function deleteSkill(skill) {
    setConfirmDeleteId(null)
    setProfile((current) => ({ ...current, skills: current.skills.filter((item) => item.skill_id !== skill.skill_id) }))
    try {
      const result = await api.deleteMySkill(skill.skill_id)
      logCommit(`DELETE /me/skills/${skill.skill_id}`, result.executed)
      await refreshStrength()
      invalidateProfileData()
      toast((t) => (
        <span className="flex items-center gap-3">
          <span>{skill.skill_name} removed</span>
          <button
            type="button"
            className="rounded-lg bg-indigo-500 px-2.5 py-1 font-semibold text-white"
            onClick={() => {
              toast.dismiss(t.id)
              restoreSkill(skill)
            }}
          >Undo</button>
        </span>
      ), { duration: 5000 })
    } catch (error) {
      setProfile((current) => ({ ...current, skills: [...current.skills, skill] }))
      logRollback(`DELETE /me/skills/${skill.skill_id}`, errorMessage(error), error.data?.executed)
      toast.error(errorMessage(error))
    }
  }

  async function restoreSkill(skill) {
    try {
      const result = await api.addMySkill({
        skill_id: skill.skill_id,
        proficiency_level: skill.proficiency_level,
        years_of_experience: Number(skill.years_of_experience) || 0,
      })
      setProfile((current) => ({ ...current, skills: [...current.skills, result.skill] }))
      logCommit(`POST /me/skills (undo ${skill.skill_id})`, result.executed)
      await refreshStrength()
      invalidateProfileData()
    } catch (error) {
      logRollback(`POST /me/skills (undo ${skill.skill_id})`, errorMessage(error), error.data?.executed)
      toast.error(errorMessage(error))
    }
  }

  async function addSkill() {
    if (!selectedSkill || addingSkill) return
    setAddingSkill(true)
    const payload = {
      skill_id: selectedSkill.skill_id,
      proficiency_level: newSkill.proficiency_level,
      years_of_experience: Number(newSkill.years_of_experience),
    }
    try {
      const result = await api.addMySkill(payload)
      setProfile((current) => ({ ...current, skills: [...current.skills, result.skill] }))
      logCommit('POST /me/skills', result.executed)
      await refreshStrength()
      invalidateProfileData()
      toast.success(`${selectedSkill.skill_name} added`)
      setSelectedSkill(null)
      setSkillSearch('')
      setNewSkill({ proficiency_level: 'BEGINNER', years_of_experience: 0 })
    } catch (error) {
      logRollback('POST /me/skills', errorMessage(error), error.data?.executed)
      toast.error(errorMessage(error))
    } finally {
      setAddingSkill(false)
    }
  }

  async function savePassword(event) {
    event.preventDefault()
    if (passwordForm.new_password.length < 8) return toast.error('New password must be at least 8 characters')
    if (passwordForm.new_password !== passwordForm.confirm_password) return toast.error('New passwords do not match')
    setPasswordSaving(true)
    try {
      const result = await api.changeMyPassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      })
      logCommit('PUT /me/password', result.executed)
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
      setPasswordOpen(false)
      toast.success('Password updated')
    } catch (error) {
      logRollback('PUT /me/password', errorMessage(error), error.data?.executed)
      toast.error(errorMessage(error))
    } finally {
      setPasswordSaving(false)
    }
  }

  function jumpToHint(item) {
    if (/skill/i.test(item)) {
      document.getElementById('skills')?.scrollIntoView({ behavior: 'smooth' })
    } else {
      setEditing(true)
      document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  if (loading) {
    return (
      <>
        <TopBar title="Profile" subtitle="Your profile and skills" />
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="glass skeleton h-40" />
          <div className="glass skeleton h-72" />
          <div className="glass skeleton h-72" />
        </div>
      </>
    )
  }
  if (!profile || !about) {
    return <><TopBar title="Profile" /><EmptyState title="Profile unavailable" description="Reload the page and try again." /></>
  }

  return (
    <>
      <TopBar title="Profile" subtitle="Build a profile teammates can match with" />
      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass relative overflow-hidden p-5 sm:p-7">
          <div className="pointer-events-none absolute -right-10 -top-14 h-48 w-48 rounded-full bg-violet-400/20 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-accent-gradient font-display text-2xl font-bold text-white shadow-lg shadow-indigo-500/30">{initials(profile)}</div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">Your constellation</p>
                <h1 className="mt-1 font-display text-2xl font-bold">{profile.first_name} {profile.last_name}</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{profile.department_name || 'Department not set'} · Year {profile.year_of_study}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <MatchRing value={strength?.percentage || 0} size={76} stroke={7} />
              <div>
                <p className="text-sm font-semibold">Profile strength</p>
                <ul className="mt-1 space-y-1">
                  {(strength?.missing || []).length ? strength.missing.map((item) => (
                    <li key={item}>
                      <button type="button" className="text-left text-xs text-indigo-600 underline decoration-indigo-300 underline-offset-2 dark:text-violet-300" onClick={() => jumpToHint(item)}>{item}</button>
                    </li>
                  )) : <li className="text-xs text-emerald-600 dark:text-emerald-300">Everything looks good.</li>}
                </ul>
              </div>
            </div>
          </div>
        </motion.section>

        <SectionCard
          id="about"
          title="About me"
          subtitle="Your basic profile details. Email and account details are read-only."
          action={editing ? null : <button type="button" className="btn-ghost" onClick={() => setEditing(true)}>Edit profile</button>}
        >
          {editing ? (
            <div className="space-y-4">
              <div>
                <div className="mb-1 flex justify-between text-sm font-medium"><label htmlFor="profile-bio">Bio</label><span className="text-xs text-slate-400">{about.bio.length}/500</span></div>
                <textarea id="profile-bio" rows={3} maxLength={500} value={about.bio} onChange={(event) => setAbout((current) => ({ ...current, bio: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 dark:border-white/10 dark:bg-white/5" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">GitHub portfolio
                  <input type="url" maxLength={255} value={about.github_portfolio} onChange={(event) => setAbout((current) => ({ ...current, github_portfolio: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 dark:border-white/10 dark:bg-white/5" placeholder="https://github.com/username" />
                </label>
                <label className="text-sm font-medium">College
                  <input maxLength={150} value={about.college} onChange={(event) => setAbout((current) => ({ ...current, college: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 dark:border-white/10 dark:bg-white/5" />
                </label>
                <label className="text-sm font-medium">Year of study
                  <select value={about.year_of_study} onChange={(event) => setAbout((current) => ({ ...current, year_of_study: Number(event.target.value) }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5 text-sm dark:border-white/10 dark:bg-ink-900">
                    {[1, 2, 3, 4].map((year) => <option key={year} value={year}>Year {year}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium">Department
                  <select value={about.department_id} onChange={(event) => setAbout((current) => ({ ...current, department_id: Number(event.target.value) }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5 text-sm dark:border-white/10 dark:bg-ink-900">
                    {departments.map((department) => <option key={department.department_id} value={department.department_id}>{department.department_name}</option>)}
                  </select>
                </label>
              </div>
              <div className="space-y-3">
                <div><p className="mb-1.5 text-sm font-medium">Experience level</p><Segmented label="Experience level" value={about.experience_level} options={LEVELS.map((value) => ({ value, label: value[0] + value.slice(1).toLowerCase() }))} onChange={(value) => setAbout((current) => ({ ...current, experience_level: value }))} /></div>
                <div><p className="mb-1.5 text-sm font-medium">Availability</p><Segmented label="Availability" value={about.availability_status} options={AVAILABILITY} onChange={(value) => setAbout((current) => ({ ...current, availability_status: value }))} /></div>
              </div>
              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <button type="button" className="btn-ghost" onClick={() => {
                  setAbout({ bio: profile.bio || '', github_portfolio: profile.github_portfolio || '', college: profile.college || '', year_of_study: profile.year_of_study, department_id: profile.department_id, experience_level: profile.experience_level, availability_status: profile.availability_status })
                  setEditing(false)
                }}>Cancel</button>
                <button type="button" className="btn-primary" disabled={!changedAbout || savingProfile} onClick={saveProfile}>
                  {savingProfile ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Check className="h-4 w-4" /> Save changes</>}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div><p className="text-xs uppercase tracking-wide text-slate-400">Email</p><p className="mt-1 text-sm font-medium">{profile.email}</p></div>
              <div><p className="text-xs uppercase tracking-wide text-slate-400">College</p><p className="mt-1 text-sm font-medium">{profile.college || 'Not added'}</p></div>
              <div className="sm:col-span-2"><p className="text-xs uppercase tracking-wide text-slate-400">Bio</p><p className="mt-1 whitespace-pre-wrap text-sm">{profile.bio || 'Add a short introduction about yourself.'}</p></div>
              <div><p className="text-xs uppercase tracking-wide text-slate-400">GitHub portfolio</p>{profile.github_portfolio ? <a className="mt-1 block break-all text-sm text-indigo-600 underline dark:text-violet-300" href={profile.github_portfolio} target="_blank" rel="noreferrer">{profile.github_portfolio}</a> : <p className="mt-1 text-sm">Not added</p>}</div>
              <div><p className="text-xs uppercase tracking-wide text-slate-400">Experience · Availability</p><p className="mt-1 text-sm font-medium">{profile.experience_level} · {AVAILABILITY.find((item) => item.value === profile.availability_status)?.label}</p></div>
            </div>
          )}
        </SectionCard>

        <SectionCard id="skills" title="My skills" subtitle="Your proficiency and experience help calculate project matches.">
          {!profile.skills?.length ? (
            <EmptyState icon={CircleHelp} title="No skills added yet" description="Add a skill to see your match percentage and help teams find you." />
          ) : (
            <div className="space-y-5">
              {Object.entries(groupedSkills).map(([category, items]) => (
                <div key={category}>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">{category}</h3>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <AnimatePresence initial={false}>
                      {items.map((skill) => (
                        <motion.article key={skill.skill_id} layout initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="rounded-2xl border border-white/40 bg-white/45 p-4 dark:border-white/5 dark:bg-white/[0.03]">
                          <div className="mb-3 flex items-start justify-between gap-2">
                            <div><h4 className="font-display font-semibold">{skill.skill_name}</h4><p className="mt-0.5 text-xs text-slate-400">{Number(skill.years_of_experience) || 0} years experience</p></div>
                            <div className="flex items-center gap-2">
                              {skill.is_verified ? <span className="chip gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"><ShieldCheck className="h-3 w-3" /> Verified</span> : null}
                              <button type="button" className="btn-ghost !p-2 text-rose-500" aria-label={`Remove ${skill.skill_name}`} onClick={() => setConfirmDeleteId(confirmDeleteId === skill.skill_id ? null : skill.skill_id)}><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </div>
                          {confirmDeleteId === skill.skill_id ? (
                            <div className="mb-3 flex items-center justify-between gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs dark:bg-rose-500/10">
                              <span>Remove this skill?</span>
                              <span className="flex gap-1.5"><button type="button" className="btn-ghost !px-2 !py-1" onClick={() => setConfirmDeleteId(null)}>Keep</button><button type="button" className="rounded-lg bg-rose-500 px-2.5 py-1 font-semibold text-white" onClick={() => deleteSkill(skill)}>Remove</button></span>
                            </div>
                          ) : null}
                          <Segmented
                            label={`${skill.skill_name} proficiency`}
                            value={skill.proficiency_level}
                            options={LEVELS.map((value) => ({ value, label: value[0] + value.slice(1).toLowerCase() }))}
                            onChange={(value) => updateSkill(skill, { proficiency_level: value })}
                          />
                          <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                            <span className="text-xs text-slate-500">Years of experience</span>
                            <div className="flex items-center gap-2">
                              <button type="button" className="btn-ghost !px-2 !py-1" aria-label={`Decrease ${skill.skill_name} years`} disabled={Number(skill.years_of_experience) <= 0} onClick={() => updateSkill(skill, { years_of_experience: Math.max(0, Number((Number(skill.years_of_experience) - 0.5).toFixed(1))) })}>−</button>
                              <span className="w-10 text-center tabular-nums">{Number(skill.years_of_experience) || 0}</span>
                              <button type="button" className="btn-ghost !px-2 !py-1" aria-label={`Increase ${skill.skill_name} years`} disabled={Number(skill.years_of_experience) >= 20} onClick={() => updateSkill(skill, { years_of_experience: Math.min(20, Number((Number(skill.years_of_experience) + 0.5).toFixed(1))) })}>+</button>
                            </div>
                          </div>
                          {busySkills[skill.skill_id] ? <p className="mt-2 text-[11px] text-indigo-500">Saving…</p> : null}
                        </motion.article>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 border-t border-white/30 pt-4 dark:border-white/5">
            <h3 className="mb-2 font-display font-semibold">Add a skill</h3>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="search" value={skillSearch} onChange={(event) => setSkillSearch(event.target.value)} aria-label="Search skills to add" placeholder="Search skills by name or category…" className="w-full rounded-xl border border-slate-200 bg-white/70 py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400 dark:border-white/10 dark:bg-white/5" />
            </div>
            <div className="mt-3 max-h-48 space-y-3 overflow-y-auto rounded-xl">
              {Object.entries(groupedCatalog).map(([category, items]) => (
                <div key={category}>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{category}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((skill) => {
                      const owned = profile.skills.some((item) => item.skill_id === skill.skill_id)
                      return (
                        <button key={skill.skill_id} type="button" disabled={owned} onClick={() => {
                          setSelectedSkill(selectedSkill?.skill_id === skill.skill_id ? null : skill)
                          setNewSkill({ proficiency_level: 'BEGINNER', years_of_experience: 0 })
                        }} className={`chip border transition disabled:cursor-not-allowed disabled:opacity-45 ${selectedSkill?.skill_id === skill.skill_id ? 'border-transparent bg-accent-gradient text-white' : 'border-slate-200 bg-white/70 text-slate-600 hover:border-indigo-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'}`}>
                          {owned ? '✓ ' : '+ '}{skill.skill_name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <AnimatePresence>
              {selectedSkill ? (
                <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4 }} transition={{ type: 'spring', stiffness: 350, damping: 26 }} className="mt-3 rounded-2xl border border-indigo-200/60 bg-indigo-50/60 p-4 dark:border-indigo-400/10 dark:bg-indigo-500/10">
                  <div className="mb-3 flex items-center justify-between"><p className="font-semibold">Add {selectedSkill.skill_name}</p><button type="button" className="btn-ghost !p-1.5" aria-label="Close add skill" onClick={() => setSelectedSkill(null)}><X className="h-4 w-4" /></button></div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-medium">Proficiency
                      <select value={newSkill.proficiency_level} onChange={(event) => setNewSkill((current) => ({ ...current, proficiency_level: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm dark:border-white/10 dark:bg-ink-900">
                        {LEVELS.map((level) => <option key={level} value={level}>{level[0] + level.slice(1).toLowerCase()}</option>)}
                      </select>
                    </label>
                    <label className="text-xs font-medium">Years of experience
                      <input type="number" min="0" max="20" step="0.5" value={newSkill.years_of_experience} onChange={(event) => setNewSkill((current) => ({ ...current, years_of_experience: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm dark:border-white/10 dark:bg-ink-900" />
                    </label>
                  </div>
                  <button type="button" className="btn-primary mt-3" disabled={addingSkill || Number(newSkill.years_of_experience) < 0 || Number(newSkill.years_of_experience) > 20} onClick={addSkill}>
                    {addingSkill ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add skill
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </SectionCard>

        <section className="glass overflow-hidden">
          <button type="button" className="flex w-full items-center justify-between p-5 text-left" aria-expanded={passwordOpen} onClick={() => setPasswordOpen((value) => !value)}>
            <span><span className="block font-display font-bold">Change password</span><span className="mt-1 block text-sm text-slate-500">Choose a new password with at least 8 characters.</span></span>
            {passwordOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
          <AnimatePresence initial={false}>
            {passwordOpen ? (
              <motion.form initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} onSubmit={savePassword} className="space-y-3 overflow-hidden border-t border-white/20 px-5 py-4 dark:border-white/5 sm:px-6">
                {[
                  ['current_password', 'Current password'],
                  ['new_password', 'New password'],
                  ['confirm_password', 'Confirm new password'],
                ].map(([key, label]) => (
                  <label key={key} className="block text-sm font-medium">{label}<input type="password" autoComplete={key === 'current_password' ? 'current-password' : 'new-password'} value={passwordForm[key]} onChange={(event) => setPasswordForm((current) => ({ ...current, [key]: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400 dark:border-white/10 dark:bg-white/5" /></label>
                ))}
                <button type="submit" className="btn-primary" disabled={passwordSaving || !passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password}>
                  {passwordSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save password
                </button>
              </motion.form>
            ) : null}
          </AnimatePresence>
        </section>
      </div>
    </>
  )
}
