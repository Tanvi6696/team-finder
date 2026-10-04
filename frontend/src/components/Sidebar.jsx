import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Home,
  Compass,
  Inbox,
  Users,
  Share2,
  BarChart3,
  Terminal,
  UserRound,
  Sparkles,
  Menu,
  X,
} from 'lucide-react'

const links = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/profile', label: 'Profile', icon: UserRound },
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/inbox', label: 'Inbox', icon: Inbox },
  { to: '/teammates', label: 'Teammates', icon: Users },
  { to: '/network', label: 'Network', icon: Share2 },
  { to: '/insights', label: 'Campus Insights', icon: BarChart3 },
]

function NavItems({ onNavigate }) {
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            [
              'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
              isActive
                ? 'bg-accent-gradient text-white shadow-md shadow-indigo-500/30'
                : 'text-slate-600 hover:bg-indigo-50 dark:text-slate-300 dark:hover:bg-white/5',
            ].join(' ')
          }
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <>
      <div className="glass-strong fixed inset-x-0 top-0 z-30 flex items-center gap-3 border-b border-white/20 px-4 py-3 md:hidden">
        <button
          type="button"
          className="btn-ghost !p-2"
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-gradient">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-display font-bold">Team Finder</span>
        </div>
      </div>

      <aside className="glass-strong hidden w-64 shrink-0 flex-col border-r border-white/30 p-4 dark:border-white/5 md:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-gradient shadow-lg shadow-indigo-500/40">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-display text-lg font-bold leading-tight">Team Finder</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">College Project Hub</p>
          </div>
        </div>
        <NavItems />
        <p className="mt-4 px-2 text-[10px] uppercase tracking-wider text-slate-400">
          DBMS Open Ended Project
        </p>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink-950/50"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="glass-strong absolute inset-y-0 left-0 flex w-72 flex-col p-4 shadow-2xl">
            <div className="mb-6 flex items-center justify-between px-2">
              <p className="font-display text-lg font-bold">Menu</p>
              <button
                type="button"
                className="btn-ghost !p-2"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <NavItems onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}
    </>
  )
}
