import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

type ToastTone = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  tone: ToastTone
  title: string
  message?: string
}

interface ToastContextValue {
  notify: (tone: ToastTone, title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: number) => setToasts(list => list.filter(t => t.id !== id)), [])

  const notify = useCallback((tone: ToastTone, title: string, message?: string) => {
    const id = ++counter.current
    setToasts(list => [...list.slice(-3), { id, tone, title, message }])
    window.setTimeout(() => dismiss(id), tone === 'error' ? 8000 : 5000)
  }, [dismiss])

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" role="region" aria-label="Notifications">
        <div aria-live="polite" aria-atomic="false">
          {toasts.map(toast => (
            <div key={toast.id} className={`toast toast-${toast.tone}`} role={toast.tone === 'error' ? 'alert' : 'status'}>
              <span className="toast-icon"><Icon name={toast.tone === 'success' ? 'check' : toast.tone === 'error' ? 'alert' : 'bell'} className="h-4 w-4" /></span>
              <div><strong>{toast.title}</strong>{toast.message && <p>{toast.message}</p>}</div>
              <button type="button" className="toast-close" onClick={() => dismiss(toast.id)} aria-label="Fermer la notification"><Icon name="close" className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast doit être utilisé dans un ToastProvider.')
  return context.notify
}
