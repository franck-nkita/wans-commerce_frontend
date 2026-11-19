import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  Badge, Button, Card, DataTable, EmptyState, ErrorState, Heading, Icon, LoadingState, Modal, PageIntro, SearchField, Select, StatCard, Toolbar, type Column, type Tone,
} from '@/components/ui'
import { useTooltipStyle } from '@/components/charts/ChartTooltip'
import { useAsync } from '@/hooks/useAsync'
import { useQueryParam } from '@/hooks/useQueryParam'
import { orderItemsCount, orderTotals } from '@/lib/domain'
import { formatChange, formatDate, formatFC, formatFCCompact, formatNumber, matchesQuery } from '@/lib/format'
import { analyticsService, ordersService, statsService } from '@/services'
import { isDemo } from '@/services/config'
import { useChartColors } from '@/theme/ThemeProvider'
import type { Order, OrderStatus } from '@/types/domain'

export const orderTone: Record<OrderStatus, Tone> = { Livrée: 'success', Expédiée: 'info', 'En traitement': 'warning', 'En attente': 'neutral', Brouillon: 'neutral', Annulée: 'danger' }

export default function Sales() {
  const navigate = useNavigate()
  const orders = useAsync(() => ordersService.list())
  const trend = useAsync(() => analyticsService.salesTrend())
  const stats = useAsync(() => statsService.sales())
  const colors = useChartColors()
  const tooltip = useTooltipStyle()
  const [query, setQuery] = useQueryParam('q')
  const [status, setStatus] = useQueryParam('statut')
  const [selectedId, setSelectedId] = useQueryParam('commande')

  const filtered = useMemo(() => (orders.data ?? []).filter(o =>
    matchesQuery(query, o.id, o.customerName, ...o.lines.map(l => l.name)) && (!status || o.status === status),
  ), [orders.data, query, status])
  const selected = orders.data?.find(o => o.id === selectedId)

  const columns: Column<Order>[] = [
    { key: 'id', header: 'N° de commande', render: o => <span className="mono accent-text">{o.id}</span> },
    { key: 'customer', header: 'Client', primary: true, render: o => <strong className="cell-strong">{o.customerName}</strong> },
    { key: 'items', header: 'Articles', align: 'right', render: o => <span className="mono">{orderItemsCount(o)}</span> },
    { key: 'total', header: 'Total', align: 'right', render: o => <strong className="mono">{formatFC(o.total)}</strong> },
    { key: 'status', header: 'Statut', render: o => <Badge tone={orderTone[o.status]}>{o.status}</Badge> },
    { key: 'date', header: 'Date', render: o => formatDate(o.date) },
    { key: 'actions', header: 'Actions', render: o => <Button variant="ghost" className="table-action" onClick={() => setSelectedId(o.id)} aria-label={`Voir la commande ${o.id}`}><Icon name="eye" className="h-4 w-4" />Détails</Button> },
  ]

  return (
    <div className="page">
      <PageIntro title="Ventes" description={stats.data ? `${formatNumber(stats.data.ordersThisQuarter)} commandes confirmées · trimestre en cours` : 'Suivi des ventes et des commandes'}>
        <Button onClick={() => navigate('/flux/new-order')}><Icon name="plus" className="h-4 w-4" />Nouvelle commande</Button>
      </PageIntro>

      <div className="stat-grid stat-grid-3">
        <StatCard label="Ventes du jour" value={stats.data ? formatFCCompact(stats.data.todayRevenue) : '…'} note={stats.data ? formatChange(stats.data.todayRevenueChangePct) : undefined} />
        <StatCard label="Commandes du jour" value={stats.data ? formatNumber(stats.data.todayOrders) : '…'} note={stats.data ? formatChange(stats.data.todayOrdersChangePct) : undefined} />
        <StatCard label="Panier moyen" value={stats.data ? formatFC(stats.data.averageBasket) : '…'} note={stats.data ? formatChange(stats.data.averageBasketChangePct) : undefined} />
      </div>

      <Card className="chart-card">
        <Heading level={2}>Évolution quotidienne des ventes (FC M)</Heading>
        <div className="small-chart">
          {trend.status === 'error' && <ErrorState message={trend.error} onRetry={trend.reload} />}
          {trend.data && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend.data} accessibilityLayer>
                <CartesianGrid stroke={colors.grid} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: colors.axis }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: colors.axis }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltip} formatter={value => [`FC ${String(value).replace('.', ',')} M`, 'Ventes']} />
                <Line type="monotone" dataKey="sales" stroke={colors.primary} strokeWidth={2.5} dot={{ fill: colors.primary, r: 4, strokeWidth: 0 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {isDemo && <div className="ai-strip">
        <div><span>ANALYSE DES VENTES</span><strong>La dynamique commerciale reste positive</strong><p>Le panier moyen progresse de 6,4 %. Textile est la catégorie la plus performante, avec 21 % de croissance cette semaine.</p></div>
        <div className="ai-strip-metrics"><span><b>+12,4 %</b>Évolution</span><span><b>FC 284 500</b>Panier moyen</span><span><b>Onduleur 5 KVA</b>Produit populaire</span></div>
      </div>}

      <Card className="table-card">
        <div className="card-header"><div><Heading level={2}>Commandes récentes</Heading><p>Toutes les commandes enregistrées, y compris les brouillons.</p></div></div>
        <Toolbar>
          <SearchField value={query} onChange={setQuery} placeholder="N° de commande, client, produit…" label="Rechercher une commande" />
          <Select value={status} onChange={e => setStatus(e.target.value)} aria-label="Filtrer par statut">
            <option value="">Tous les statuts</option>
            {(Object.keys(orderTone) as OrderStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Toolbar>
        {orders.status === 'error' && <ErrorState message={orders.error} onRetry={orders.reload} />}
        {orders.status === 'loading' && !orders.data && <LoadingState />}
        {orders.data && (
          <DataTable caption="Commandes récentes" columns={columns} rows={filtered} getRowKey={o => o.id}
            empty={<EmptyState title="Aucune commande trouvée" message="Modifiez la recherche ou le filtre de statut." />} />
        )}
      </Card>

      <Modal open={Boolean(selected)} title={selected ? `Commande ${selected.id}` : ''} description={selected?.customerName} onClose={() => setSelectedId('')} size="lg">
        {selected && <OrderDetail order={selected} />}
      </Modal>
    </div>
  )
}

function OrderDetail({ order }: { order: Order }) {
  const totals = orderTotals(order.lines, order.discountPct)
  return (
    <>
      <dl className="detail-grid">
        <div><dt>Statut</dt><dd><Badge tone={orderTone[order.status]}>{order.status}</Badge></dd></div>
        <div><dt>Date</dt><dd>{formatDate(order.date)}</dd></div>
        <div><dt>Mode de paiement</dt><dd>{order.paymentMethod}</dd></div>
        <div><dt>Remise</dt><dd>{order.discountPct} %</dd></div>
      </dl>
      <div className="responsive-table detail-table">
        <table className="data-table">
          <caption className="sr-only">Lignes de la commande</caption>
          <thead><tr><th scope="col">Produit</th><th scope="col" className="text-right">Quantité</th><th scope="col" className="text-right">Prix unitaire</th><th scope="col" className="text-right">Montant</th></tr></thead>
          <tbody>
            {order.lines.map(line => (
              <tr key={line.sku + line.name}>
                <td data-label="Produit" className="cell-primary">{line.name}</td>
                <td data-label="Quantité" className="text-right">{line.quantity}</td>
                <td data-label="Prix unitaire" className="text-right">{formatFC(line.unitPrice)}</td>
                <td data-label="Montant" className="text-right">{formatFC(line.quantity * line.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="totals">
        <div><dt>Sous-total</dt><dd>{formatFC(totals.subtotal)}</dd></div>
        {totals.discount > 0 && <div><dt>Remise</dt><dd>− {formatFC(totals.discount)}</dd></div>}
        <div className="totals-grand"><dt>Total</dt><dd>{formatFC(order.total)}</dd></div>
      </dl>
      {order.notes && <p className="detail-notes"><strong>Notes :</strong> {order.notes}</p>}
    </>
  )
}
