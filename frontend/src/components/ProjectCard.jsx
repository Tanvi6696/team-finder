import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'
import MatchRing from './MatchRing'

function SkillChip({ label, tone }) {
  const cls =
    tone === 'match'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
      : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
  return <span className={`chip ${cls}`}>{label}</span>
}

/** The shared project card used in Discover and in the create wizard preview. */
export default function ProjectCard({ project, onOpen = () => {}, highlight = false }) {
  const closingSoon = project.days_left != null && project.days_left >= 0 && project.days_left <= 30
  const matched = project.matched_skills || []
  const missing = project.missing_skills || []

  return (
    <motion.button
      id={`project-card-${project.project_id}`}
      type="button"
      layout
      onClick={() => onOpen(project.project_id)}
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className={`glass group w-full cursor-pointer p-5 text-left transition hover:shadow-lift hover:ring-1 hover:ring-indigo-300/50 dark:hover:ring-violet-400/30 ${highlight ? 'project-highlight' : ''}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-semibold leading-snug group-hover:accent-text">
              {project.project_title}
            </h3>
            {closingSoon ? (
              <span className="chip inline-flex items-center gap-1 bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                <Clock className="h-3 w-3" /> closing soon
              </span>
            ) : null}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {project.domain} · {project.creator_name}
          </p>
        </div>
        <MatchRing value={project.match_percentage} />
      </div>

      <p className="mb-3 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
        {project.project_description}
      </p>

      <div className="mb-3 flex flex-wrap gap-1.5">
        <span className="chip bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">
          {project.difficulty_level}
        </span>
        <span className="chip bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
          {project.project_status}
        </span>
        <span className="chip bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">
          {project.current_team_size}/{project.max_team_size} seats
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {matched.slice(0, 4).map((skill) => (
          <SkillChip key={`m-${skill.skill_id}`} label={skill.skill_name} tone="match" />
        ))}
        {missing.slice(0, 4).map((skill) => (
          <SkillChip key={`x-${skill.skill_id}`} label={skill.skill_name} tone="miss" />
        ))}
      </div>
    </motion.button>
  )
}
