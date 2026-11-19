import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import {
  Badge, Button, Card, DataTable, EmptyState, ErrorState, Icon, LoadingState, PageIntro, SearchField, Select, StatCard, Toolbar, type Column, type Tone,
} from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { useQueryParam } from '@/hooks/useQueryParam'
import { formatDateTime, formatFC, formatFCCompact, formatNumber, matchesQuery } from '@/lib/format'
import { paymentsService, statsService } from '@/services'
import { paymentMethods, type Payment, type PaymentStatus } from '@/types/domain'

const paymentTone: Record<PaymentStatus, Tone> = { Réglé: 'success', 'En attente': 'warning', 'En traitement': 'info', Échoué: 'danger' }

export default function Payments() {
  const navigate = useNavigate()
  const payments = useAsync(() => paymentsService.list())
  const stats = useAsync(() => statsService.payments())
  const s = stats.data
  const [query, setQuery] = useQueryParam('q')
  const [method, setMethod] = useQueryParam('mode')
  const [status, setStatus] = useQueryParam('statut')

  const filtered = useMemo(() => (payments.data ?? []).filter(p =>
    matchesQuery(query, p.id, p.reference, p.customerName, p.orderId) && (!method || p.method === method) && (!status || p.status === status),
  ), [payments.data, query, method, status])

  const columns: Column<Payment>[] = [
    { key: 'id', header: 'N° de paiement', render: p => <span className="mono accent-text">{p.id}</span> },
    { key: 'customer', header: 'Client', primary: true, render: p => <strong className="cell-strong">{p.customerName}</strong> },
    { key: 'order', header: 'Commande', render: p => <span className="mono">{p.orderId}</span> },
    { key: 'amount', header: 'Montant', align: 'right', render: p => <strong className="mono">{formatFC(p.amount)}</strong> },
    { key: 'method', header: 'Mode', render: p => p.method },
    { key: 'institution', header: 'Établissement', render: p => p.institution },
    { key: 'status', header: 'Statut', render: p => <Badge tone={paymentTone[p.status]}>{p.status}</Badge> },
    { key: 'date', header: 'Horodatage', render: p => <span className="mono">{formatDateTime(p.date)}</span> },
  ]

  return (
    <div className="page">
      <PageIntro title="Paiements" description={`Passerelle de paiement · ${s?.activeMethods ?? 5} modes actifs`}>
        <Button onClick={() => navigate('/flux/record-payment')}><Icon name="plus" className="h-4 w-4" />Enregistrer un paiement</Button>
      </PageIntro>

      <div className="stat-grid stat-grid-4">
        <StatCard label="Total encaissé" value={s ? formatFCCompact(s.settledYear) : '…'} note={`Cumul annuel ${new Date().getFullYear()}`} tone="neutral" />
        <StatCard label="Règlements en attente" value={s ? formatFCCompact(s.pendingAmount) : '…'} note={s ? `${formatNumber(s.pendingCount)} transactions` : undefined} tone="warning" />
        <StatCard label="Paiements échoués" value={s ? formatFCCompact(s.failedAmount) : '…'} note={s ? `${formatNumber(s.failedCount)} transactions` : undefined} tone="danger" />
        <StatCard label="Délai de traitement" value={s ? (s.averageDelayHours === null ? 'Non mesuré' : `${s.averageDelayHours.toLocaleString('fr-FR')} h`) : '…'} note="Délai moyen" tone="neutral" />
      </div>

      <Card className="table-card">
        <Toolbar>
          <SearchField value={query} onChange={setQuery} placeholder="Paiement, référence, client…" label="Rechercher un paiement" />
          <Select value={method} onChange={e => setMethod(e.target.value)} aria-label="Filtrer par mode de paiement">
            <option value="">Tous les modes</option>
            {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
          </Select>
          <Select value={status} onChange={e => setStatus(e.target.value)} aria-label="Filtrer par statut">
            <option value="">Tous les statuts</option>
            {(Object.keys(paymentTone) as PaymentStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Toolbar>
        {payments.status === 'error' && <ErrorState message={payments.error} onRetry={payments.reload} />}
        {payments.status === 'loading' && !payments.data && <LoadingState />}
        {payments.data && (
          <DataTable caption="Historique des paiements" columns={columns} rows={filtered} getRowKey={p => p.id}
            empty={<EmptyState icon="wallet" title="Aucun paiement trouvé" message="Modifiez la recherche ou les filtres." />} />
        )}
      </Card>
    </div>
  )
}
