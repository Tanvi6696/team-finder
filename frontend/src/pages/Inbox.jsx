import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  X,
  Inbox as InboxIcon,
  Send,
  Users,
  Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import TopBar from '../components/TopBar'
import { api } from '../api'
import { useHood, extractTeamSizes } from '../context/HoodContext'

const STATUS_STYLES = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
  ACCEPTED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  REJECTED: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  CANCELLED: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
}

function TeamSizeBar({ before, after }) {
  // Prefer "after" when the accept response includes it
  const size = after ?? before
  if (size == null) return null
  // We only know current size from executed panel — show a compact indicator
  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <Users className="h-3 w-3" /> Team size
        </span>
        <span className="tabular-nums font-semibold text-indigo-600 dark:text-indigo-300">
          {before != null && after != null && before !== after
            ? `${before} → ${after}`
            : size}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
        <motion.div
          className="h-full rounded-full bg-accent-gradient"
          initial={{ width: before != null ? `${Math.min(100, before * 20)}%` : 0 }}
          animate={{ width: `${Math.min(100, (after ?? before) * 20)}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  )
}

function ReceivedCard({ item, busy, onAccept, onReject, sizeHint }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 80, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{ duration: 0.28 }}
      className="glass overflow-hidden p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-base font-semibold">{item.project_title}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            from <span className="font-medium text-slate-700 dark:text-slate-200">{item.sender_name}</span>
          </p>
          {item.message ? (
            <p className="mt-2 rounded-xl bg-white/50 px-3 py-2 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-300">
              “{item.message}”
            </p>
          ) : null}
          <p className="mt-2 text-xs text-slate-400">{item.requested_at}</p>
        </div>
        <span className={`chip ${STATUS_STYLES[item.request_status] || STATUS_STYLES.PENDING}`}>
          {item.request_status}
        </span>
      </div>

      {item.request_status === 'PENDING' ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary !px-3 !py-2"
            disabled={busy}
            onClick={() => onAccept(item)}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Accept
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={busy}
            onClick={() => onReject(item)}
          >
            <X className="h-4 w-4" />
            Reject
          </button>
        </div>
      ) : null}

      {sizeHint ? (
        <TeamSizeBar before={sizeHint.before} after={sizeHint.after} />
      ) : null}
    </motion.li>
  )
}

function SentCard({ item }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="glass p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-base font-semibold">{item.project_title}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            to <span className="font-medium text-slate-700 dark:text-slate-200">{item.receiver_name}</span>
          </p>
          {item.message ? (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">“{item.message}”</p>
          ) : null}
        </div>
        <span className={`chip ${STATUS_STYLES[item.request_status] || STATUS_STYLES.PENDING}`}>
          {item.request_status}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-400">{item.requested_at}</p>
    </motion.li>
  )
}

export default function InboxPage() {
  const { logCommit, logRollback } = useHood()
  const [tab, setTab] = useState('received')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  // Remember team-size before/after after an accept so the bar can animate
  const [sizeHints, setSizeHints] = useState({})

  const load = useCallback(() => {
    setLoading(true)
    api
      .getJoinRequests(tab)
      .then(setItems)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [tab])

  useEffect(() => {
    load()
  }, [load])

  async function handleAccept(item) {
    setBusyId(item.request_id)
    try {
      const res = await api.acceptJoinRequest(item.request_id)
      const { before, after } = extractTeamSizes(res.executed)
      logCommit(`CALL accept_join_request(${item.request_id})`, res.executed)
      setSizeHints((prev) => ({
        ...prev,
        [item.request_id]: { before, after },
      }))
      toast.success(`Accepted — team size ${before} → ${after}`)
      // Brief pause so the size bar can show, then animate the card out
      setTimeout(() => {
        setItems((prev) => prev.filter((r) => r.request_id !== item.request_id))
      }, 650)
    } catch (err) {
      logRollback(
        `CALL accept_join_request(${item.request_id})`,
        err.message || 'Accept failed',
        err.data?.executed,
      )
      toast.error(err.message || 'Accept failed')
    } finally {
      setBusyId(null)
    }
  }

  async function handleReject(item) {
    setBusyId(item.request_id)
    try {
      const res = await api.rejectJoinRequest(item.request_id)
      logCommit(`CALL reject_join_request(${item.request_id})`, res.executed)
      toast.success('Request rejected')
      setItems((prev) => prev.filter((r) => r.request_id !== item.request_id))
    } catch (err) {
      logRollback(
        `CALL reject_join_request(${item.request_id})`,
        err.message || 'Reject failed',
        err.data?.executed,
      )
      toast.error(err.message || 'Reject failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <TopBar title="Inbox" subtitle="Join requests you sent and received" />

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        {/* Tabs */}
        <div className="glass inline-flex gap-1 p-1">
          {[
            { id: 'received', label: 'Received', icon: InboxIcon },
            { id: 'sent', label: 'Sent', icon: Send },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={[
                'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition',
                tab === id
                  ? 'bg-accent-gradient text-white shadow-md shadow-indigo-500/30'
                  : 'text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/5',
              ].join(' ')}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <ul className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="glass space-y-2 p-4">
                <div className="skeleton h-5 w-2/3" />
                <div className="skeleton h-3 w-1/3" />
                <div className="skeleton h-12 w-full" />
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <div className="glass p-10 text-center text-slate-500">
            No {tab} requests yet.
          </div>
        ) : (
          <ul className="space-y-3">
            <AnimatePresence mode="popLayout">
              {tab === 'received'
                ? items.map((item) => (
                    <ReceivedCard
                      key={item.request_id}
                      item={item}
                      busy={busyId === item.request_id}
                      onAccept={handleAccept}
                      onReject={handleReject}
                      sizeHint={sizeHints[item.request_id]}
                    />
                  ))
                : items.map((item) => <SentCard key={item.request_id} item={item} />)}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </>
  )
}
