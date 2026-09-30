import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api'
import { useHood } from '../context/HoodContext'

/** Modal: message box → POST /api/join-requests (keyboard accessible) */
export default function JoinModal({ open, project, onClose, onSuccess }) {
  const { logCommit, logRollback } = useHood()
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const titleId = useId()
  const panelRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const t = setTimeout(() => textareaRef.current?.focus(), 40)
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!project) return
    setSubmitting(true)
    try {
      const res = await api.createJoinRequest({
        project_id: project.project_id,
        message: message.trim() || 'I would like to join this project.',
      })
      logCommit(`POST /join-requests (project ${project.project_id})`, res.executed)
      toast.success('Join request sent!')
      setMessage('')
      onSuccess?.()
    } catch (err) {
      logRollback(
        `POST /join-requests (project ${project.project_id})`,
        err.message || 'Could not send request',
        err.data?.executed,
      )
      toast.error(err.message || 'Could not send request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && project ? (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm"
            aria-label="Close modal"
            onClick={onClose}
          />
          <motion.form
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onSubmit={handleSubmit}
            className="glass-strong relative z-10 w-full max-w-md p-5 shadow-2xl"
            initial={{ scale: 0.94, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0 }}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 id={titleId} className="font-display text-lg font-bold">
                  Request to join
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {project.project_title}
                </p>
              </div>
              <button type="button" className="btn-ghost !p-2" onClick={onClose} aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <label
              htmlFor="join-message"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Message
            </label>
            <textarea
              id="join-message"
              ref={textareaRef}
              className="mb-4 min-h-[110px] w-full resize-y rounded-xl border border-slate-200/80 bg-white/70
                p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400
                dark:border-white/10 dark:bg-white/5"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell the creator why you'd be a great teammate…"
            />

            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send request'}
              </button>
            </div>
          </motion.form>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
