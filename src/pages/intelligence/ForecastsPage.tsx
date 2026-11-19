import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  Badge, Button, Card, DataTable, EmptyState, ErrorState, Heading, Icon, LoadingState, PageIntro, SearchField, Select, Toolbar, UnavailableState,
  type Column, type Tone,
} from '@/components/ui'
import { useLegendProps, useTooltipStyle } from '@/components/charts/ChartTooltip'
import { useAsync } from '@/hooks/useAsync'
import { useQueryParam } from '@/hooks/useQueryParam'
import { formatNumber, matchesQuery } from '@/lib/format'
import { analyticsService, inventoryService, productsService, warehousesService } from '@/services'
import { isDemo } from '@/services/config'
import { useChartColors } from '@/theme/ThemeProvider'
import { MiniKpis } from './shared'

type Risk = 'Critique' | 'Élevé' | 'Faible'
const riskTone: Record<Risk, Tone> = { Critique: 'danger', Élevé: 'warning', Faible: 'success' }

interface ForecastRow { sku: string; name: string; category: string; warehouseId: string; stock: number; predicted: number; coverage: number; risk: Risk }

export default function ForecastsPage() {
  const navigate = useNavigate()
  const trend = useAsync(() => isDemo ? analyticsService.forecast() : Promise.resolve(null))
  const inventory = useAsync(() => inventoryService.list())
  const products = useAsync(() => productsService.list())
  const warehouses = useAsync(() => warehousesService.list())
  const colors = useChartColors()
  const tooltip = useTooltipStyle()
  const legend = useLegendProps()
  const [query, setQuery] = useQueryParam('q')
  const [category, setCategory] = useQueryParam('categorie')
  const [warehouse, setWarehouse] = useQueryParam('entrepot')
  const [risk, setRisk] = useQueryParam('risque')

  const rows = useMemo<ForecastRow[]>(() => (inventory.data ?? []).map(item => {
    const product = products.data?.find(p => p.sku === item.sku)
    const coverage = item.predicted > 0 ? Math.floor(item.quantity / (item.predicted / 30)) : 99
    const r: Risk = item.quantity < item.minStock / 2 || coverage < 10 ? 'Critique' : coverage < 21 || item.quantity < item.minStock ? 'Élevé' : 'Faible'
    return { sku: item.sku, name: item.name, category: product?.category ?? '', warehouseId: item.warehouseId, stock: item.quantity, predicted: item.predicted, coverage, risk: r }
  }).sort((a, b) => a.coverage - b.coverage), [inventory.data, products.data])

  const filtered = rows.filter(r => matchesQuery(query, r.name, r.sku) && (!category || r.category === category) && (!warehouse || r.warehouseId === warehouse) && (!risk || r.risk === risk))
  const categories = [...new Set(rows.map(r => r.category).filter(Boolean))].sort()
  const atRisk = rows.filter(r => r.risk !== 'Faible').length

  const columns: Column<ForecastRow>[] = [
    { key: 'name', header: 'Produit', primary: true, render: r => <strong className="cell-strong">{r.name}</strong> },
    { key: 'stock', header: 'Stock', align: 'right', render: r => <span className="mono">{formatNumber(r.stock)}</span> },
    { key: 'predicted', header: isDemo ? 'Prévision 30 j' : 'Ventes 30 j', align: 'right', render: r => <span className="mono">{formatNumber(r.predicted)}</span> },
    { key: 'risk', header: 'Risque', render: r => <Badge tone={riskTone[r.risk]}>{r.risk}</Badge> },
    { key: 'coverage', header: 'Couverture', render: r => r.stock === 0 ? 'Rupture' : `${r.coverage} jours` },
    {
      key: 'action', header: 'Action', render: r => r.risk !== 'Faible'
        ? <Button className="table-action" onClick={() => navigate(`/flux/reorder?sku=${r.sku}`)}>Réapprovisionner</Button>
        : <Button variant="ghost" className="table-action" onClick={() => navigate(`/produits?sku=${r.sku}`)}>Voir</Button>,
    },
  ]

  return (
    <div className="page">
      <PageIntro title="Prévisions des ventes" description="Anticipez la demande à partir de l’historique de votre activité.">
        <Button onClick={() => { trend.reload(); inventory.reload() }} loading={trend.status === 'loading'}><Icon name="sparkles" className="h-4 w-4" />Actualiser les prévisions</Button>
      </PageIntro>

      <MiniKpis items={isDemo ? [
        { label: 'Prévision octobre', value: '1 284 ventes', note: '+14,2 %' },
        { label: 'Chiffre d’affaires prévu', value: 'FC 74,8 M', note: '+9,4 %' },
        { label: 'Confiance du modèle', value: '87 %', note: 'Fiabilité élevée', tone: 'info' },
        { label: 'Produits à risque', value: String(atRisk), note: atRisk ? 'Action requise' : 'Aucun', tone: atRisk ? 'warning' : 'success' },
      ] : [
        { label: 'Références suivies', value: formatNumber(rows.length), note: 'Catalogue complet', tone: 'info' },
        { label: 'Unités vendues sur 30 jours', value: formatNumber(rows.reduce((sum, r) => sum + r.predicted, 0)), note: 'Ventes confirmées', tone: 'info' },
        { label: 'Méthode', value: 'Projection naïve', note: '30 j = 30 derniers jours', tone: 'neutral' },
        { label: 'Produits à risque', value: String(atRisk), note: atRisk ? 'Action requise' : 'Aucun', tone: atRisk ? 'warning' : 'success' },
      ]} />

      <Card className="chart-card">
        <div className="card-header"><div><Heading level={2}>Ventes réelles vs prévisions</Heading><p>Données historiques et projection sur les trois prochains mois.</p></div>{isDemo && <Badge tone="info">Confiance 87 %</Badge>}</div>
        {!isDemo && <UnavailableState message="Aucun modèle statistique de prévision n’est encore branché. Le tableau ci-dessous compare le stock aux ventes réelles des 30 derniers jours." />}
        {isDemo && <div className="large-chart">
          {trend.status === 'error' && <ErrorState message={trend.error} onRetry={trend.reload} />}
          {!trend.data && trend.status === 'loading' && <LoadingState rows={4} />}
          {trend.data && (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trend.data} accessibilityLayer>
                <CartesianGrid stroke={colors.grid} vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: colors.axis }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: colors.axis }} />
                <Tooltip {...tooltip} />
                <Legend {...legend} />
                <Area dataKey={(d: { low: number | null; high: number | null }) => (d.low !== null && d.high !== null ? [d.low, d.high] : null)} stroke="none" fill={colors.area} fillOpacity={0.7} name="Zone de confiance" isAnimationActive={false} legendType="square" />
                <Line type="monotone" dataKey="actual" stroke={colors.primary} strokeWidth={3} name="Ventes réelles" dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="forecast" stroke={colors.secondary} strokeWidth={3} strokeDasharray="6 5" name="Prévisions" dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>}
      </Card>

      <Card className="table-card">
        <div className="card-header"><div><Heading level={2}>Prévisions par produit</Heading><p>Produits nécessitant une adaptation du stock.</p></div></div>
        <Toolbar>
          <SearchField value={query} onChange={setQuery} placeholder="Produit, SKU…" label="Rechercher un produit" />
          <Select value={category} onChange={e => setCategory(e.target.value)} aria-label="Catégorie">
            <option value="">Catégorie : toutes</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select value={warehouse} onChange={e => setWarehouse(e.target.value)} aria-label="Entrepôt">
            <option value="">Entrepôt : tous</option>
            {(warehouses.data ?? []).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </Select>
          <Select value={risk} onChange={e => setRisk(e.target.value)} aria-label="Niveau de risque">
            <option value="">Risque : tous</option>
            {(Object.keys(riskTone) as Risk[]).map(r => <option key={r} value={r}>{r}</option>)}
          </Select>
        </Toolbar>
        {inventory.status === 'error' && <ErrorState message={inventory.error} onRetry={inventory.reload} />}
        {!inventory.data && inventory.status === 'loading' && <LoadingState />}
        {inventory.data && <DataTable caption="Prévisions par produit" columns={columns} rows={filtered} getRowKey={r => r.sku} empty={<EmptyState icon="forecast" title="Aucun produit ne correspond aux filtres" />} />}
      </Card>
    </div>
  )
}
