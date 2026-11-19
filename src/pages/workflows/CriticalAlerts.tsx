import { useNavigate } from 'react-router'
import { Badge, Button, Card, DataTable, EmptyState, ErrorState, LoadingState, type Column } from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { formatNumber } from '@/lib/format'
import { inventoryService, warehousesService } from '@/services'
import type { StockAlert } from '@/types/domain'
import { WorkflowShell } from './WorkflowShell'

export default function CriticalAlerts() {
  const navigate = useNavigate()
  const alerts = useAsync(() => inventoryService.alerts())
  const warehouses = useAsync(() => warehousesService.list())
  const warehouseName = (id: string) => warehouses.data?.find(w => w.id === id)?.name ?? id

  const columns: Column<StockAlert>[] = [
    { key: 'product', header: 'Produit', primary: true, render: a => <strong className="cell-strong">{a.product}</strong> },
    { key: 'level', header: 'Alerte', render: a => <Badge tone={a.level === 'Rupture imminente' ? 'danger' : 'warning'}>{a.level}</Badge> },
    { key: 'warehouse', header: 'Entrepôt', render: a => warehouseName(a.warehouseId) },
    { key: 'current', header: 'Stock actuel', align: 'right', render: a => <span className="mono">{formatNumber(a.current)}</span> },
    { key: 'minimum', header: 'Seuil minimum', align: 'right', render: a => <span className="mono">{formatNumber(a.minimum)}</span> },
    { key: 'action', header: 'Action recommandée', render: a => a.action },
    {
      key: 'actions', header: 'Actions', render: a => (
        <div className="cell-actions">
          <Button className="table-action" onClick={() => navigate(`/flux/reorder?sku=${a.sku}`)}>Réapprovisionner</Button>
          <Button variant="secondary" className="table-action" onClick={() => navigate(`/produits?sku=${a.sku}`)}>Voir le produit</Button>
        </div>
      ),
    },
  ]

  return (
    <WorkflowShell title="Alertes critiques" parent="Inventory" description="Produits nécessitant une action immédiate pour éviter une rupture.">
      <Card className="table-card">
        {alerts.status === 'error' && <ErrorState message={alerts.error} onRetry={alerts.reload} />}
        {!alerts.data && alerts.status === 'loading' && <LoadingState />}
        {alerts.data && (
          <DataTable caption="Alertes de stock critiques" columns={columns} rows={alerts.data} getRowKey={a => a.sku}
            empty={<EmptyState icon="check" title="Aucune alerte critique" message="Tous les produits sont au-dessus de leur stock minimum." />} />
        )}
      </Card>
    </WorkflowShell>
  )
}
