import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { pageMeta, pagePaths, type NavItem } from '@/app/navigation'
import { Breadcrumbs, Button, Heading, Icon } from '@/components/ui'

/** Libellés des rubriques parentes, avec l'article contracté correct (« au », « aux », « à l’ »). */
const backLabels: Partial<Record<NavItem, [string, string]>> = {
  Dashboard: ['Tableau de bord', 'Retour au tableau de bord'],
  Products: ['Produits', 'Retour aux produits'],
  Sales: ['Ventes', 'Retour aux ventes'],
  Customers: ['Clients', 'Retour aux clients'],
  Inventory: ['Inventaire', 'Retour à l’inventaire'],
  Payments: ['Paiements', 'Retour aux paiements'],
  Reports: ['Rapports', 'Retour aux rapports'],
}

export function WorkflowShell({ title, parent, description, children }: { title: string; parent: NavItem; description: string; children: ReactNode }) {
  const navigate = useNavigate()
  const [parentTitle, backLabel] = backLabels[parent] ?? [pageMeta[parent].title, `Retour : ${pageMeta[parent].title}`]
  return (
    <div className="page workflow-page">
      <Button variant="ghost" className="back-button" onClick={() => navigate(pagePaths[parent])}>
        <Icon name="back" className="h-4 w-4" />{backLabel}
      </Button>
      <Breadcrumbs items={[{ label: parentTitle, to: pagePaths[parent] }, { label: title }]} />
      <div className="page-intro workflow-intro">
        <div><Heading level={1}>{title}</Heading><p>{description}</p></div>
      </div>
      {children}
    </div>
  )
}

export function FormBanner({ message }: { message: string }) {
  if (!message) return null
  return <p className="form-banner form-banner-error" role="alert">{message}</p>
}
