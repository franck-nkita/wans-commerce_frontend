import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import {
  Badge, Button, Card, DataTable, EmptyState, ErrorState, Icon, LoadingState, Modal, PageIntro, SearchField, Select, StatCard, Toolbar, type Column, type Tone,
} from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { useQueryParam } from '@/hooks/useQueryParam'
import { formatDate, formatFCCompact, formatNumber, matchesQuery } from '@/lib/format'
import { customersService, statsService } from '@/services'
import { isDemo } from '@/services/config'
import type { Customer, CustomerTier } from '@/types/domain'

const tierTone: Record<CustomerTier, Tone> = { Platine: 'info', Or: 'warning', Argent: 'neutral' }

export default function Customers() {
  const navigate = useNavigate()
  const customers = useAsync(() => customersService.list())
  const stats = useAsync(() => statsService.customers())
  const [query, setQuery] = useQueryParam('q')
  const [tier, setTier] = useQueryParam('niveau')
  const [selectedId, setSelectedId] = useQueryParam('client')

  const filtered = useMemo(() => (customers.data ?? []).filter(c =>
    matchesQuery(query, c.name, c.id, c.city, c.email, c.company) && (!tier || c.tier === tier),
  ), [customers.data, query, tier])
  const selected = customers.data?.find(c => c.id === selectedId)

  const columns: Column<Customer>[] = [
    { key: 'id', header: 'ID', render: c => <span className="mono accent-text">{c.id}</span> },
    { key: 'name', header: 'Client', primary: true, render: c => <strong className="cell-strong">{c.name}</strong> },
    { key: 'city', header: 'Ville', render: c => c.city },
    { key: 'tier', header: 'Niveau', render: c => <Badge tone={tierTone[c.tier]}>{c.tier}</Badge> },
    { key: 'spent', header: 'Dépenses totales', align: 'right', render: c => <strong className="mono">{formatFCCompact(c.spent)}</strong> },
    { key: 'orders', header: 'Commandes', align: 'right', render: c => <span className="mono">{c.orders}</span> },
    { key: 'joined', header: 'Depuis', render: c => formatDate(c.joined) },
    { key: 'actions', header: 'Actions', render: c => <Button variant="ghost" className="table-action" onClick={() => setSelectedId(c.id)} aria-label={`Voir la fiche de ${c.name}`}><Icon name="eye" className="h-4 w-4" />Fiche</Button> },
  ]

  return (
    <div className="page">
      <PageIntro title="Clients" description={isDemo ? '8 394 comptes professionnels vérifiés sur 22 marchés africains' : `${formatNumber(stats.data?.total ?? customers.data?.length ?? 0)} clients enregistrés`}>
        <Button onClick={() => navigate('/flux/add-customer')}><Icon name="plus" className="h-4 w-4" />Ajouter un client</Button>
      </PageIntro>

      <div className="stat-grid stat-grid-3">
        <StatCard label="Total des clients" value={stats.data ? formatNumber(stats.data.total) : '…'} note={isDemo ? 'Comptes vérifiés' : 'Clients enregistrés'} tone="neutral" />
        <StatCard label="Niveau Platine" value={stats.data ? formatNumber(stats.data.platinum) : '…'} note="Clients à forte valeur" tone="info" />
        <StatCard label="Nouveaux ce mois" value={stats.data ? `+${formatNumber(stats.data.newThisMonth)}` : '…'}
          note={isDemo ? 'Septembre 2026' : new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} />
      </div>

      <Card className="table-card">
        <Toolbar>
          <SearchField value={query} onChange={setQuery} placeholder="Nom, ville, e-mail…" label="Rechercher un client" />
          <Select value={tier} onChange={e => setTier(e.target.value)} aria-label="Filtrer par niveau">
            <option value="">Tous les niveaux</option>
            {(Object.keys(tierTone) as CustomerTier[]).map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Toolbar>
        {customers.status === 'error' && <ErrorState message={customers.error} onRetry={customers.reload} />}
        {customers.status === 'loading' && !customers.data && <LoadingState />}
        {customers.data && (
          <DataTable caption="Portefeuille clients" columns={columns} rows={filtered} getRowKey={c => c.id}
            empty={<EmptyState icon="users" title="Aucun client trouvé" message="Modifiez la recherche ou le filtre." />} />
        )}
      </Card>

      <Modal open={Boolean(selected)} title={selected?.name ?? ''} description={selected ? `${selected.id} · ${selected.type}` : undefined} onClose={() => setSelectedId('')}
        footer={selected && <Button onClick={() => navigate(`/flux/new-order?client=${selected.id}`)}><Icon name="plus" className="h-4 w-4" />Nouvelle commande</Button>}>
        {selected && (
          <dl className="detail-grid">
            <div><dt>Niveau</dt><dd><Badge tone={tierTone[selected.tier]}>{selected.tier}</Badge></dd></div>
            <div><dt>Client depuis</dt><dd>{formatDate(selected.joined)}</dd></div>
            <div><dt>Téléphone</dt><dd>{selected.phone ? <a href={`tel:${selected.phone.replace(/\s/g, '')}`}>{selected.phone}</a> : '—'}</dd></div>
            <div><dt>E-mail</dt><dd>{selected.email ? <a href={`mailto:${selected.email}`}>{selected.email}</a> : '—'}</dd></div>
            <div><dt>Adresse</dt><dd>{[selected.address, selected.city].filter(Boolean).join(', ') || '—'}</dd></div>
            <div><dt>Entreprise</dt><dd>{selected.company || '—'}</dd></div>
            <div><dt>Commandes</dt><dd>{formatNumber(selected.orders)}</dd></div>
            <div><dt>Dépenses totales</dt><dd>{formatFCCompact(selected.spent)}</dd></div>
            {selected.notes && <div className="detail-wide"><dt>Notes</dt><dd>{selected.notes}</dd></div>}
          </dl>
        )}
      </Modal>
    </div>
  )
}
