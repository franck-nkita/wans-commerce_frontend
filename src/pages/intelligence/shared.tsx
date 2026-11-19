import { Badge, Card, type Tone } from '@/components/ui'

export function MiniKpis({ items }: { items: { label: string; value: string; note: string; tone?: Tone }[] }) {
  return (
    <div className={`mini-kpi-grid mini-kpi-grid-${items.length}`}>
      {items.map(item => (
        <Card key={item.label} className="mini-kpi">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <Badge tone={item.tone ?? 'success'}>{item.note}</Badge>
        </Card>
      ))}
    </div>
  )
}
