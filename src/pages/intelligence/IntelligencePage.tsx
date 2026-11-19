import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Badge, Button, Card, Heading, Icon, PageIntro, useToast, type IconName } from '@/components/ui'
import { MiniKpis } from './shared'
import { isDemo } from '@/services/config'
import { ApiUnavailablePage } from './ApiUnavailablePage'

const priorities = [
  { title: 'Commander 150 onduleurs solaires', text: 'Le stock disponible couvrira seulement 6 jours de ventes.', impact: 'FC 8,7 M protégés', tone: 'danger' as const, label: 'Urgent', to: '/flux/reorder?sku=WC-EL-0102&qte=150' },
  { title: 'Renforcer la catégorie Textile', text: 'La demande accélère de 21 % dans la zone de Kinshasa.', impact: '+ FC 3,2 M potentiels', tone: 'success' as const, label: 'Opportunité', to: '/produits?categorie=Textile' },
  { title: 'Vérifier 2 paiements inhabituels', text: 'Les montants diffèrent du comportement habituel de ces clients.', impact: 'Risque modéré', tone: 'warning' as const, label: 'À vérifier', to: '/anomalies' },
]

const signals: [string, number, IconName][] = [['Ventes', 84, 'chart'], ['Stocks', 62, 'stock'], ['Clients', 76, 'users'], ['Rentabilité', 89, 'wallet']]

function IntelligencePageDemo() {
  const navigate = useNavigate()
  const notify = useToast()
  const [refreshing, setRefreshing] = useState(false)

  const refresh = () => {
    setRefreshing(true)
    window.setTimeout(() => {
      setRefreshing(false)
      notify('info', 'Données rechargées', 'Mode démonstration : les indicateurs proviennent du jeu de données de démonstration.')
    }, 500)
  }

  return (
    <div className="page">
      <PageIntro title="Intelligence" description="Transformez vos données en décisions.">
        <Button onClick={refresh} loading={refreshing}><Icon name="sparkles" className="h-4 w-4" />Actualiser l’analyse</Button>
      </PageIntro>
      <Card className="intelligence-summary">
        <div className="summary-icon"><Icon name="sparkles" /></div>
        <div>
          <Badge tone="info">ANALYSE AUTOMATIQUE</Badge>
          <Heading level={2}>Votre activité progresse, mais trois décisions demandent votre attention.</Heading>
          <p>WANS Intelligence a analysé 24 821 transactions, 8 394 clients et les stocks de 4 entrepôts.</p>
        </div>
        <span className="confidence-ring" role="img" aria-label="Fiabilité de l’analyse : 92 %"><strong>92 %</strong><small>fiabilité</small></span>
      </Card>
      <MiniKpis items={[
        { label: 'Tendance générale', value: 'Positive', note: '+12,4 %' },
        { label: 'Chiffre d’affaires', value: 'FC 68,4 M', note: '+7,5 M FC' },
        { label: 'Ventes', value: '1 248', note: '+8,2 %' },
        { label: 'Couverture stock', value: '31 jours', note: '3 risques', tone: 'warning' },
        { label: 'Marge moyenne', value: '28,6 %', note: '+1,8 pt' },
      ]} />
      <div className="two-column">
        <Card>
          <div className="card-header"><div><Heading level={2}>Priorités recommandées</Heading><p>Actions classées selon leur impact estimé.</p></div></div>
          <ol className="priority-list">
            {priorities.map((p, i) => (
              <li className="priority-item" key={p.title}>
                <span className="priority-rank" aria-hidden="true">0{i + 1}</span>
                <div><Badge tone={p.tone}>{p.label}</Badge><strong>{p.title}</strong><p>{p.text}</p></div>
                <div className="priority-impact">
                  <strong>{p.impact}</strong>
                  <Button variant="ghost" onClick={() => navigate(p.to)} aria-label={`Traiter : ${p.title}`}>Traiter <Icon name="arrow" className="h-4 w-4" /></Button>
                </div>
              </li>
            ))}
          </ol>
        </Card>
        <Card>
          <Heading level={2}>Signaux suivis</Heading>
          <ul className="signal-list">
            {signals.map(([label, value, icon]) => (
              <li key={label}>
                <span className="signal-icon"><Icon name={icon} /></span>
                <div><span>{label}</span><i role="img" aria-label={`${label} : ${value} sur 100`}><b style={{ width: `${value}%` }} /></i></div>
                <strong>{value}/100</strong>
              </li>
            ))}
          </ul>
          <Button variant="secondary" className="w-full" onClick={() => navigate('/analyses')}>Ouvrir l’analyse détaillée</Button>
        </Card>
      </div>
    </div>
  )
}

export default function IntelligencePage() {
  return isDemo
    ? <IntelligencePageDemo />
    : <ApiUnavailablePage title="Intelligence" description="Transformez vos données en décisions."
      message="La synthèse automatique (priorités, signaux, fiabilité) n’est pas encore calculée par le serveur. Consultez le tableau de bord, les analyses et la rentabilité, qui reposent sur vos données réelles." />
}
