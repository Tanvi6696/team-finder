import { useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Moon, Sun, LogOut, Users, ChevronDown } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

function initials(user) {
  if (!user) return '?'
  const a = (user.first_name || '')[0] || ''
  const b = (user.last_name || '')[0] || ''
  return `${a}${b}`.toUpperCase() || '?'
}

const EXP_STYLES = {
  BEGINNER: 'bg-slate-500/20 text-slate-200',
  INTERMEDIATE: 'bg-sky-500/20 text-sky-200',
  ADVANCED: 'bg-violet-500/20 text-violet-200',
  EXPERT: 'bg-amber-500/20 text-amber-200',
}

export default function TopBar({ title, subtitle, action }) {
  const { dark, toggle } = useTheme()
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [exiting, setExiting] = useState(false)
  const menuId = useId()
  const wrapRef = useRef(null)

  useEffect(() => {
    function onDoc(e) {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  async function playLogoutThen(path) {
    setOpen(false)
    setExiting(true)
    // Short exit animation before clearing the session
    await new Promise((r) => setTimeout(r, 420))
    logout()
    navigate(path, { replace: true })
  }

  function handleLogout() {
    playLogoutThen('/login')
  }

  function handleSwitchDemo() {
    // DEMO ONLY — bounce to login with demo chips highlighted
    playLogoutThen('/login?demo=1')
  }

  const dept =
    user?.department_name ||
    user?.department_code ||
    (user?.department_id != null ? `Dept #${user.department_id}` : '—')
  const exp = user?.experience_level || '—'

  return (
    <>
      {/* Full-app fade on logout */}
      <AnimatePresence>
        {exiting ? (
          <motion.div
            key="logout-veil"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pointer-events-none fixed inset-0 z-[80] bg-[#04060c]/70 backdrop-blur-sm"
          />
        ) : null}
      </AnimatePresence>

      <motion.header
        animate={exiting ? { opacity: 0, y: -12, scale: 0.98 } : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeIn' }}
        className="flex flex-wrap items-center justify-between gap-4 border-b border-white/30 px-4 py-4 sm:px-6 dark:border-white/5"
      >
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {action}
          <button
            type="button"
            onClick={toggle}
            className="btn-ghost !p-2.5"
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <div className="relative" ref={wrapRef}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={open}
              aria-controls={menuId}
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-white/40 bg-white/70 py-1.5 pl-1.5 pr-2.5 text-left shadow-sm
                outline-none backdrop-blur transition hover:bg-white focus-visible:ring-2 focus-visible:ring-indigo-400
                dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-gradient text-xs font-bold text-white">
                {initials(user)}
              </span>
              <span className="hidden min-w-0 sm:block">
                <span className="block max-w-[9rem] truncate text-sm font-semibold leading-tight">
                  {user ? `${user.first_name} ${user.last_name}` : 'Account'}
                </span>
                <span className="block max-w-[9rem] truncate text-[10px] text-slate-500 dark:text-slate-400">
                  {dept}
                </span>
              </span>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {open ? (
                <motion.div
                  id={menuId}
                  role="menu"
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.16 }}
                  className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-white/40 bg-white/95 shadow-lift
                    backdrop-blur-xl dark:border-white/10 dark:bg-ink-900/95"
                >
                  <div className="border-b border-slate-100 px-4 py-3 dark:border-white/10">
                    <p className="font-display text-sm font-semibold">
                      {user ? `${user.first_name} ${user.last_name}` : 'Signed in'}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{dept}</p>
                    <span
                      className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide
                        ${EXP_STYLES[exp] || 'bg-indigo-500/15 text-indigo-300'}`}
                    >
                      {String(exp).replaceAll('_', ' ')}
                    </span>
                  </div>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSwitchDemo}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700
                      transition hover:bg-indigo-50 dark:text-slate-200 dark:hover:bg-white/5"
                  >
                    <Users className="h-4 w-4 text-indigo-500" />
                    Switch demo user
                  </button>

                  <Link
                    to="/profile"
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-indigo-50 dark:text-slate-200 dark:hover:bg-white/5"
                  >
                    My Profile
                  </Link>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-left text-sm font-medium text-rose-600
                      transition hover:bg-rose-50 dark:border-white/10 dark:text-rose-300 dark:hover:bg-rose-500/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </motion.header>
    </>
  )
}
