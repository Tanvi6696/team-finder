import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValue, useSpring } from 'framer-motion'
import { Check, ChevronLeft, ChevronRight, Eye, EyeOff, Loader2, Search, Sparkles, X } from 'lucide-react'
import toast from 'react-hot-toast'
import ConstellationCanvas from '../components/ConstellationCanvas'
import CountUp from '../components/CountUp'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useHood } from '../context/HoodContext'

/**
 * DEMO ONLY — clickable chips fill email + shared demo password for live demos / viva.
 * Real users should never rely on this row in production.
 */
const DEMO_ACCOUNTS = [
  { name: 'Ananya', email: 'ananya@example.com', initial: 'A', color: 'from-teal-400 to-cyan-500' },
  { name: 'Riya', email: 'riya@example.com', initial: 'R', color: 'from-sky-400 to-blue-500' },
  { name: 'Sneha', email: 'sneha@example.com', initial: 'S', color: 'from-violet-400 to-fuchsia-500' },
  { name: 'Priya', email: 'priya@example.com', initial: 'P', color: 'from-emerald-400 to-teal-500' },
]
const DEMO_PASSWORD = 'demo123'

const STATIC_STATS = [
  { key: 'students', label: 'Students', value: 10 },
  { key: 'projects', label: 'Projects', value: 4 },
  { key: 'pending', label: 'Open asks', value: 6 },
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function passwordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: 'bg-slate-600' }
  let score = 0
  if (pw.length >= 8) score += 1
  if (pw.length >= 12) score += 1
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1
  if (/\d/.test(pw)) score += 1
  if (/[^A-Za-z0-9]/.test(pw)) score += 1
  const clamped = Math.min(score, 4)
  const meta = [
    { label: 'Too weak', color: 'bg-rose-500', width: '20%' },
    { label: 'Weak', color: 'bg-orange-500', width: '40%' },
    { label: 'Okay', color: 'bg-amber-400', width: '60%' },
    { label: 'Strong', color: 'bg-lime-400', width: '80%' },
    { label: 'Excellent', color: 'bg-emerald-400', width: '100%' },
  ][clamped]
  return { score: clamped, ...meta }
}

/** Floating-label input with focus glow + optional error shake */
function FloatField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  error,
  autoComplete,
  rightSlot,
  min,
  max,
}) {
  const [focused, setFocused] = useState(false)
  const floated = focused || Boolean(value)

  return (
    <motion.div
      animate={error ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.35 }}
      className="relative"
    >
      <div
        className={`relative rounded-xl border bg-white/[0.04] transition
          ${focused ? 'border-teal-400/60 shadow-[0_0_0_3px_rgba(45,212,191,0.15)]' : 'border-white/10'}
          ${error ? 'border-rose-400/70' : ''}`}
      >
        <label
          htmlFor={id}
          className={`pointer-events-none absolute left-3 z-10 origin-left transition-all duration-200
            ${floated ? 'top-1.5 text-[10px] font-semibold uppercase tracking-wider text-teal-300/90' : 'top-1/2 -translate-y-1/2 text-sm text-slate-400'}`}
        >
          {label}
        </label>
        <input
          id={id}
          type={type}
          value={value}
          min={min}
          max={max}
          autoComplete={autoComplete}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`w-full bg-transparent px-3 pb-2.5 text-sm text-slate-100 outline-none
            ${floated ? 'pt-5' : 'pt-3.5'} ${rightSlot ? 'pr-11' : ''}`}
        />
        {rightSlot ? (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</div>
        ) : null}
      </div>
      {error ? <p className="mt-1 text-xs text-rose-300">{error}</p> : null}
    </motion.div>
  )
}

function MagneticButton({ children, disabled, type = 'submit' }) {
  const ref = useRef(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 280, damping: 20 })
  const springY = useSpring(y, { stiffness: 280, damping: 20 })

  function onMove(e) {
    const el = ref.current
    if (!el || disabled) return
    const rect = el.getBoundingClientRect()
    const dx = e.clientX - (rect.left + rect.width / 2)
    const dy = e.clientY - (rect.top + rect.height / 2)
    x.set(dx * 0.18)
    y.set(dy * 0.22)
  }

  function onLeave() {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled}
      style={{ x: springX, y: springY }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      whileTap={{ scale: 0.98 }}
      className="relative mt-1 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl
        bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-500 px-4 py-3 text-sm font-semibold text-ink-950
        shadow-[0_12px_40px_rgba(45,212,191,0.35)] transition disabled:cursor-not-allowed disabled:opacity-55"
    >
      <span
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(circle at 30% 0%, rgba(255,255,255,0.55), transparent 55%)',
        }}
      />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  )
}

