import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Badge, Card, Heading, TextInput } from './primitives'
import { Icon } from './Icon'

/** En-tête de page conforme au gabarit Figma : titre, description et actions à droite. */
export function PageIntro({ title, description, children }: { title: string; description: ReactNode; children?: ReactNode }) {
  return (
    <div className="page-intro">
      <div><Heading level={1}>{title}</Heading><p>{description}</p></div>
      {children && <div className="page-actions">{children}</div>}
    </div>
  )
}

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Fil d’Ariane" className="breadcrumbs">
      <ol>
        {items.map((item, index) => (
          <li key={item.label}>
            {item.to ? <Link to={item.to}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
            {index < items.length - 1 && <Icon name="chevron" className="h-3 w-3" />}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function StatCard({ label, value, note, tone = 'success' }: { label: string; value: string; note?: string; tone?: 'success' | 'warning' | 'danger' | 'neutral' | 'info' }) {
  return (
    <Card className="mini-kpi">
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <Badge tone={tone}>{note}</Badge>}
    </Card>
  )
}

export function SearchField({ value, onChange, placeholder, label }: { value: string; onChange: (value: string) => void; placeholder: string; label: string }) {
  return (
    <label className="search-field">
      <Icon name="search" className="h-4 w-4" />
      <span className="sr-only">{label}</span>
      <TextInput type="search" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  )
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="toolbar">{children}</div>
}
