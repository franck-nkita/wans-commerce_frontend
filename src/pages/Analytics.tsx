import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, ErrorState, Heading, LoadingState, PageIntro, UnavailableState } from '@/components/ui'
import { useLegendProps, useTooltipStyle } from '@/components/charts/ChartTooltip'
import { useAsync } from '@/hooks/useAsync'
import { analyticsService } from '@/services'
import { isDemo } from '@/services/config'
import { useChartColors } from '@/theme/ThemeProvider'

export default function Analytics() {
  const monthly = useAsync(() => analyticsService.monthly())
  const radar = useAsync(() => isDemo ? analyticsService.radar() : Promise.resolve(null))
  const colors = useChartColors()
  const tooltip = useTooltipStyle()
  const legend = useLegendProps()
  const axis = { tick: { fontSize: 11, fill: colors.axis }, axisLine: false, tickLine: false } as const

  return (
    <div className="page">
      <PageIntro title="Analyses" description={isDemo ? 'Pilotage décisionnel · Janv.–sept. 2026' : `Pilotage décisionnel · année ${new Date().getFullYear()}`} />

      {monthly.status === 'error' && <ErrorState message={monthly.error} onRetry={monthly.reload} />}
      <div className="two-equal">
        <Card className="chart-card">
          <Heading level={2}>Évolution du chiffre d’affaires (FC M)</Heading>
          <p className="card-sub">Trajectoire de croissance mensuelle</p>
          <div className="small-chart">
            {!monthly.data ? <LoadingState rows={3} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthly.data} accessibilityLayer>
                  <defs><linearGradient id="analGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={colors.primary} stopOpacity={0.25} /><stop offset="95%" stopColor={colors.primary} stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid stroke={colors.grid} vertical={false} />
                  <XAxis dataKey="month" {...axis} />
                  <YAxis {...axis} />
                  <Tooltip {...tooltip} />
                  <Area type="monotone" dataKey="revenue" stroke={colors.primary} strokeWidth={2.5} fill="url(#analGrad)" name="Chiffre d’affaires (M FC)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
        <Card className="chart-card">
          <Heading level={2}>Radar de performance</Heading>
          <p className="card-sub">Score des indicateurs opérationnels (sur 100)</p>
          <div className="small-chart">
            {!isDemo && <UnavailableState message="Satisfaction client, taux de service ou délais de livraison ne sont pas encore mesurés dans WANS COMMERCE." />}
            {radar.status === 'error' && <ErrorState message={radar.error} onRetry={radar.reload} />}
            {radar.data && (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radar.data} cx="50%" cy="50%" outerRadius="68%">
                  <PolarGrid stroke={colors.grid} />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: colors.axis }} />
                  <Radar dataKey="value" name="Score" stroke={colors.primary} fill={colors.primary} fillOpacity={0.15} strokeWidth={2} isAnimationActive={false} />
                  <Tooltip {...tooltip} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <Card className="chart-card">
        <Heading level={2}>Évolution des commandes et des clients</Heading>
        <p className="card-sub">Indicateurs de volume consolidés</p>
        <div className="small-chart">
          {monthly.data && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly.data} barGap={6} accessibilityLayer>
                <CartesianGrid stroke={colors.grid} vertical={false} />
                <XAxis dataKey="month" {...axis} />
                <YAxis {...axis} />
                <Tooltip {...tooltip} cursor={{ fill: colors.grid, opacity: 0.4 }} />
                <Legend {...legend} />
                <Bar dataKey="orders" fill={colors.primary} radius={[3, 3, 0, 0]} name="Commandes" isAnimationActive={false} />
                <Bar dataKey="customers" fill={colors.success} radius={[3, 3, 0, 0]} name="Clients" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  )
}
