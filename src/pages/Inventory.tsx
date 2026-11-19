import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import {
  Badge, Button, Card, DataTable, EmptyState, ErrorState, Icon, LoadingState, PageIntro, SearchField, Select, StatCard, Toolbar, type Column, type Tone,
} from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { useQueryParam } from '@/hooks/useQueryParam'
import type { StockLevel } from '@/lib/domain'
import { formatFCCompact, formatNumber, matchesQuery } from '@/lib/format'
import { inventoryService, statsService, warehousesService, type InventoryItem } from '@/services'
import { isDemo } from '@/services/config'

const levelTone: Record<StockLevel, Tone> = { Optimal: 'success', Faible: 'warning', Critique: 'danger' }

export default function Inventory() {
  const navigate = useNavigate()
  const items = useAsync(() => inventoryService.list())
  const alerts = useAsync(() => inventoryService.alerts())
  const warehouses = useAsync(() => warehousesService.list())
  const stats = useAsync(() => statsService.inventory())
  const [query, setQuery] = useQueryParam('q')
  const [warehouse, setWarehouse] = useQueryParam('entrepot')
  const [level, setLevel] = useQueryParam('niveau')

  const filtered = useMemo(() => (items.data ?? []).filter(i =>
    matchesQuery(query, i.name, i.sku, i.warehouseName) && (!warehouse || i.warehouseId === warehouse) && (!level || i.level === level),
  ), [items.data, query, warehouse, level])
  const alertCount = alerts.data?.length ?? 0

  const columns: Column<InventoryItem>[] = [
    { key: 'sku', header: 'SKU', render: i => <span className="mono accent-text">{i.sku}</span> },
    { key: 'name', header: 'Produit', primary: true, render: i => <strong className="cell-strong">{i.name}</strong> },
    { key: 'warehouse', header: 'Entrepôt', render: i => i.warehouseName },
    {
      key: 'quantity', header: 'Stock actuel', render: i => {
        const pct = Math.min((i.quantity / Math.max(i.minStock * 5, 1)) * 100, 100)
        return (
          <div className="stock-cell">
            <span className="mono">{formatNumber(i.quantity)}</span>
            <span className="stock-bar" role="img" aria-label={`${Math.round(pct)} % du niveau cible`}><b className={`stock-bar-${i.level}`} style={{ width: `${pct}%` }} /></span>
            {i.plannedRestock > 0 && <small className="stock-planned">+{formatNumber(i.plannedRestock)} prévus</small>}
          </div>
        )
      },
    },
    { key: 'predicted', header: isDemo ? 'Demande prévue' : 'Ventes 30 j', align: 'right', render: i => <span className="mono">{formatNumber(i.predicted)}</span> },
    { key: 'level', header: 'Niveau', render: i => <Badge tone={levelTone[i.level]}>{i.level}</Badge> },
    {
      key: 'action', header: 'Action', render: i => i.level === 'Optimal'
        ? <Button variant="secondary" className="table-action" onClick={() => navigate(`/previsions?q=${encodeURIComponent(i.name)}`)}>Analyser</Button>
        : <Button variant="secondary" className="table-action" onClick={() => navigate(`/flux/reorder?sku=${i.sku}`)}>Commander</Button>,
    },
  ]

  return (
    <div className="page">
      <PageIntro title="Inventaire" description="Gérez les niveaux de stock dans tous les entrepôts">
        <Button variant="secondary" className="alert-button" onClick={() => navigate('/flux/alerts')} disabled={alerts.status === 'loading' && !alerts.data}>
          <Icon name="alert" className="h-4 w-4" />{alertCount} alerte{alertCount > 1 ? 's' : ''} critique{alertCount > 1 ? 's' : ''}
        </Button>
        <Button onClick={() => navigate('/flux/reorder')}>Réapprovisionner les articles</Button>
      </PageIntro>

      <div className="stat-grid stat-grid-4">
        <StatCard label="Total des références" value={stats.data ? formatNumber(stats.data.references) : '…'} />
        <StatCard label="Valeur du stock" value={stats.data ? formatFCCompact(stats.data.stockValue) : '…'} note={isDemo ? undefined : 'Au coût d’achat'} tone="neutral" />
        <StatCard label="Articles en stock faible" value={stats.data ? formatNumber(stats.data.lowStock) : '…'} note="À surveiller" tone="warning" />
        <StatCard label="Ruptures de stock" value={stats.data ? formatNumber(stats.data.outOfStock) : '…'} note="Action requise" tone="danger" />
      </div>

      <div className="ai-strip">
        <div><span>ANALYSE INTELLIGENTE DU STOCK</span><strong>{alertCount} référence{alertCount > 1 ? 's demandent' : ' demande'} une action rapide</strong><p>{isDemo ? 'La demande prévue sur 30 jours dépasse le stock disponible pour les onduleurs, les nouilles et le tissu Ankara.' : 'Ces références sont sous leur stock minimum. La demande affichée correspond aux ventes réelles des 30 derniers jours.'}</p></div>
        <Button variant="secondary" onClick={() => navigate('/flux/alerts')}>Examiner les recommandations</Button>
      </div>

      <Card className="table-card">
        <Toolbar>
          <SearchField value={query} onChange={setQuery} placeholder="Produit, SKU…" label="Rechercher dans l’inventaire" />
          <Select value={warehouse} onChange={e => setWarehouse(e.target.value)} aria-label="Filtrer par entrepôt">
            <option value="">Tous les entrepôts</option>
            {(warehouses.data ?? []).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </Select>
          <Select value={level} onChange={e => setLevel(e.target.value)} aria-label="Filtrer par niveau de stock">
            <option value="">Tous les niveaux</option>
            {(Object.keys(levelTone) as StockLevel[]).map(l => <option key={l} value={l}>{l}</option>)}
          </Select>
        </Toolbar>
        {items.status === 'error' && <ErrorState message={items.error} onRetry={items.reload} />}
        {items.status === 'loading' && !items.data && <LoadingState />}
        {items.data && (
          <DataTable caption="Niveaux de stock" columns={columns} rows={filtered} getRowKey={i => i.sku}
            empty={<EmptyState icon="stock" title="Aucun article trouvé" message="Modifiez la recherche ou les filtres." />} />
        )}
      </Card>
    </div>
  )
}
