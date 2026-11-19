import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Menu déroulant léger : fermeture au clic extérieur, à la touche Échap et
 * restitution du focus sur le déclencheur.
 */
export function Popover({ trigger, children, align = 'right', className = '' }: {
  trigger: (props: { open: boolean; toggle: () => void; 'aria-expanded': boolean; 'aria-haspopup': 'true' }) => ReactNode
  children: (close: () => void) => ReactNode
  align?: 'left' | 'right'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        rootRef.current?.querySelector<HTMLElement>('[aria-haspopup]')?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const close = () => setOpen(false)
  return (
    <div ref={rootRef} className={`popover ${className}`}>
      {trigger({ open, toggle: () => setOpen(o => !o), 'aria-expanded': open, 'aria-haspopup': 'true' })}
      {open && <div className={`popover-panel popover-${align}`}>{children(close)}</div>}
    </div>
  )
}
