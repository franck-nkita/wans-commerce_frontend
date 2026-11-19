import { useChartColors } from '@/theme/ThemeProvider'

/** Style commun des infobulles Recharts, adapté au thème actif. */
export function useTooltipStyle() {
  const colors = useChartColors()
  return {
    contentStyle: { background: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(15,23,42,.08)', color: colors.tooltipText, fontSize: 12 },
    labelStyle: { color: colors.tooltipText, fontWeight: 600 },
    itemStyle: { color: colors.tooltipText },
  }
}

/** Légendes lisibles : Recharts colore sinon le texte avec la couleur de la série, parfois trop pâle. */
export function useLegendProps() {
  const colors = useChartColors()
  return {
    wrapperStyle: { fontSize: 11 },
    formatter: (value: string) => <span style={{ color: colors.axis }}>{value}</span>,
  }
}
