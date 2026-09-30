import { useEffect, useId, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

/**
 * Accessible slide-over shell: focus trap-lite, Escape to close, labelled.
 */
export default function DrawerShell({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide = false,
}) {
  const titleId = useId()
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const prev = document.activeElement
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    // Focus the panel for keyboard users
    const t = setTimeout(() => panelRef.current?.focus(), 50)
    return () => {
      document.removeEventListener('keydown', onKey)
      clearTimeout(t)
      if (prev && prev.focus) prev.focus()
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close overlay"
            className="fixed inset-0 z-40 bg-ink-950/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={`glass-strong fixed inset-y-0 right-0 z-50 flex w-full flex-col shadow-2xl outline-none
              ${wide ? 'max-w-lg' : 'max-w-md'}`}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/20 px-5 py-4 dark:border-white/10">
              <div className="min-w-0">
                {subtitle ? (
                  <p className="text-xs font-medium uppercase tracking-wider text-indigo-500">
                    {subtitle}
                  </p>
                ) : null}
                <h2 id={titleId} className="font-display text-xl font-bold leading-snug">
                  {title}
                </h2>
              </div>
              <button type="button" className="btn-ghost !p-2" onClick={onClose} aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="drawer-scroll flex-1 overflow-y-auto px-5 py-5">{children}</div>
            {footer ? (
              <div className="border-t border-white/20 p-4 dark:border-white/10">{footer}</div>
            ) : null}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}
