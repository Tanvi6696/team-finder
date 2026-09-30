import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronDown,
  ChevronUp,
  Terminal,
  Trash2,
  Circle,
} from 'lucide-react'
import { useHood, extractTeamSizes, formatExecutedStep } from '../context/HoodContext'

function padTime(d) {
  return d.toLocaleTimeString(undefined, {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function EntryBlock({ entry }) {
  const isCommit = entry.status === 'commit'
  const tone = isCommit ? 'text-emerald-400' : 'text-rose-400'
  const badge = isCommit ? 'COMMIT' : 'ROLLBACK'
  const { before, after } = extractTeamSizes(entry.executed)

  return (
    <div className="border-b border-white/5 px-4 py-3 font-mono text-[12px] leading-relaxed last:border-0">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className={`tabular-nums ${tone}`}>[{padTime(entry.at)}]</span>
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider ${
            isCommit
              ? 'bg-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/20 text-rose-300'
          }`}
        >
          {badge}
        </span>
        <span className="text-slate-200">{entry.action}</span>
        {before != null || after != null ? (
          <span className="ml-auto text-amber-300/90">
            team_size {before ?? '?'} → {after ?? '?'}
          </span>
        ) : null}
      </div>

      {entry.executed?.length ? (
        <ul className="space-y-0.5 pl-2 text-slate-400">
          {entry.executed.map((step, i) => {
            const line = formatExecutedStep(step)
            const isSize =
              step &&
              typeof step === 'object' &&
              ('current_team_size_before' in step || 'current_team_size_after' in step)
            return (
              <li
                key={i}
                className={
                  isSize
                    ? 'text-amber-300/90'
                    : line.startsWith('$')
                      ? 'text-cyan-300/90'
                      : line.startsWith('#')
                        ? 'text-slate-500'
                        : ''
                }
              >
                {line}
              </li>
            )
          })}
        </ul>
      ) : null}

      {!isCommit && entry.error ? (
        <p className="mt-1 pl-2 text-rose-400">! {entry.error}</p>
      ) : null}
    </div>
  )
}

/**
 * Collapsible bottom drawer — terminal log of write SQL / procedures.
 */
export default function UnderTheHood() {
  const { entries, open, setOpen, clear } = useHood()
  const latest = entries[0]

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex justify-center px-3 pb-3 sm:px-6">
      <div className="pointer-events-auto w-full max-w-5xl">
        {/* Collapsed / expanded chrome */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2 rounded-t-2xl border border-b-0 border-white/10
            bg-ink-950/95 px-4 py-2.5 text-left text-sm text-slate-200 shadow-2xl backdrop-blur-xl"
        >
          <Terminal className="h-4 w-4 text-indigo-300" />
          <span className="font-display font-semibold">Under the Hood</span>
          {latest ? (
            <span className="hidden items-center gap-1.5 text-xs text-slate-400 sm:inline-flex">
              <Circle
                className={`h-2 w-2 fill-current ${
                  latest.status === 'commit' ? 'text-emerald-400' : 'text-rose-400'
                }`}
              />
              last: {latest.action}
            </span>
          ) : (
            <span className="text-xs text-slate-500">write actions appear here</span>
          )}
          <span className="ml-auto inline-flex items-center gap-2 text-xs text-slate-400">
            {entries.length ? `${entries.length} events` : null}
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </span>
        </button>

        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              key="hood-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 260, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden rounded-b-2xl border border-white/10 bg-[#0b0914] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/5 px-4 py-1.5">
                <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                  executed[] · green = commit · red = rollback
                </p>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-slate-400
                    hover:bg-white/5 hover:text-slate-200"
                  onClick={clear}
                  disabled={!entries.length}
                >
                  <Trash2 className="h-3 w-3" /> Clear
                </button>
              </div>

              <div className="h-[210px] overflow-y-auto">
                {entries.length === 0 ? (
                  <p className="px-4 py-8 text-center font-mono text-xs text-slate-600">
                    $ waiting for INSERT / CALL …
                  </p>
                ) : (
                  entries.map((entry) => <EntryBlock key={entry.id} entry={entry} />)
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}
