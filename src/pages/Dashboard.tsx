import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, Button, Card, ErrorState, Heading, Icon, LoadingState, type IconName } from '@/components/ui'
import { useTooltipStyle } from '@/components/charts/ChartTooltip'
import { useAsync } from '@/hooks/useAsync'
import { formatFCCompact, formatNumber } from '@/lib/format'
import { dashboardService, openAnomaliesCount } from '@/services'
import { useDataVersion } from '@/hooks/useDataVersion'
import { useSession } from '@/hooks/useSession'
import { isDemo } from '@/services/config'
import { useChartColors } from '@/theme/ThemeProvider'
import type { DashboardPeriod } from '@/types/domain'

const periods: DashboardPeriod[] = ['7 jours', '30 jours', '3 mois', '6 mois', '1 an']

const insights: { title: string; value: string; action: string; icon: IconName; tone: string; to: string }[] = [
  { title: 'Prévisions', value: '+18 % de ventes attendues', action: 'Voir les prévisions', icon: 'forecast', tone: 'blue', to: '/previsions' },
  { title: 'Risques', value: '3 produits risquent une rupture', action: 'Analyser', icon: 'alert', tone: 'amber', to: '/flux/alerts' },
  { title: 'Recommandations', value: '5 actions à fort impact', action: 'Consulter', icon: 'bulb', tone: 'green', to: '/recommandations' },
  { title: 'Anomalies', value: '2 variations détectées', action: 'Examiner', icon: 'chart', tone: 'red', to: '/anomalies' },
]

const today = [
  { level: 'Critique', title: 'Stock critique', text: 'L’onduleur solaire 5 KVA pourrait être en rupture dans 6 jours.', time: 'Il y a 18 min', tone: 'danger' as const, to: '/flux/alerts' },
  { level: 'À surveiller', title: 'Baisse des ventes', text: 'Les ventes d’huile de palme sont inférieures de 31 % à la moyenne.', time: 'Il y a 1 h', tone: 'warning' as const, to: '/anomalies' },
  { level: 'Opportunité', title: 'Catégorie en croissance', text: 'La catégorie Textile progresse de 21 % cette semaine à Kinshasa.', time: 'Il y a 3 h', tone: 'success' as const, to: '/recommandations' },
]

function KpiGrid() {
  const summary = useAsync(() => dashboardService.summary())
  if (summary.status === 'error') return <ErrorState message={summary.error} onRetry={summary.reload} />
  if (!summary.data) return <div className="kpi-grid">{[0, 1, 2, 3].map(i => <Card key={i} className="kpi-card"><LoadingState rows={2} /></Card>)}</div>
  const s = summary.data
  const kpis: { label: string; value: string; change: string; detail: string; icon: IconName; warning?: boolean }[] = [
    { label: 'Chiffre d’affaires', value: formatFCCompact(s.revenue.value), change: s.revenue.change, detail: 'vs. période précédente', icon: 'wallet' },
    { label: 'Ventes', value: formatNumber(s.sales.value), change: s.sales.change, detail: 'transactions réalisées', icon: 'sales' },
    { label: 'Commandes', value: formatNumber(s.orders.value), change: s.orders.change, detail: `dont ${s.orders.processing} en traitement`, icon: 'report' },
    { label: 'Stock disponible', value: formatNumber(s.stock.value), change: `${s.stock.alerts} alerte${s.stock.alerts > 1 ? 's' : ''}`, detail: `produits dans ${s.stock.warehouses} entrepôts`, icon: 'stock', warning: s.stock.alerts > 0 },
  ]
  return (
    <div className="kpi-grid">
      {kpis.map(kpi => (
        <Card key={kpi.label} className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">{kpi.label}</span><span className="kpi-icon"><Icon name={kpi.icon} className="h-5 w-5" /></span></div>
          <div className="kpi-value">{kpi.value}</div>
          <div className="kpi-foot">
            <Badge tone={kpi.warning ? 'warning' : 'success'}>{!kpi.warning && <Icon name="trend" className="h-3 w-3" />}{kpi.change}</Badge>
            <span>{kpi.detail}</span>
          </div>
        </Card>
      ))}
    </div>
  )
}

