import { Inbox } from 'lucide-react'

/** Friendly empty-state panel used across pages. */
export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  description,
  action,
}) {
  return (
    <div className="glass flex flex-col items-center px-6 py-12 text-center">
      <Icon className="mb-3 h-10 w-10 text-indigo-400" aria-hidden />
      <h3 className="font-display text-lg font-bold">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
