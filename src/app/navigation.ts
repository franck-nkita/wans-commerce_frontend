import type { IconName } from '@/components/ui'

export const pagePaths = {
  Dashboard: '/',
  Sales: '/ventes',
  Products: '/produits',
  Customers: '/clients',
  Inventory: '/inventaire',
  Warehouses: '/entrepots',
  Payments: '/paiements',
  Analytics: '/analyses',
  Reports: '/rapports',
  Intelligence: '/intelligence',
  Forecasts: '/previsions',
  Anomalies: '/anomalies',
  Recommendations: '/recommandations',
  Profitability: '/rentabilite',
  Assistant: '/assistant-ia',
  Settings: '/parametres',
} as const

export type NavItem = keyof typeof pagePaths

export const pageMeta: Record<NavItem, { title: string; subtitle: string }> = {
  Dashboard: { title: 'Vue générale', subtitle: 'Voici un aperçu de votre activité.' },
  Sales: { title: 'Ventes', subtitle: 'Suivez vos ventes et vos commandes.' },
  Products: { title: 'Produits', subtitle: 'Gérez votre catalogue et ses performances.' },
  Customers: { title: 'Clients', subtitle: 'Développez et fidélisez votre portefeuille.' },
  Inventory: { title: 'Stocks', subtitle: 'Pilotez vos niveaux de stock en temps réel.' },
  Warehouses: { title: 'Entrepôts', subtitle: 'Supervisez vos sites et vos flux logistiques.' },
  Payments: { title: 'Paiements', subtitle: 'Contrôlez les encaissements et rapprochements.' },
  Analytics: { title: 'Analyses', subtitle: 'Explorez les indicateurs de votre entreprise.' },
  Reports: { title: 'Rapports', subtitle: 'Générez et partagez vos rapports de gestion.' },
  Intelligence: { title: 'Intelligence', subtitle: 'Transformez vos données en décisions.' },
  Forecasts: { title: 'Prévisions', subtitle: 'Anticipez la demande et vos besoins.' },
  Anomalies: { title: 'Anomalies', subtitle: 'Examinez les variations inhabituelles.' },
  Recommendations: { title: 'Recommandations', subtitle: 'Agissez sur les meilleures opportunités.' },
  Profitability: { title: 'Rentabilité', subtitle: 'Comprenez ce qui crée réellement de la valeur.' },
  Assistant: { title: 'Assistant IA', subtitle: 'Analysez votre entreprise avec vos données.' },
  Settings: { title: 'Paramètres', subtitle: 'Configurez votre espace de travail.' },
}

export interface NavEntry { label: NavItem; title: string; icon: IconName }

export const businessNav: NavEntry[] = [
  { label: 'Dashboard', title: 'Vue générale', icon: 'home' },
  { label: 'Sales', title: 'Ventes & commandes', icon: 'sales' },
  { label: 'Products', title: 'Produits', icon: 'box' },
  { label: 'Customers', title: 'Clients', icon: 'users' },
  { label: 'Inventory', title: 'Stocks', icon: 'stock' },
  { label: 'Warehouses', title: 'Entrepôts', icon: 'warehouse' },
  { label: 'Payments', title: 'Paiements', icon: 'wallet' },
  { label: 'Reports', title: 'Rapports', icon: 'report' },
]

export const intelligenceNav: NavEntry[] = [
  { label: 'Intelligence', title: 'Intelligence', icon: 'sparkles' },
  { label: 'Forecasts', title: 'Prévisions', icon: 'forecast' },
  { label: 'Anomalies', title: 'Anomalies', icon: 'alert' },
  { label: 'Recommendations', title: 'Recommandations', icon: 'bulb' },
  { label: 'Profitability', title: 'Rentabilité', icon: 'wallet' },
  { label: 'Assistant', title: 'Assistant IA', icon: 'chat' },
]

export const workflowParents = {
  'export-report': 'Dashboard',
  'new-transaction': 'Dashboard',
  'add-product': 'Products',
  'new-order': 'Sales',
  'add-customer': 'Customers',
  reorder: 'Inventory',
  alerts: 'Inventory',
  'record-payment': 'Payments',
  'generate-report': 'Reports',
} as const satisfies Record<string, NavItem>

export type Workflow = keyof typeof workflowParents

export const isWorkflow = (value: string | undefined): value is Workflow =>
  value !== undefined && Object.prototype.hasOwnProperty.call(workflowParents, value)

const pathToPage = Object.fromEntries(Object.entries(pagePaths).map(([page, path]) => [path, page])) as Record<string, NavItem>

/** Rubrique active à partir de l'URL ; les parcours /flux/* activent leur rubrique parente. */
export function activePage(pathname: string): NavItem {
  if (pathname.startsWith('/flux/')) {
    const workflow = pathname.split('/')[2]
    return isWorkflow(workflow) ? workflowParents[workflow] : 'Dashboard'
  }
  return pathToPage[pathname.replace(/\/+$/, '') || '/'] ?? 'Dashboard'
}
