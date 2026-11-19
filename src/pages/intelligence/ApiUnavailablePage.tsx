import { Card, PageIntro, UnavailableState } from '@/components/ui'

/** Écran d'intelligence affiché en mode API tant qu'aucun moteur réel ne l'alimente. */
export function ApiUnavailablePage({ title, description, message }: { title: string; description: string; message: string }) {
  return (
    <div className="page">
      <PageIntro title={title} description={description} />
      <Card><UnavailableState message={message} /></Card>
    </div>
  )
}
