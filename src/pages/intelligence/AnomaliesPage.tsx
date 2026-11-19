import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Badge, Button, Card, EmptyState, ErrorState, Heading, Icon, LoadingState, PageIntro, Popover, useToast } from '@/components/ui'
import { errorMessage, useAsync } from '@/hooks/useAsync'
import { anomaliesService, type Anomaly } from '@/services'
import { isDemo } from '@/services/config'
import { ApiUnavailablePage } from './ApiUnavailablePage'

function AnomaliesPageDemo() {
  const navigate = useNavigate()
  const notify = useToast()
  const anomalies = useAsync(() => anomaliesService.list())
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showClosed, setShowClosed] = useState(false)

  const all = anomalies.data ?? []
  const isOpen = (a: Anomaly) => a.status === 'À examiner' || a.status === 'Sous surveillance'
  const open = all.filter(isOpen)
  const visible = showClosed ? all : open
  const toReview = open.filter(a => a.status === 'À examiner').length
  const watched = open.length - toReview

  const messages: Record<Anomaly['status'], string> = {
    'À examiner': 'Anomalie à examiner', 'Sous surveillance': 'Anomalie mise sous surveillance', Ignorée: 'Anomalie ignorée', Résolue: 'Anomalie résolue',
  }
  const changeStatus = async (anomaly: Anomaly, status: Anomaly['status']) => {
    try {
      await anomaliesService.setStatus(anomaly.id, status)
      notify('success', messages[status], anomaly.title)
    } catch (error) {
      notify('error', 'Action impossible', errorMessage(error))
    }
  }

  return (
    <div className="page">
      <PageIntro title="Anomalies détectées" description="Le système surveille automatiquement les variations inhabituelles.">
        <Button onClick={anomalies.reload} loading={anomalies.status === 'loading'}><Icon name="sparkles" className="h-4 w-4" />Lancer une analyse</Button>
      </PageIntro>

      <div className="anomaly-summary" role="status">
        <span><i className="status-dot red" />{toReview} à examiner</span>
        <span><i className="status-dot amber" />{watched} sous surveillance</span>
        <span><i className="status-dot green" />{18 + all.filter(a => a.status === 'Résolue').length} résolues ce mois</span>
        <label className="ml-auto toggle-inline">
          <input type="checkbox" checked={showClosed} onChange={e => setShowClosed(e.target.checked)} />
          Afficher les anomalies traitées
        </label>
      </div>

      {anomalies.status === 'error' && <ErrorState message={anomalies.error} onRetry={anomalies.reload} />}
      {!anomalies.data && anomalies.status === 'loading' && <LoadingState />}
      {anomalies.data && visible.length === 0 && <EmptyState icon="check" title="Aucune anomalie à examiner" message="Toutes les variations détectées ont été traitées." />}

      <div className="anomaly-grid">
        {visible.map(a => (
          <Card className={`anomaly-card ${!isOpen(a) ? 'anomaly-closed' : ''}`} key={a.id}>
            <div className="anomaly-top">
              <span className="anomaly-icon"><Icon name="alert" /></span>
              <div>
                <Badge tone={!isOpen(a) ? 'neutral' : a.status === 'Sous surveillance' ? 'warning' : a.severity === 'Élevée' ? 'danger' : 'warning'}>
                  {a.status === 'À examiner' ? `Importance ${a.severity.toLowerCase()}` : a.status}
                </Badge>
                <Heading level={3}>{a.title}</Heading>
                <p>{a.subject}</p>
              </div>
              <Popover trigger={props => (
                <Button variant="ghost" className="icon-button-plain" onClick={props.toggle} aria-expanded={props['aria-expanded']} aria-haspopup="true" aria-label={`Plus d’options : ${a.title}`}>
                  <Icon name="more" />
                </Button>
              )}>
                {close => (
                  <div className="menu" role="menu">
                    {a.status === 'À examiner' && <button type="button" role="menuitem" className="menu-item" onClick={() => { close(); changeStatus(a, 'Sous surveillance') }}><Icon name="eye" className="h-4 w-4" />Mettre sous surveillance</button>}
                    {a.status === 'Sous surveillance' && <button type="button" role="menuitem" className="menu-item" onClick={() => { close(); changeStatus(a, 'À examiner') }}><Icon name="alert" className="h-4 w-4" />Repasser à examiner</button>}
                    {isOpen(a)
                      ? <button type="button" role="menuitem" className="menu-item" onClick={() => { close(); changeStatus(a, 'Résolue') }}><Icon name="check" className="h-4 w-4" />Marquer comme résolue</button>
                      : <button type="button" role="menuitem" className="menu-item" onClick={() => { close(); changeStatus(a, 'À examiner') }}><Icon name="refresh" className="h-4 w-4" />Rouvrir</button>}
                  </div>
                )}
              </Popover>
            </div>
            <dl className="anomaly-metrics">
              <div><dt>Valeur actuelle</dt><dd>{a.current}</dd></div>
              <div><dt>Moyenne habituelle</dt><dd>{a.usual}</dd></div>
              <div><dt>Variation</dt><dd className="danger-text">{a.change}</dd></div>
              <div><dt>Détection</dt><dd>{a.detectedAt}</dd></div>
            </dl>
            {expanded === a.id && <p className="anomaly-explanation" id={`analyse-${a.id}`}>{a.explanation}</p>}
            <div className="anomaly-actions">
              <Button onClick={() => setExpanded(expanded === a.id ? null : a.id)} aria-expanded={expanded === a.id} aria-controls={`analyse-${a.id}`}>{expanded === a.id ? 'Masquer l’analyse' : 'Analyser'}</Button>
              <Button variant="secondary" onClick={() => navigate(a.target)}>Voir les transactions</Button>
              {isOpen(a) && <Button variant="ghost" onClick={() => changeStatus(a, 'Ignorée')}>Ignorer</Button>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default function AnomaliesPage() {
  return isDemo
    ? <AnomaliesPageDemo />
    : <ApiUnavailablePage title="Anomalies détectées" description="Le système surveille automatiquement les variations inhabituelles."
      message="Aucun moteur de détection d’anomalies n’est encore branché sur vos données. Cette page sera activée lorsqu’il le sera." />
}
