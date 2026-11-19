import type { ReactNode } from 'react'
import { Button } from './primitives'
import { Icon, type IconName } from './Icon'

export function LoadingState({ label = 'Chargement des données…', rows = 4 }: { label?: string; rows?: number }) {
  return (
    <div className="state-loading" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton-row" aria-hidden="true" />)}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state-box state-error" role="alert">
      <span className="state-icon"><Icon name="alert" /></span>
      <strong>Impossible de charger les données</strong>
      <p>{message}</p>
      {onRetry && <Button variant="secondary" onClick={onRetry}><Icon name="refresh" className="h-4 w-4" />Réessayer</Button>}
    </div>
  )
}

export function EmptyState({ icon = 'search', title, message, action }: { icon?: IconName; title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="state-box">
      <span className="state-icon state-icon-neutral"><Icon name={icon} /></span>
      <strong>{title}</strong>
      {message && <p>{message}</p>}
      {action}
    </div>
  )
}

/**
 * Fonction présente dans l'interface mais sans source de données réelle en mode API
 * (prévisions par modèle, anomalies, assistant…) : on l'indique au lieu d'afficher des chiffres simulés.
 */
export function UnavailableState({ title = 'Non disponible avec vos données réelles', message }: { title?: string; message: string }) {
  return (
    <div className="state-box" role="status">
      <span className="state-icon state-icon-neutral"><Icon name="sparkles" /></span>
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  )
}
