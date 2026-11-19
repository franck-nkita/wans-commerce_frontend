import { useNavigate } from 'react-router'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, Button, Card, ErrorState, Heading, Icon, LoadingState, PageIntro } from '@/components/ui'
import { useTooltipStyle } from '@/components/charts/ChartTooltip'
import { useAsync } from '@/hooks/useAsync'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { analyticsService } from '@/services'
import { isDemo } from '@/services/config'
import { useChartColors } from '@/theme/ThemeProvider'
import { MiniKpis } from './shared'

export default function ProfitabilityPage() {
  const navigate = useNavigate()
  const margins = useAsync(() => analyticsService.margins())
  const colors = useChartColors()
  const tooltip = useTooltipStyle()
  const narrow = useMediaQuery('(max-width: 640px)')

  return (
    <div className="page">
      <PageIntro title="Rentabilité" description="Analysez les marges et les sources de profit de votre entreprise.">
        <Button onClick={() => navigate('/flux/generate-report?type=Rapport%20financier')}><Icon name="sparkles" className="h-4 w-4" />Générer l’analyse IA</Button>
      </PageIntro>
      {isDemo && <MiniKpis items={[
        { label: 'Chiffre d’affaires', value: 'FC 68,4 M', note: '+12,4 %' },
        { label: 'Marge brute', value: 'FC 19,6 M', note: '+15,1 %' },
        { label: 'Marge moyenne', value: '28,6 %', note: '+1,8 pt' },
        { label: 'Coût total', value: 'FC 48,8 M', note: '71,4 % du CA', tone: 'warning' },
      ]} />}
      {margins.status === 'error' && <ErrorState message={margins.error} onRetry={margins.reload} />}
      <div className="two-column">
        <Card>
          <div className="card-header"><div><Heading level={2}>Produits les plus rentables</Heading><p>{isDemo ? 'Marge brute moyenne par catégorie.' : 'Marge brute par catégorie sur les 90 derniers jours, remises déduites.'}</p></div></div>
          <div className="profit-chart">
            {!margins.data ? <LoadingState rows={4} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={margins.data} layout="vertical" margin={{ left: narrow ? 0 : 20 }} accessibilityLayer>
                  <CartesianGrid stroke={colors.grid} horizontal={false} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: colors.axis }} unit=" %" />
                  <YAxis type="category" dataKey="name" width={narrow ? 96 : 125} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: colors.axis }} />
                  <Tooltip {...tooltip} cursor={{ fill: colors.grid, opacity: 0.4 }} formatter={v => [`${v} %`, 'Marge']} />
                  <Bar dataKey="margin" fill={colors.primary} radius={[0, 5, 5, 0]} barSize={18} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
        <Card>
          <Heading level={2}>Contribution à la marge</Heading>
          <ol className="margin-list">
            {(margins.data ?? []).map((d, i) => (
              <li key={d.name}>
                <span className="rank" aria-hidden="true">{i + 1}</span>
                <div><strong>{d.name}</strong><i role="img" aria-label={`Marge ${d.margin} %`}><b style={{ width: `${Math.min(d.margin * 2.2, 100)}%` }} /></i></div>
                <strong>{d.margin} %</strong>
              </li>
            ))}
          </ol>
        </Card>
      </div>
      {isDemo && <Card className="ai-analysis ai-analysis-large">
        <span className="ai-analysis-icon"><Icon name="sparkles" /></span>
        <div>
          <Badge tone="info">ANALYSE IA</Badge>
          <Heading level={3}>La catégorie Électronique représente 24 % du chiffre d’affaires, mais 36 % de la marge.</Heading>
          <p>Augmenter la disponibilité des onduleurs solaires à Kinshasa pourrait améliorer la marge brute mensuelle de 2,4 points.</p>
        </div>
        <Button onClick={() => navigate('/recommandations')}>Voir le plan d’action</Button>
      </Card>}
    </div>
  )
}
