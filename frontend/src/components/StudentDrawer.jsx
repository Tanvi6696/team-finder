import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { proficiencyToInt } from '../lib/match'
import { useTheme } from '../context/ThemeContext'
import DrawerShell from './DrawerShell'

const PROF_LABEL = ['', 'Beg', 'Int', 'Adv', 'Exp']

export default function StudentDrawer({ student, open, onClose }) {
  const { dark } = useTheme()
  const skills = student?.skills || []

  const radarData = skills.map((s) => ({
    skill: s.skill_name,
    level: proficiencyToInt(s.proficiency_level),
    fullMark: 4,
  }))

  return (
    <DrawerShell
      open={open}
      onClose={onClose}
      subtitle="Student profile"
      title={student ? `${student.first_name} ${student.last_name}` : 'Student'}
    >
      {!student ? (
        <div className="space-y-3">
          <div className="skeleton h-4 w-2/3" />
          <div className="skeleton h-40 w-full" />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="chip bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">
              {student.department_name || student.department_code}
            </span>
            <span className="chip bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
              {student.experience_level}
            </span>
            <span className="chip bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">
              {student.availability_status?.replaceAll('_', ' ')}
            </span>
            <span className="chip bg-slate-100 text-slate-600 dark:bg-white/10">
              Year {student.year_of_study}
            </span>
          </div>

          {student.bio ? (
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{student.bio}</p>
          ) : null}

          <div>
            <h3 className="mb-2 text-sm font-semibold">Skill radar</h3>
            {radarData.length === 0 ? (
              <p className="text-sm text-slate-400">No skills on profile yet.</p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke={dark ? 'rgba(255,255,255,0.12)' : '#e2e8f0'} />
                    <PolarAngleAxis
                      dataKey="skill"
                      tick={{ fill: dark ? '#cbd5e1' : '#64748b', fontSize: 10 }}
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 4]}
                      tickCount={5}
                      tickFormatter={(v) => PROF_LABEL[v] || ''}
                      tick={{ fill: '#94a3b8', fontSize: 9 }}
                    />
                    <Radar
                      name="Proficiency"
                      dataKey="level"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.35}
                    />
                    <Tooltip
                      formatter={(v) => [PROF_LABEL[v] || v, 'Level']}
                      contentStyle={{
                        background: dark ? '#1e1b4b' : '#fff',
                        borderRadius: 12,
                        border: '1px solid rgba(139,92,246,0.3)',
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Skills</h3>
            <ul className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <li
                  key={s.skill_id}
                  className="chip bg-white/70 text-slate-700 dark:bg-white/10 dark:text-slate-200"
                >
                  {s.skill_name}
                  <span className="ml-1.5 rounded-full bg-indigo-100 px-1.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-500/30 dark:text-indigo-200">
                    {s.proficiency_level}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </DrawerShell>
  )
}
