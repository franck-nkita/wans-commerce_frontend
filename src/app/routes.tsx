import type { ComponentType } from 'react'
import { Navigate, useParams, type RouteObject } from 'react-router'
import AppShell from '@/layout/AppShell'
import { LoadingState } from '@/components/ui'
import { RouteError } from './RouteError'
import { isWorkflow, type Workflow } from './navigation'

/** Chargement différé : chaque page (et Recharts) n'est téléchargée qu'à la première visite. */
const page = (loader: () => Promise<{ default: ComponentType }>) => async () => ({ Component: (await loader()).default })

const workflowLoaders: Record<Workflow, () => Promise<{ default: ComponentType }>> = {
  'export-report': () => import('@/pages/workflows/ReportForm').then(m => ({ default: () => <m.default mode="export" /> })),
  'generate-report': () => import('@/pages/workflows/ReportForm').then(m => ({ default: () => <m.default mode="generate" /> })),
  'new-transaction': () => import('@/pages/workflows/OrderForm').then(m => ({ default: () => <m.default variant="transaction" /> })),
  'new-order': () => import('@/pages/workflows/OrderForm').then(m => ({ default: () => <m.default variant="order" /> })),
  'add-product': () => import('@/pages/workflows/ProductForm'),
  'add-customer': () => import('@/pages/workflows/CustomerForm'),
  reorder: () => import('@/pages/workflows/RestockForm'),
  'record-payment': () => import('@/pages/workflows/PaymentForm'),
  alerts: () => import('@/pages/workflows/CriticalAlerts'),
}

function UnknownWorkflow() {
  const { workflow } = useParams()
  return isWorkflow(workflow) ? null : <Navigate to="/" replace />
}

export const routes: RouteObject[] = [
  { path: '/connexion', lazy: page(() => import('@/pages/LoginPage')), errorElement: <RouteError />, HydrateFallback: () => <LoadingState /> },
  {
    path: '/',
    Component: AppShell,
    errorElement: <RouteError />,
    HydrateFallback: () => <LoadingState />,
    children: [
      { index: true, lazy: page(() => import('@/pages/Dashboard')) },
      { path: 'produits', lazy: page(() => import('@/pages/Products')) },
      { path: 'ventes', lazy: page(() => import('@/pages/Sales')) },
      { path: 'clients', lazy: page(() => import('@/pages/Customers')) },
      { path: 'inventaire', lazy: page(() => import('@/pages/Inventory')) },
      { path: 'entrepots', lazy: page(() => import('@/pages/Warehouses')) },
      { path: 'paiements', lazy: page(() => import('@/pages/Payments')) },
      { path: 'analyses', lazy: page(() => import('@/pages/Analytics')) },
      { path: 'rapports', lazy: page(() => import('@/pages/Reports')) },
      { path: 'intelligence', lazy: page(() => import('@/pages/intelligence/IntelligencePage')) },
      { path: 'previsions', lazy: page(() => import('@/pages/intelligence/ForecastsPage')) },
      { path: 'anomalies', lazy: page(() => import('@/pages/intelligence/AnomaliesPage')) },
      { path: 'recommandations', lazy: page(() => import('@/pages/intelligence/RecommendationsPage')) },
      { path: 'rentabilite', lazy: page(() => import('@/pages/intelligence/ProfitabilityPage')) },
      { path: 'assistant-ia', lazy: page(() => import('@/pages/intelligence/AssistantPage')) },
      { path: 'parametres', lazy: page(() => import('@/pages/Settings')) },
      ...(Object.keys(workflowLoaders) as Workflow[]).map(workflow => ({ path: `flux/${workflow}`, lazy: page(workflowLoaders[workflow]) })),
      { path: 'flux/:workflow', Component: UnknownWorkflow },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]
