/** Shared helpers for match % and proficiency (viva-friendly). */

export const PROFICIENCY_RANK = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
  EXPERT: 4,
}

export function proficiencyToInt(level) {
  if (!level) return 0
  return PROFICIENCY_RANK[String(level).toUpperCase()] || 0
}

/**
 * Client-side match % using importance_weight + minimum_proficiency.
 * activeSkillIds = set of skill_ids the student "has" in the What-If sim
 * (assumed at least at the project's minimum when toggled on).
 */
export function computeMatchPercent(requiredSkills, activeSkillIds) {
  const required = requiredSkills || []
  if (!required.length) return 0
  const total = required.reduce((s, r) => s + (r.importance_weight || 0), 0)
  if (!total) return 0
  const earned = required.reduce((s, r) => {
    if (activeSkillIds.has(r.skill_id)) return s + (r.importance_weight || 0)
    return s
  }, 0)
  return Math.round((earned / total) * 1000) / 10 // 1 decimal
}

/**
 * Hint: which single missing required skill, if learned, raises match the most.
 * Returns { skill_name, nextPercent } or null.
 */
export function bestLearnHint(requiredSkills, activeSkillIds) {
  const required = requiredSkills || []
  let best = null
  for (const r of required) {
    if (activeSkillIds.has(r.skill_id)) continue
    const nextIds = new Set(activeSkillIds)
    nextIds.add(r.skill_id)
    const next = computeMatchPercent(required, nextIds)
    if (!best || next > best.nextPercent) {
      best = { skill_name: r.skill_name, skill_id: r.skill_id, nextPercent: next }
    }
  }
  return best
}

export const CONNECTION_COLORS = {
  PREVIOUS_TEAMMATE: '#6366f1',
  CURRENT_TEAMMATE: '#22c55e',
  PROJECT_COLLABORATOR: '#a855f7',
  MUTUAL_CONNECTION: '#f59e0b',
}
