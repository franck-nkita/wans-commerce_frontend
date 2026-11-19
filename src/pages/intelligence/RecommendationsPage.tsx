import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Badge, Button, Card, EmptyState, ErrorState, Heading, Icon, LoadingState, Modal, PageIntro, useToast } from '@/components/ui'
import { errorMessage, useAsync } from '@/hooks/useAsync'
import { recommendationsService, type Recommendation } from '@/services'
import { isDemo } from '@/services/config'
import { ApiUnavailablePage } from './ApiUnavailablePage'

function RecommendationsPageDemo() {
  const navigate = useNavigate()
  const notify = useToast()
  const recs = useAsync(() => recommendationsService.list())
  const [detail, setDetail] = useState<Recommendation | null>(null)

  const list = recs.data ?? []
  const pending = list.filter(r => !r.done).length

  const toggle = async (rec: Recommendation) => {
    try {
      await recommendationsService.setDone(rec.id, !rec.done)
      notify('success', rec.done ? 'Recommandation rouverte' : 'Recommandation traitée', rec.title)
    } catch (error) {
      notify('error', 'Action impossible', errorMessage(error))
    }
  }

  return (
    <div className="page">
      <PageIntro title="Recommandations" description="Les données de votre entreprise suggèrent les actions suivantes." />
      <div className="recommendation-layout">
        <div className="recommendation-list">
          {recs.status === 'error' && <ErrorState message={recs.error} onRetry={recs.reload} />}
          {!recs.data && recs.status === 'loading' && <LoadingState />}
          {recs.data && list.length === 0 && <EmptyState icon="bulb" title="Aucune recommandation" />}
          {list.map(r => (
            <Card className={`recommendation-card ${r.done ? 'recommendation-done' : ''}`} key={r.id}>
              <div className="recommendation-icon"><Icon name={r.done ? 'check' : r.icon} /></div>
              <div className="recommendation-content">
                <Badge tone={r.done ? 'neutral' : r.tone}>{r.done ? 'TRAITÉ' : r.category}</Badge>
                <Heading level={3}>{r.title}</Heading>
                <p>{r.text}</p>
                <div className="fact-row">{r.facts.map(f => <span key={f}>{f}</span>)}</div>
                <div className="impact-line"><Icon name="sparkles" className="h-4 w-4" /><strong>Impact potentiel :</strong> {r.impact}</div>
              </div>
              <div className="recommendation-actions">
                <Button variant="secondary" onClick={() => setDetail(r)}>Voir le détail</Button>
                <Button variant="ghost" onClick={() => toggle(r)} aria-pressed={r.done}>{r.done ? 'Rouvrir' : 'Marquer comme traité'}</Button>
              </div>
            </Card>
          ))}
        </div>
        <aside>
          <Card>
            <Heading level={3}>Résumé des opportunités</Heading>
            <div className="summary-stat"><span>Impact potentiel cumulé</span><strong>FC 15,0 M</strong></div>
            <div className="summary-stat"><span>Actions prioritaires</span><strong>{pending}</strong></div>
            <div className="summary-stat"><span>Déjà traitées ce mois</span><strong>{12 + list.length - pending}</strong></div>
          </Card>
          <Card className="method-card">
            <Icon name="sparkles" />
            <Heading level={3}>Comment cela fonctionne ?</Heading>
            <p>Les recommandations combinent vos ventes, stocks, marges et comportements clients. Elles sont recalculées chaque jour.</p>
          </Card>
        </aside>
      </div>

      <Modal open={Boolean(detail)} title={detail?.title ?? ''} description={detail?.category} onClose={() => setDetail(null)}
        footer={detail && <Button onClick={() => navigate(detail.action.to)}>{detail.action.label}<Icon name="arrow" className="h-4 w-4" /></Button>}>
        {detail && (
          <>
            <p className="modal-message">{detail.text}</p>
            <ul className="detail-list">{detail.facts.map(f => <li key={f}><Icon name="check" className="h-4 w-4" />{f}</li>)}</ul>
            <div className="impact-line"><Icon name="sparkles" className="h-4 w-4" /><strong>Impact potentiel :</strong> {detail.impact}</div>
          </>
        )}
      </Modal>
    </div>
  )
}

export default function RecommendationsPage() {
  return isDemo
    ? <RecommendationsPageDemo />
    : <ApiUnavailablePage title="Recommandations" description="Les données de votre entreprise suggèrent les actions suivantes."
      message="Le moteur de recommandations n’est pas encore disponible. Les alertes de stock, calculées sur vos données réelles, restent accessibles depuis la page Stocks." />
}
