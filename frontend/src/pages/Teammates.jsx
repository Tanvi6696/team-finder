import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import TopBar from '../components/TopBar'
import EmptyState from '../components/EmptyState'
import StudentDrawer from '../components/StudentDrawer'
import { api } from '../api'
import { proficiencyToInt } from '../lib/match'

const AVAIL = ['ALL', 'AVAILABLE', 'PARTIALLY_AVAILABLE', 'NOT_AVAILABLE']

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

export default function Teammates() {
  const [profiles, setProfiles] = useState([])
  const [skillsCatalog, setSkillsCatalog] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedSkills, setSelectedSkills] = useState([]) // skill ids
  const [department, setDepartment] = useState('ALL')
  const [availability, setAvailability] = useState('ALL')
  const [active, setActive] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([api.getStudents(), api.getSkills(), api.getDepartments()])
      .then(async ([list, skills, deps]) => {
        setSkillsCatalog(skills)
        setDepartments(deps)
        // Enrich each student with skills (small seed set — fine for demo)
        const full = await Promise.all(list.map((s) => api.getStudent(s.student_id)))
        setProfiles(full)
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    window.addEventListener('profile-data-invalidated', load)
    return () => window.removeEventListener('profile-data-invalidated', load)
  }, [load])

  function toggleSkill(id) {
    setSelectedSkills((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return profiles.filter((s) => {
      if (department !== 'ALL' && String(s.department_id) !== String(department)) return false
      if (availability !== 'ALL' && s.availability_status !== availability) return false
      if (selectedSkills.length) {
        const ids = new Set((s.skills || []).map((sk) => sk.skill_id))
        if (!selectedSkills.every((id) => ids.has(id))) return false
      }
      if (!q) return true
      const hay = `${s.first_name} ${s.last_name} ${s.email} ${s.department_name}`.toLowerCase()
      return hay.includes(q)
    })
  }, [profiles, search, department, availability, selectedSkills])

  return (
    <>
      <TopBar title="Teammates" subtitle="Browse students by skills and availability" />

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="glass space-y-3 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, department…"
              className="w-full rounded-xl border border-slate-200/70 bg-white/70 py-2.5 pl-10 pr-3 text-sm
                outline-none focus:ring-2 focus:ring-indigo-400 dark:border-white/10 dark:bg-white/5"
            />
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Skills (multi-select)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {skillsCatalog.map((sk) => (
                <FilterChip
                  key={sk.skill_id}
                  active={selectedSkills.includes(sk.skill_id)}
                  onClick={() => toggleSkill(sk.skill_id)}
                >
                  {sk.skill_name}
                </FilterChip>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Department
            </p>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip active={department === 'ALL'} onClick={() => setDepartment('ALL')}>
                All
              </FilterChip>
              {departments.map((d) => (
                <FilterChip
                  key={d.department_id}
                  active={String(department) === String(d.department_id)}
                  onClick={() => setDepartment(d.department_id)}
                >
                  {d.department_code}
                </FilterChip>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Availability
            </p>
            <div className="flex flex-wrap gap-1.5">
              {AVAIL.map((a) => (
                <FilterChip key={a} active={availability === a} onClick={() => setAvailability(a)}>
                  {a === 'ALL' ? 'All' : a.replaceAll('_', ' ')}
                </FilterChip>
              ))}
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-500 tabular-nums">
          {loading ? 'Loading…' : `${filtered.length} students`}
        </p>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass space-y-3 p-5">
                <div className="skeleton h-5 w-1/2" />
                <div className="skeleton h-3 w-1/3" />
                <div className="flex gap-2">
                  <div className="skeleton h-6 w-16 !rounded-full" />
                  <div className="skeleton h-6 w-16 !rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No teammates match"
            description="Try clearing a skill filter or switching availability."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((s) => (
              <motion.button
                key={s.student_id}
                type="button"
                whileHover={{ y: -4 }}
                onClick={() => {
                  setActive(s)
                  setDrawerOpen(true)
                }}
                className="glass w-full cursor-pointer p-5 text-left transition hover:shadow-lift"
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold">
                    {s.first_name} {s.last_name}
                  </h3>
                  <span className="chip bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
                    {s.experience_level}
                  </span>
                </div>
                <p className="mb-3 text-xs text-slate-500">
                  {s.department_code} · {s.availability_status?.replaceAll('_', ' ')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(s.skills || [])
                    .slice()
                    .sort(
                      (a, b) =>
                        proficiencyToInt(b.proficiency_level) -
                        proficiencyToInt(a.proficiency_level),
                    )
                    .slice(0, 6)
                    .map((sk) => (
                      <span
                        key={sk.skill_id}
                        className="chip bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200"
                      >
                        {sk.skill_name}
                        <span className="ml-1 opacity-70">{sk.proficiency_level.slice(0, 3)}</span>
                      </span>
                    ))}
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      <StudentDrawer
        student={active}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  )
}
