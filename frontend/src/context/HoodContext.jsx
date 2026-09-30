import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const HoodContext = createContext(null)

/**
 * Stores "Under the Hood" log entries from write API calls.
 * Each entry shows the backend "executed" array as a terminal-style trace.
 */
export function HoodProvider({ children }) {
  const [entries, setEntries] = useState([])
  const [open, setOpen] = useState(false)

  const pushEntry = useCallback((entry) => {
    setEntries((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        at: new Date(),
        ...entry,
      },
      ...prev,
    ].slice(0, 40)) // keep last 40
    // Auto-open the drawer so the student sees the SQL trail
    setOpen(true)
  }, [])

  /** Successful write — green "commit" lines */
  const logCommit = useCallback(
    (action, executed = []) => {
      pushEntry({
        status: 'commit',
        action,
        executed: Array.isArray(executed) ? executed : [],
        error: null,
      })
    },
    [pushEntry],
  )

  /** Failed write / SIGNAL / rollback — red lines */
  const logRollback = useCallback(
    (action, errorMessage, executed = []) => {
      pushEntry({
        status: 'rollback',
        action,
        executed: Array.isArray(executed) ? executed : [],
        error: errorMessage || 'Transaction rolled back',
      })
    },
    [pushEntry],
  )

  const clear = useCallback(() => setEntries([]), [])

  const value = useMemo(
    () => ({ entries, open, setOpen, logCommit, logRollback, clear }),
    [entries, open, logCommit, logRollback, clear],
  )

  return <HoodContext.Provider value={value}>{children}</HoodContext.Provider>
}

export function useHood() {
  const ctx = useContext(HoodContext)
  if (!ctx) throw new Error('useHood must be used inside HoodProvider')
  return ctx
}

/** Pull team size before/after out of an executed[] payload */
export function extractTeamSizes(executed = []) {
  let before = null
  let after = null
  for (const step of executed) {
    if (step && typeof step === 'object') {
      if ('current_team_size_before' in step) before = step.current_team_size_before
      if ('current_team_size_after' in step) after = step.current_team_size_after
    }
  }
  return { before, after }
}

/** Format one executed step as a terminal line */
export function formatExecutedStep(step) {
  if (step == null) return String(step)
  if (typeof step === 'string') return step
  if (typeof step !== 'object') return String(step)

  if (step.sql) {
    const params = step.params != null ? `  params=${JSON.stringify(step.params)}` : ''
    return `$ ${step.sql}${params}`
  }
  if ('current_team_size_before' in step) {
    return `↳ team_size BEFORE = ${step.current_team_size_before}`
  }
  if ('current_team_size_after' in step) {
    return `↳ team_size AFTER  = ${step.current_team_size_after}`
  }
  if (step.note) return `# ${step.note}`
  return JSON.stringify(step)
}
