import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './primitives'
import { Icon } from './Icon'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface ModalProps {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Modal({ open, title, description, onClose, children, footer, size = 'md' }: ModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? panel)?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !panel) return
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (items.length === 0) return
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      if (event.shiftKey && document.activeElement === firstItem) { event.preventDefault(); lastItem.focus() }
      else if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); firstItem.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [open])

  if (!open) return null
  return createPortal(
    <div className="modal-root">
      <div className="modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div ref={panelRef} className={`modal-panel modal-${size}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="modal-header">
          <div>
            <h2 id={titleId} className="heading heading-2">{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <Button variant="ghost" className="icon-button" onClick={onClose} aria-label="Fermer"><Icon name="close" /></Button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({ open, title, message, confirmLabel, tone = 'primary', onConfirm, onCancel, loading }: {
  open: boolean; title: string; message: ReactNode; confirmLabel: string; tone?: 'primary' | 'danger'
  onConfirm: () => void; onCancel: () => void; loading?: boolean
}) {
  return (
    <Modal open={open} title={title} onClose={onCancel} size="sm"
      footer={<><Button variant="secondary" onClick={onCancel}>Annuler</Button><Button variant={tone} onClick={onConfirm} loading={loading}>{confirmLabel}</Button></>}>
      <p className="modal-message">{message}</p>
    </Modal>
  )
}
