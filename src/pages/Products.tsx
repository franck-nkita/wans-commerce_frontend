import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import {
  Badge, Button, Card, DataTable, EmptyState, ErrorState, Icon, LoadingState, Modal, PageIntro, SearchField, Select, Toolbar, type Column, type Tone,
} from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { useQueryParam } from '@/hooks/useQueryParam'
import { productStatus } from '@/lib/domain'
import { formatFC, formatNumber, matchesQuery } from '@/lib/format'
import { productsService, warehousesService } from '@/services'
import type { DemandTrend, Product, ProductStatus } from '@/types/domain'

export const statusTone: Record<ProductStatus, Tone> = { Actif: 'success', 'Stock faible': 'warning', 'Rupture de stock': 'danger' }
const performanceClass: Record<DemandTrend, string> = { 'Forte demande': 'hot', 'En croissance': 'up', 'En baisse': 'down', Stable: 'stable' }

export default function Products() {
  const navigate = useNavigate()
  const products = useAsync(() => productsService.list())
  const warehouses = useAsync(() => warehousesService.list())
  const [query, setQuery] = useQueryParam('q')
  const [category, setCategory] = useQueryParam('categorie')
  const [status, setStatus] = useQueryParam('statut')
  const [selectedSku, setSelectedSku] = useQueryParam('sku')

  const categories = useMemo(() => [...new Set((products.data ?? []).map(p => p.category))].sort(), [products.data])
  const filtered = useMemo(() => (products.data ?? []).filter(p =>
    matchesQuery(query, p.name, p.sku, p.category, p.supplier, p.brand)
    && (!category || p.category === category)
    && (!status || productStatus(p) === status),
  ), [products.data, query, category, status])
  const selected = products.data?.find(p => p.sku === selectedSku)
  const warehouseName = (id: string) => warehouses.data?.find(w => w.id === id)?.name ?? id

  const columns: Column<Product>[] = [
    { key: 'sku', header: 'SKU', render: p => <span className="mono accent-text">{p.sku}</span> },
    { key: 'name', header: 'Nom du produit', primary: true, render: p => <strong className="cell-strong">{p.name}</strong> },
    { key: 'category', header: 'Catégorie', render: p => p.category },
    { key: 'price', header: 'Prix (FC)', align: 'right', render: p => <span className="mono">{formatFC(p.price)}</span> },
    { key: 'stock', header: 'Stock', align: 'right', render: p => <span className="mono">{formatNumber(p.stock)}</span> },
    { key: 'performance', header: 'Performance IA', render: p => <span className={`ai-performance ai-performance-${performanceClass[p.performance]}`}>{p.performance}</span> },
    { key: 'status', header: 'Statut', render: p => <Badge tone={statusTone[productStatus(p)]}>{productStatus(p)}</Badge> },
    { key: 'supplier', header: 'Fournisseur', render: p => p.supplier },
    { key: 'actions', header: 'Actions', render: p => <Button variant="ghost" className="table-action" onClick={() => setSelectedSku(p.sku)} aria-label={`Voir le produit ${p.name}`}><Icon name="eye" className="h-4 w-4" />Détails</Button> },
  ]

  return (
    <div className="page">
      <PageIntro title="Produits" description={products.data ? `${products.data.length} références actives dans ${categories.length} catégories` : 'Catalogue des produits'}>
        <Button onClick={() => navigate('/flux/add-product')}><Icon name="plus" className="h-4 w-4" />Ajouter un produit</Button>
      </PageIntro>

      <Card className="table-card">
        <Toolbar>
          <SearchField value={query} onChange={setQuery} placeholder="Nom, SKU, fournisseur…" label="Rechercher un produit" />
          <Select value={category} onChange={e => setCategory(e.target.value)} aria-label="Filtrer par catégorie">
            <option value="">Toutes les catégories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select value={status} onChange={e => setStatus(e.target.value)} aria-label="Filtrer par statut">
            <option value="">Tous les statuts</option>
            {(Object.keys(statusTone) as ProductStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Toolbar>
        {products.status === 'error' && <ErrorState message={products.error} onRetry={products.reload} />}
        {products.status === 'loading' && !products.data && <LoadingState />}
        {products.data && (
          <DataTable caption="Catalogue des produits" columns={columns} rows={filtered} getRowKey={p => p.sku}
            empty={<EmptyState title="Aucun produit trouvé" message="Modifiez la recherche ou les filtres." action={(query || category || status) ? <Button variant="secondary" onClick={() => { setQuery(''); setCategory(''); setStatus('') }}>Réinitialiser les filtres</Button> : undefined} />} />
        )}
      </Card>

      <Modal open={Boolean(selected)} title={selected?.name ?? ''} description={selected ? `${selected.sku} · ${selected.category}` : undefined} onClose={() => setSelectedSku('')}
        footer={selected && productStatus(selected) !== 'Actif'
          ? <Button onClick={() => navigate(`/flux/reorder?sku=${selected.sku}`)}><Icon name="stock" className="h-4 w-4" />Réapprovisionner</Button>
          : undefined}>
        {selected && (
          <dl className="detail-grid">
            <div><dt>Statut</dt><dd><Badge tone={statusTone[productStatus(selected)]}>{productStatus(selected)}</Badge></dd></div>
            <div><dt>Marque</dt><dd>{selected.brand || '—'}</dd></div>
            <div><dt>Prix d’achat</dt><dd>{formatFC(selected.purchasePrice)}</dd></div>
            <div><dt>Prix de vente</dt><dd>{formatFC(selected.price)}</dd></div>
            <div><dt>Marge unitaire</dt><dd>{formatFC(selected.price - selected.purchasePrice)}</dd></div>
            <div><dt>Stock / minimum</dt><dd>{formatNumber(selected.stock)} / {formatNumber(selected.minStock)}</dd></div>
            <div><dt>Entrepôt</dt><dd>{warehouseName(selected.warehouseId)}</dd></div>
            <div><dt>Fournisseur</dt><dd>{selected.supplier}</dd></div>
            <div className="detail-wide"><dt>Description</dt><dd>{selected.description || '—'}</dd></div>
          </dl>
        )}
      </Modal>
    </div>
  )
}