function RevenueCard() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState<DashboardPeriod>('30 jours')
  const revenue = useAsync(() => dashboardService.revenue(period), [period])
  const colors = useChartColors()
  const tooltip = useTooltipStyle()

  return (
    <Card className="revenue-card">
      <div className="card-header">
        <div><Heading level={2}>Évolution du chiffre d’affaires</Heading><p>Performance commerciale consolidée en millions de FC</p></div>
        <div className="period-tabs" role="tablist" aria-label="Période du graphique">
          {periods.map(item => (
            <Button key={item} variant="ghost" role="tab" aria-selected={period === item} onClick={() => setPeriod(item)} className={period === item ? 'active' : ''}>{item}</Button>
          ))}
        </div>
      </div>
      <div className="chart-legend" aria-hidden="true"><span><i className="legend-current" />Période actuelle</span><span><i className="legend-previous" />Période précédente</span></div>
      <div className="revenue-chart" aria-busy={revenue.status === 'loading'}>
        {revenue.status === 'error' && <ErrorState message={revenue.error} onRetry={revenue.reload} />}
        {revenue.data && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenue.data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }} accessibilityLayer>
              <defs>
                <linearGradient id="blueArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.primary} stopOpacity={0.17} />
                  <stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={colors.grid} vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: colors.axis, fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: colors.axis, fontSize: 11 }} tickFormatter={v => `${v} M`} />
              <Tooltip {...tooltip} formatter={(value, name) => [`FC ${String(value).replace('.', ',')} M`, name]} />
              <Area type="monotone" dataKey="previous" stroke={colors.muted} strokeWidth={2} strokeDasharray="5 5" fill="transparent" name="Période précédente" isAnimationActive={false} />
              <Area type="monotone" dataKey="current" stroke={colors.primary} strokeWidth={2.5} fill="url(#blueArea)" name="Période actuelle" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      {isDemo && <div className="ai-analysis">
        <span className="ai-analysis-icon"><Icon name="sparkles" /></span>
        <div><strong>Analyse IA</strong><p>Le chiffre d’affaires progresse de 12,4 %, principalement grâce aux catégories Textile et Électronique.</p></div>
        <Button variant="ghost" onClick={() => navigate('/intelligence')}>Voir l’analyse <Icon name="arrow" className="h-4 w-4" /></Button>
      </div>}
    </Card>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  useDataVersion()
  const { user } = useSession()
  const firstName = isDemo ? 'Franck' : (user?.fullName.split(' ')[0] ?? '')
  const anomalies = openAnomaliesCount()
  const insightCards = insights.map(item => item.title === 'Anomalies'
    ? { ...item, value: anomalies ? `${anomalies} variation${anomalies > 1 ? 's' : ''} détectée${anomalies > 1 ? 's' : ''}` : 'Aucune variation à examiner' }
    : item)
  return (
    <div className="page dashboard-page">
      <div className="welcome-row">
        <div><Heading level={1}>{firstName ? `Bonjour, ${firstName}` : 'Bonjour'}</Heading><p>Voici ce qui se passe dans votre entreprise aujourd’hui.</p></div>
        <div className="welcome-actions">
          <Button variant="secondary" onClick={() => navigate('/flux/export-report')}><Icon name="download" className="h-4 w-4" />Exporter</Button>
          <Button onClick={() => navigate('/flux/new-transaction')}><Icon name="plus" className="h-4 w-4" />Nouvelle transaction</Button>
        </div>
      </div>

      <KpiGrid />
      <RevenueCard />

      {isDemo && <>
      <div className="section-heading">
        <div><Heading level={2}>Intelligence de votre entreprise</Heading><p>Les informations importantes détectées automatiquement.</p></div>
        <span className="analysis-time"><Icon name="clock" className="h-4 w-4" /> Dernière analyse : aujourd’hui à 14:32</span>
      </div>
      <div className="insight-grid">
        {insightCards.map(item => (
          <Card key={item.title} className={`insight-card insight-${item.tone}`}>
            <div className="insight-icon"><Icon name={item.icon} /></div>
            <div><span>{item.title}</span><strong>{item.value}</strong><Button variant="ghost" onClick={() => navigate(item.to)}>{item.action}<Icon name="arrow" className="h-4 w-4" /></Button></div>
          </Card>
        ))}
      </div>

      <Card className="today-card">
        <div className="card-header">
          <div><Heading level={2}>À savoir aujourd’hui</Heading><p>Priorités et opportunités identifiées par WANS Intelligence.</p></div>
          <Button variant="secondary" onClick={() => navigate('/recommandations')}>Voir toutes les priorités</Button>
        </div>
        <ul className="today-list">
          {today.map(item => (
            <li className="today-item" key={item.title}>
              <div className={`timeline-dot timeline-${item.tone}`}><span /></div>
              <div className="today-main"><Badge tone={item.tone}>{item.level}</Badge><strong>{item.title}</strong><p>{item.text}</p></div>
              <span className="today-time">{item.time}</span>
              <Button variant="ghost" onClick={() => navigate(item.to)} aria-label={`Examiner : ${item.title}`}>Examiner <Icon name="chevron" className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
      </Card>
      </>}
    </div>
  )
}