function Headline() {
  const words = ['Find', 'the', 'right', 'team.']
  return (
    <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
      {words.map((word, i) => (
        <motion.span
          key={word}
          initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: 0.25 + i * 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mr-[0.28em] inline-block"
        >
          {word}
        </motion.span>
      ))}
    </h1>
  )
}

export default function Login() {
  const { login, register, isAuthenticated, ready } = useAuth()
  const { logCommit } = useHood()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const showDemoHint = searchParams.get('demo') === '1'
  const baseId = useId()
  const demoRef = useRef(null)

  const [tab, setTab] = useState('login') // 'login' | 'signup'
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [warping, setWarping] = useState(false)
  const [departments, setDepartments] = useState([])
  const [stats, setStats] = useState(STATIC_STATS)
  const [fieldErrors, setFieldErrors] = useState({})

  // Shared / login fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // Sign-up only
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [year, setYear] = useState('')
  const [signupStep, setSignupStep] = useState(0)
  const [bio, setBio] = useState('')
  const [githubPortfolio, setGithubPortfolio] = useState('')
  const [college, setCollege] = useState('')
  const [experienceLevel, setExperienceLevel] = useState('BEGINNER')
  const [skillCatalog, setSkillCatalog] = useState([])
  const [signupSkills, setSignupSkills] = useState([])
  const [skillSearch, setSkillSearch] = useState('')

  const strength = passwordStrength(password)

  useEffect(() => {
    api
      .getDepartments()
      .then(setDepartments)
      .catch(() => setDepartments([]))

    api.getSkills().then(setSkillCatalog).catch(() => setSkillCatalog([]))

    // Stats require auth — try anyway; fall back to static demo numbers
    api
      .getStats()
      .then((data) => {
        const t = data.totals || data
        setStats([
          { key: 'students', label: 'Students', value: t.total_students ?? 10 },
          { key: 'projects', label: 'Projects', value: t.total_projects ?? 4 },
          { key: 'pending', label: 'Open asks', value: t.pending_requests ?? 6 },
        ])
      })
      .catch(() => setStats(STATIC_STATS))
  }, [])

  const signupSkillGroups = useMemo(() => {
    const query = skillSearch.trim().toLowerCase()
    return skillCatalog
      .filter((skill) => `${skill.skill_name} ${skill.skill_category || ''}`.toLowerCase().includes(query))
      .reduce((groups, skill) => {
        const category = skill.skill_category || 'Other skills'
        groups[category] = [...(groups[category] || []), skill]
        return groups
      }, {})
  }, [skillCatalog, skillSearch])

  // From "Switch demo user" — scroll demo chips into view
  useEffect(() => {
    if (!showDemoHint) return undefined
    const t = setTimeout(() => {
      demoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 350)
    return () => clearTimeout(t)
  }, [showDemoHint])

  if (ready && isAuthenticated && !warping) {
    return <Navigate to="/home" replace />
  }

  function fillDemo(account) {
    setTab('login')
    setEmail(account.email)
    setPassword(DEMO_PASSWORD)
    setFieldErrors({})
  }

  function validateLogin() {
    const next = {}
    if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email'
    if (!password) next.password = 'Password is required'
    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  function validateSignupStep(step = signupStep) {
    const next = {}
    if (step === 0) {
      if (!firstName.trim()) next.firstName = 'First name is required'
      if (!lastName.trim()) next.lastName = 'Last name is required'
      if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email'
      if (!departmentId) next.departmentId = 'Pick a department'
      const y = Number(year)
      if (!y || y < 1 || y > 4 || !Number.isInteger(y)) next.year = 'Year must be 1–4'
      if (password.length < 8) next.password = 'At least 8 characters'
    }
    if (step === 1) {
      if (bio.length > 500) next.bio = 'Bio must be 500 characters or fewer'
      if (githubPortfolio.length > 255) next.githubPortfolio = 'GitHub link is too long'
      if (college.length > 150) next.college = 'College must be 150 characters or fewer'
    }
    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  async function runSuccessTransition() {
    setWarping(true)
    // Card scales + constellation warps, then land on Discover
    await new Promise((r) => setTimeout(r, 1100))
    navigate('/home', { replace: true })
  }

  async function submitRegistration(skills = signupSkills) {
    setBusy(true)
    setFieldErrors({})
    try {
      const res = await register({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        password,
        department_id: Number(departmentId),
        year_of_study: Number(year),
        bio: bio.trim(),
        github_portfolio: githubPortfolio.trim(),
        college: college.trim(),
        experience_level: experienceLevel,
        skills,
      })
      const first = res?.student?.first_name || firstName.trim() || 'there'
      logCommit('POST /auth/register', res.executed)
      toast.success(`Welcome, ${first}`)
      await runSuccessTransition()
    } catch (err) {
      const msg = err.message || 'Something went wrong'
      toast.error(msg)
      // Surface backend errors under the most likely field
      if (/email|account|exists/i.test(msg)) {
        setFieldErrors({ email: msg })
      } else if (/password/i.test(msg)) {
        setFieldErrors({ password: msg })
      } else if (/blocked|suspended/i.test(msg)) {
        setFieldErrors({ email: msg })
      } else {
        setFieldErrors({ form: msg })
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (tab === 'login') {
      if (!validateLogin()) return
      setBusy(true)
      setFieldErrors({})
      try {
        const res = await login(email.trim(), password)
        toast.success(`Welcome back, ${res?.student?.first_name || 'there'}`)
        await runSuccessTransition()
      } catch (err) {
        const msg = err.message || 'Something went wrong'
        toast.error(msg)
        setFieldErrors(/password|email|account/i.test(msg) ? { email: msg } : { form: msg })
      } finally {
        setBusy(false)
      }
      return
    }

    if (!validateSignupStep()) return
    if (signupStep < 2) {
      setSignupStep((current) => current + 1)
      return
    }
    submitRegistration()
  }

  function toggleSignupSkill(skill) {
    setSignupSkills((current) => {
      const existing = current.find((entry) => entry.skill_id === skill.skill_id)
      if (existing) return current.filter((entry) => entry.skill_id !== skill.skill_id)
      if (current.length >= 10) {
        toast.error('Choose up to 10 skills')
        return current
      }
      return [...current, { skill_id: skill.skill_id, proficiency_level: 'BEGINNER', years_of_experience: 0 }]
    })
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#04060c] font-sans text-slate-100">
      {/* Mobile / reduced: static aurora (canvas hidden below md) */}
      <div
        className="pointer-events-none absolute inset-0 md:hidden"
        style={{
          background:
            'radial-gradient(ellipse at 20% 0%, rgba(45,212,191,0.22), transparent 50%), radial-gradient(ellipse at 90% 80%, rgba(56,189,248,0.14), transparent 45%), #04060c',
        }}
      />

      <div className="relative z-10 flex min-h-screen flex-col md:flex-row">
        {/* LEFT — constellation stage (60%) */}
        <section className="relative hidden w-full overflow-hidden md:block md:w-[60%]">
          <ConstellationCanvas
            warping={warping}
            className={`absolute inset-0 h-full w-full transition-transform duration-1000 ease-in
              ${warping ? 'scale-[2.4] opacity-40' : 'scale-100 opacity-100'}`}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#04060c]/80" />

          <div className="relative z-10 flex h-full flex-col justify-end px-10 pb-14 pt-20 lg:px-14">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-teal-200/90 backdrop-blur"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Constellation
            </motion.div>

            <Headline />

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.85 }}
              className="mt-4 max-w-md text-sm leading-relaxed text-slate-400"
            >
              Match skills to campus projects and assemble a team that actually fits.
            </motion.p>

            <motion.dl
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="mt-10 grid max-w-lg grid-cols-3 gap-4"
            >
              {stats.map((s) => (
                <div key={s.key} className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 backdrop-blur-md">
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {s.label}
                  </dt>
                  <dd className="mt-1 font-display text-2xl font-bold text-white">
                    <CountUp value={s.value} />
                  </dd>
                </div>
              ))}
            </motion.dl>
          </div>
        </section>

        {/* RIGHT — glass auth card (40%) */}
        <section className="relative flex w-full flex-1 items-center justify-center px-4 py-10 md:w-[40%] md:px-8">
          <motion.div
            animate={
              warping
                ? { scale: 0.72, opacity: 0, filter: 'blur(12px)' }
                : { scale: 1, opacity: 1, filter: 'blur(0px)' }
            }
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            className="w-full max-w-md"
          >
            {/* Brand on mobile (canvas hidden) */}
            <div className="mb-6 md:hidden">
              <p className="font-display text-2xl font-bold tracking-tight text-white">Constellation</p>
              <p className="text-sm text-slate-400">Find the right team.</p>
            </div>

            <div
              className="rounded-3xl border border-white/10 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-8"
              style={{
                background:
                  'linear-gradient(160deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 45%, rgba(8,12,24,0.55) 100%)',
              }}
            >
              {/* Tabs */}
              <div
                role="tablist"
                aria-label="Authentication mode"
                className="relative mb-6 grid grid-cols-2 rounded-xl bg-white/[0.04] p-1"
              >
                {['login', 'signup'].map((key) => {
                  const selected = tab === key
                  return (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      id={`${baseId}-tab-${key}`}
                      onClick={() => {
                        setTab(key)
                        setSignupStep(0)
                        setFieldErrors({})
                      }}
                      className={`relative z-10 rounded-lg py-2 text-sm font-semibold transition
                        ${selected ? 'text-ink-950' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      {selected ? (
                        <motion.span
                          layoutId="auth-tab-pill"
                          className="absolute inset-0 rounded-lg bg-gradient-to-r from-teal-300 to-cyan-400"
                          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        />
                      ) : null}
                      <span className="relative z-10">
                        {key === 'login' ? 'Login' : 'Sign up'}
                      </span>
                    </button>
                  )
                })}
              </div>

              {tab === 'signup' ? (
                <div className="mb-5 flex items-center" aria-label="Sign-up steps">
                  {['Account', 'About you', 'Skills'].map((label, index) => (
                    <div key={label} className="flex flex-1 items-center last:flex-none">
                      <div className="flex items-center gap-1.5">
                        <motion.span animate={{ scale: signupStep === index ? 1.08 : 1 }} className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${index <= signupStep ? 'bg-gradient-to-r from-teal-300 to-cyan-400 text-ink-950' : 'bg-white/10 text-slate-400'}`} aria-current={signupStep === index ? 'step' : undefined}>
                          {index < signupStep ? <Check className="h-3.5 w-3.5" /> : index + 1}
                        </motion.span>
                        <span className={`hidden text-[10px] font-semibold sm:inline ${index === signupStep ? 'text-teal-200' : 'text-slate-500'}`}>{label}</span>
                      </div>
                      {index < 2 ? <div className={`mx-2 h-px flex-1 ${index < signupStep ? 'bg-teal-300' : 'bg-white/10'}`} /> : null}
                    </div>
                  ))}
                </div>
              ) : null}

              <AnimatePresence mode="wait">
                <motion.form
                  key={tab}
                  role="tabpanel"
                  aria-labelledby={`${baseId}-tab-${tab}`}
                  onSubmit={handleSubmit}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.28, ease: 'easeInOut' }}
                  className="space-y-3.5 overflow-hidden"
                >
                  {tab === 'signup' && signupStep === 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      <FloatField
                        id={`${baseId}-fn`}
                        label="First name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        error={fieldErrors.firstName}
                        autoComplete="given-name"
                      />
                      <FloatField
                        id={`${baseId}-ln`}
                        label="Last name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        error={fieldErrors.lastName}
                        autoComplete="family-name"
                      />
                    </div>
                  ) : null}

                  {tab === 'login' || signupStep === 0 ? (
                    <FloatField
                      id={`${baseId}-email`}
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      error={fieldErrors.email}
                      autoComplete="email"
                    />
                  ) : null}

                  {tab === 'signup' && signupStep === 0 ? (
                    <>
                      <motion.div
                        animate={fieldErrors.departmentId ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                        transition={{ duration: 0.35 }}
                      >
                        <label htmlFor={`${baseId}-dept`} className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          Department
                        </label>
                        <select
                          id={`${baseId}-dept`}
                          value={departmentId}
                          onChange={(e) => setDepartmentId(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-slate-100 outline-none
                            focus:border-teal-400/60 focus:shadow-[0_0_0_3px_rgba(45,212,191,0.15)]"
                        >
                          <option value="" className="bg-ink-900">
                            Select department
                          </option>
                          {departments.map((d) => (
                            <option key={d.department_id} value={d.department_id} className="bg-ink-900">
                              {d.department_name}
                            </option>
                          ))}
                        </select>
                        {fieldErrors.departmentId ? (
                          <p className="mt-1 text-xs text-rose-300">{fieldErrors.departmentId}</p>
                        ) : null}
                      </motion.div>

                      <FloatField
                        id={`${baseId}-year`}
                        label="Year of study"
                        type="number"
                        min={1}
                        max={4}
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        error={fieldErrors.year}
                        autoComplete="off"
                      />
                    </>
                  ) : null}

                  {tab === 'login' || signupStep === 0 ? <div>
                    <FloatField
                      id={`${baseId}-pw`}
                      label="Password"
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      error={fieldErrors.password}
                      autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                      rightSlot={
                        <button
                          type="button"
                          aria-label={showPw ? 'Hide password' : 'Show password'}
                          onClick={() => setShowPw((v) => !v)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-slate-200"
                        >
                          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      }
                    />
                    {tab === 'signup' && password ? (
                      <div className="mt-2">
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                          <motion.div
                            className={`h-full rounded-full ${strength.color}`}
                            initial={false}
                            animate={{ width: strength.width }}
                            transition={{ type: 'spring', stiffness: 200, damping: 24 }}
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">{strength.label}</p>
                      </div>
                    ) : null}
                  </div> : null}

                  {tab === 'signup' && signupStep === 1 ? (
                    <motion.div animate={fieldErrors.bio || fieldErrors.githubPortfolio || fieldErrors.college ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }} transition={{ duration: 0.35 }} className="space-y-3.5">
                      <p className="text-xs text-slate-400">These details are optional. You can add them later from your Profile page.</p>
                      <div>
                        <div className="mb-1 flex justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-500"><label htmlFor={`${baseId}-bio`}>Bio</label><span>{bio.length}/500</span></div>
                        <textarea id={`${baseId}-bio`} maxLength={500} rows={3} value={bio} onChange={(event) => setBio(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-teal-400/60" placeholder="A little about you" />
                        {fieldErrors.bio ? <p className="text-xs text-rose-300">{fieldErrors.bio}</p> : null}
                      </div>
                      <FloatField id={`${baseId}-github`} label="GitHub portfolio (optional)" type="url" value={githubPortfolio} onChange={(event) => setGithubPortfolio(event.target.value)} error={fieldErrors.githubPortfolio} autoComplete="url" />
                      <FloatField id={`${baseId}-college`} label="College (optional)" value={college} onChange={(event) => setCollege(event.target.value)} error={fieldErrors.college} autoComplete="organization" />
                      <div>
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Experience level</p>
                        <div className="flex flex-wrap gap-1 rounded-xl bg-white/[0.04] p-1">
                          {['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'].map((level) => <button key={level} type="button" aria-pressed={experienceLevel === level} onClick={() => setExperienceLevel(level)} className={`rounded-lg px-2 py-2 text-[10px] font-semibold ${experienceLevel === level ? 'bg-gradient-to-r from-teal-300 to-cyan-400 text-ink-950' : 'text-slate-400 hover:bg-white/5'}`}>{level[0] + level.slice(1).toLowerCase()}</button>)}
                        </div>
                      </div>
                    </motion.div>
                  ) : null}

                  {tab === 'signup' && signupStep === 2 ? (
                    <motion.div animate={Object.keys(fieldErrors).length ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }} transition={{ duration: 0.35 }} className="space-y-3.5">
                      <p className="text-xs text-slate-400">Pick skills now to get relevant project matches. You can also skip this step.</p>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input type="search" value={skillSearch} onChange={(event) => setSkillSearch(event.target.value)} aria-label="Search skills" placeholder="Search skills…" className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-3 text-sm text-slate-100 outline-none focus:border-teal-400/60" />
                      </div>
                      <div className="max-h-40 space-y-3 overflow-y-auto rounded-xl border border-white/10 p-3">
                        {Object.entries(signupSkillGroups).map(([category, skills]) => <section key={category}><p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{category}</p><div className="flex flex-wrap gap-1.5">{skills.map((skill) => {
                          const selected = signupSkills.some((item) => item.skill_id === skill.skill_id)
                          return <button key={skill.skill_id} type="button" aria-pressed={selected} onClick={() => toggleSignupSkill(skill)} className={`rounded-full border px-2.5 py-1 text-xs ${selected ? 'border-teal-300 bg-teal-300 text-ink-950' : 'border-white/10 bg-white/5 text-slate-200 hover:border-teal-300/50'}`}>{selected ? '✓ ' : '+ '}{skill.skill_name}</button>
                        })}</div></section>)}
                        {!Object.keys(signupSkillGroups).length ? <p className="text-xs text-slate-400">No skills found.</p> : null}
                      </div>
                      <div className="max-h-36 space-y-2 overflow-y-auto">
                        {signupSkills.map((item) => {
                          const skill = skillCatalog.find((row) => row.skill_id === item.skill_id)
                          return <div key={item.skill_id} className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.04] px-3 py-2">
                            <span className="truncate text-xs font-medium">{skill?.skill_name}</span>
                            <div className="flex items-center gap-1.5">
                              <select aria-label={`${skill?.skill_name} proficiency`} value={item.proficiency_level} onChange={(event) => setSignupSkills((current) => current.map((entry) => entry.skill_id === item.skill_id ? { ...entry, proficiency_level: event.target.value } : entry))} className="rounded-lg border border-white/10 bg-ink-900 px-2 py-1.5 text-[10px] text-slate-100">
                                {['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'].map((level) => <option key={level} value={level}>{level[0] + level.slice(1).toLowerCase()}</option>)}
                              </select>
                              <button type="button" aria-label={`Remove ${skill?.skill_name}`} onClick={() => toggleSignupSkill(skill)} className="rounded-md p-1 text-slate-400 hover:text-rose-300"><X className="h-3.5 w-3.5" /></button>
                            </div>
                          </div>
                        })}
                      </div>
                      <p className="text-[10px] text-slate-500">{signupSkills.length}/10 selected · You can add experience years later.</p>
                    </motion.div>
                  ) : null}

                  {fieldErrors.form ? (
                    <p className="text-xs text-rose-300" role="alert">
                      {fieldErrors.form}
                    </p>
                  ) : null}

                  {tab === 'login' || signupStep === 2 ? (
                    <MagneticButton disabled={busy}>
                      {busy ? <><Loader2 className="h-4 w-4 animate-spin" />{tab === 'login' ? 'Signing in…' : 'Creating account…'}</> : tab === 'login' ? 'Sign in' : 'Create account'}
                    </MagneticButton>
                  ) : (
                    <div className="flex items-center justify-between gap-2 pt-1">
                      {signupStep === 1 ? <button type="button" onClick={() => { setSignupStep(0); setFieldErrors({}) }} className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2.5 text-xs font-semibold text-slate-300"><ChevronLeft className="h-4 w-4" /> Back</button> : <span />}
                      <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-300 to-cyan-400 px-4 py-2.5 text-xs font-bold text-ink-950">Continue <ChevronRight className="h-4 w-4" /></button>
                    </div>
                  )}

                  {tab === 'signup' && signupStep === 2 ? (
                    <div className="flex items-center justify-between gap-2">
                      <button type="button" onClick={() => { setSignupStep(1); setFieldErrors({}) }} className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2.5 text-xs font-semibold text-slate-300"><ChevronLeft className="h-4 w-4" /> Back</button>
                      <button type="button" disabled={busy} onClick={() => submitRegistration([])} className="text-xs font-semibold text-slate-400 underline decoration-white/20 underline-offset-4 hover:text-teal-200">Skip for now</button>
                    </div>
                  ) : null}
                </motion.form>
              </AnimatePresence>

              {/* Demo account chips — DEMO ONLY */}
              <div
                ref={demoRef}
                className={`mt-6 border-t border-white/10 pt-5 transition
                  ${showDemoHint ? 'rounded-2xl ring-2 ring-teal-400/50 ring-offset-2 ring-offset-[#0a101c]' : ''}`}
              >
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Demo accounts
                  {showDemoHint ? (
                    <span className="ml-2 font-medium normal-case tracking-normal text-teal-300">
                      — pick a user to continue the demo
                    </span>
                  ) : null}
                </p>
                <div className="flex flex-wrap gap-2">
                  {DEMO_ACCOUNTS.map((a) => (
                    <button
                      key={a.email}
                      type="button"
                      onClick={() => fillDemo(a)}
                      className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-3 text-xs font-medium text-slate-200
                        transition hover:border-teal-400/40 hover:bg-white/[0.08]"
                    >
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${a.color} text-[11px] font-bold text-ink-950`}
                      >
                        {a.initial}
                      </span>
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  )
}
