import { useNavigate } from 'react-router'
import { Badge, Button, Card, EmptyState, ErrorState, Icon, LoadingState, PageIntro, useToast, type Tone } from '@/components/ui'
import { errorMessage, useAsync } from '@/hooks/useAsync'
import { exportTable } from '@/lib/exportFile'
import { formatDate } from '@/lib/format'
import { reportsService, type ReportRowsQuery } from '@/services'
import type { Report, ReportType } from '@/types/domain'

const typeLabel: Record<ReportType, { label: string; tone: Tone }> = {
  'Rapport financier': { label: 'Financier', tone: 'info' },
  'Rapport des stocks': { label: 'Inventaire', tone: 'warning' },
  'Rapport des clients': { label: 'Clients', tone: 'success' },
  'Rapport des ventes': { label: 'Ventes', tone: 'info' },
  'Rapport des produits': { label: 'Produits', tone: 'neutral' },
  'Rapport des paiements': { label: 'Paiements', tone: 'neutral' },
}

/** Télécharge un rapport enregistré (`id`) ou une définition ponctuelle (`query`). Le fichier est produit par le navigateur. */
export async function downloadReport(report: Pick<Report, 'name' | 'type' | 'period' | 'format'> & { id?: string }, query?: ReportRowsQuery) {
  const data = await reportsService.rows(query ?? { reportId: report.id, type: report.type })
  exportTable({ title: report.name, subtitle: `${report.type} · ${report.period}`, ...data }, report.format)
}

export default function Reports() {
  const navigate = useNavigate()
  const notify = useToast()
  const reports = useAsync(() => reportsService.list())

  const download = async (report: Report) => {
    try {
      await downloadReport(report)
      notify('success', report.format === 'PDF' ? 'Impression ouverte' : 'Téléchargement lancé', report.format === 'PDF'
        ? 'Choisissez « Enregistrer au format PDF » dans la fenêtre d’impression.'
        : `« ${report.name} » est en cours de téléchargement.`)
    } catch (error) {
      notify('error', 'Export impossible', errorMessage(error))
    }
  }

  return (
    <div className="page">
      <PageIntro title="Rapports" description="Générez et téléchargez les rapports de l’entreprise">
        <Button onClick={() => navigate('/flux/generate-report')}><Icon name="plus" className="h-4 w-4" />Générer un rapport</Button>
      </PageIntro>

      <div className="ai-strip ai-strip-report">
        <div><span>RAPPORT IA</span><strong>Générer une analyse décisionnelle</strong><p>Obtenez une synthèse structurée de la performance, des tendances, des anomalies, de la rentabilité et des recommandations.</p></div>
        <div className="report-shortcuts">
          <Button variant="secondary" onClick={() => navigate('/flux/generate-report?periode=Ce%20mois')}>Période : Ce mois</Button>
          <Button variant="secondary" onClick={() => navigate('/flux/generate-report?type=Rapport%20financier')}>Rapport financier</Button>
          <Button onClick={() => navigate('/flux/generate-report')}>Générer le rapport</Button>
        </div>
      </div>

      {reports.status === 'error' && <ErrorState message={reports.error} onRetry={reports.reload} />}
      {reports.status === 'loading' && !reports.data && <LoadingState />}
      {reports.data?.length === 0 && <EmptyState icon="report" title="Aucun rapport" message="Générez votre premier rapport." />}
      <ul className="report-list">
        {reports.data?.map(report => {
          const t = typeLabel[report.type]
          return (
            <li key={report.id}>
              <Card className="report-row">
                <span className={`report-format report-format-${t.tone}`} aria-hidden="true">{report.format}</span>
                <div className="report-copy">
                  <strong>{report.name}</strong>
                  <span>Période : {report.period} · Généré le {formatDate(report.generatedAt)}</span>
                </div>
                <div className="report-meta">
                  <Badge tone={t.tone}>{t.label}</Badge>
                  <Button variant="secondary" onClick={() => void download(report)} aria-label={`Télécharger ${report.name} (${report.format})`}>
                    <Icon name="download" className="h-4 w-4" />Télécharger
                  </Button>
                </div>
              </Card>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
