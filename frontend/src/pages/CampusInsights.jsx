import { useEffect, useState } from 'react'
import { motion, animate } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts'
import {
  GraduationCap,
  FolderKanban,
  Sparkles,
  UsersRound,
} from 'lucide-react'
import toast from 'react-hot-toast'
import TopBar from '../components/TopBar'
import { api } from '../api'
import { useTheme } from '../context/ThemeContext'

const DONUT_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#818cf8']

/** Count-up number for the stat cards */
function CountUp({ value }) {
  const [text, setText] = useState('0')

  useEffect(() => {
    const controls = animate(0, Number(value) || 0, {
      duration: 1.1,
      ease: 'easeOut',
      onUpdate: (v) => setText(Math.round(v).toLocaleString()),
    })
    return () => controls.stop()
  }, [value])

  return <span className="tabular-nums">{text}</span>
}

function StatCard({ icon: Icon, label, value, delay }) {
  return (
    <motion.div
      className="glass p-5"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-gradient shadow-md shadow-indigo-500/30">
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
      <p className="font-display text-3xl font-bold accent-text">
        <CountUp value={value} />
      </p>
    </motion.div>
  )
}

function ChartCard({ title, children, className = '' }) {
  return (
    <div className={`glass p-5 ${className}`}>
      <h3 className="mb-4 font-display text-base font-semibold">{title}</h3>
      {children}
    </div>
  )
}

function useChartTheme() {
  const { dark } = useTheme()
  return {
    axis: dark ? '#94a3b8' : '#64748b',
    grid: dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)',
    tooltipBg: dark ? '#1e1b4b' : '#ffffff',
    tooltipBorder: dark ? 'rgba(255,255,255,0.1)' : 'rgba(99,102,241,0.2)',
  }
}

export default function CampusInsights() {
  const theme = useChartTheme()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api
      .getStats()
      .then(setStats)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [])

  const totals = stats?.totals || {}
  const domainData = stats?.projects_per_domain || []
  const experienceData = (stats?.students_per_experience || []).map((row) => ({
    name: row.experience_level,
    value: row.student_count,
  }))
  const skillData = (stats?.top_skills || []).map((row) => ({
    name: row.skill_name,
    count: row.student_count,
  }))

  return (
    <>
      <TopBar
        title="Campus Insights"
        subtitle="Global stats across the college team network"
      />

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        {loading ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass space-y-3 p-5">
                  <div className="skeleton h-3 w-20" />
                  <div className="skeleton h-9 w-16" />
                </div>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="glass skeleton h-80" />
              <div className="glass skeleton h-80" />
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={GraduationCap} label="Students" value={totals.total_students} delay={0} />
              <StatCard icon={FolderKanban} label="Projects" value={totals.total_projects} delay={0.05} />
              <StatCard icon={Sparkles} label="Skills" value={totals.total_skills} delay={0.1} />
              <StatCard icon={UsersRound} label="Teams" value={totals.total_teams} delay={0.15} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title="Projects per domain">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={domainData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                      <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="domain"
                        tick={{ fill: theme.axis, fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        angle={-18}
                        textAnchor="end"
                        height={56}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: theme.axis, fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: theme.tooltipBg,
                          border: `1px solid ${theme.tooltipBorder}`,
                          borderRadius: 12,
                        }}
                      />
                      <Bar dataKey="project_count" name="Projects" radius={[8, 8, 0, 0]} fill="url(#barGrad)" />
                      <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#6366f1" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard title="Students per experience level">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={experienceData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={58}
                        outerRadius={88}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {experienceData.map((_, i) => (
                          <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: theme.tooltipBg,
                          border: `1px solid ${theme.tooltipBorder}`,
                          borderRadius: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {experienceData.map((row, i) => (
                    <span key={row.name} className="chip bg-white/60 dark:bg-white/5">
                      <span
                        className="mr-1.5 inline-block h-2 w-2 rounded-full"
                        style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
                      />
                      {row.name} ({row.value})
                    </span>
                  ))}
                </div>
              </ChartCard>
            </div>

            <ChartCard title="Top 10 skills">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={skillData}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fill: theme.axis, fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      tick={{ fill: theme.axis, fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: theme.tooltipBg,
                        border: `1px solid ${theme.tooltipBorder}`,
                        borderRadius: 12,
                      }}
                    />
                    <Bar dataKey="count" name="Students" radius={[0, 8, 8, 0]} fill="url(#hbarGrad)" />
                    <defs>
                      <linearGradient id="hbarGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#a855f7" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </>
        )}
      </div>
    </>
  )
}
