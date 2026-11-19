import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Badge, Button, Card, Heading, Icon, PageIntro, Popover, TextInput, type IconName } from '@/components/ui'
import { errorMessage } from '@/hooks/useAsync'
import { assistantService, type AssistantAnswer } from '@/services'
import { isDemo } from '@/services/config'
import { ApiUnavailablePage } from './ApiUnavailablePage'

interface Exchange { id: number; question: string; answer?: AssistantAnswer; error?: string }

const suggestions: [string, IconName][] = [
  ['Analyse mes ventes', 'chart'], ['Prévois mon chiffre d’affaires', 'forecast'], ['Vérifie mon stock', 'stock'],
  ['Trouve les anomalies', 'alert'], ['Analyse ma rentabilité', 'wallet'],
]

const sources = [['Ventes', '24 821 transactions'], ['Produits', '8 394 références'], ['Stocks', '4 entrepôts'], ['Clients', '2 146 comptes']]

const FIRST_QUESTION = 'Quels produits dois-je réapprovisionner ?'

type AnswerCard = AssistantAnswer['cards'][number]

function AnswerCardView({ card, primary, onOpen }: { card: AnswerCard; primary: boolean; onOpen: (to: string) => void }) {
  const action = card.action
  return (
    <div>
      <div><strong>{card.title}</strong><Badge tone={card.tone}>{card.badge}</Badge></div>
      {card.facts.map(([label, value]) => <span key={label}>{label} <b>{value}</b></span>)}
      {action && <Button variant={primary ? 'primary' : 'secondary'} onClick={() => onOpen(action.to)}>{action.label}</Button>}
    </div>
  )
}

function AssistantPageDemo() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [pending, setPending] = useState(false)
  const counter = useRef(0)
  const endRef = useRef<HTMLDivElement>(null)

  const ask = async (question: string) => {
    const text = question.trim()
    if (!text || pending) return
    const id = ++counter.current
    setExchanges(list => [...list, { id, question: text }])
    setPending(true)
    try {
      const answer = await assistantService.ask(text)
      setExchanges(list => list.map(e => (e.id === id ? { ...e, answer } : e)))
    } catch (error) {
      setExchanges(list => list.map(e => (e.id === id ? { ...e, error: errorMessage(error) } : e)))
    } finally {
      setPending(false)
    }
  }

  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    void ask(FIRST_QUESTION)
  })

  useEffect(() => { endRef.current?.scrollIntoView?.({ block: 'end', behavior: 'smooth' }) }, [exchanges])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void ask(query)
    setQuery('')
  }

  return (
    <div className="page assistant-page">
      <PageIntro title="Assistant IA" description="Analysez votre entreprise avec vos données." />
      <div className="assistant-layout">
        <Card className="conversation">
          <div className="conversation-head">
            <div>
              <span className="assistant-avatar"><Icon name="sparkles" /></span>
              <div><strong>WANS Intelligence</strong><span><span><i /> {isDemo ? 'Mode démonstration · réponses calculées localement' : 'En ligne · Données actualisées'}</span></span></div>
            </div>
            <Popover trigger={props => (
              <Button variant="ghost" className="icon-button-plain" onClick={props.toggle} aria-expanded={props['aria-expanded']} aria-haspopup="true" aria-label="Options de la conversation"><Icon name="more" /></Button>
            )}>
              {close => (
                <div className="menu" role="menu">
                  <button type="button" role="menuitem" className="menu-item" onClick={() => { close(); setExchanges([]) }} disabled={pending}><Icon name="trash" className="h-4 w-4" />Effacer la conversation</button>
                </div>
              )}
            </Popover>
          </div>

          <div className="messages" role="log" aria-live="polite" aria-label="Conversation">
            {exchanges.length === 0 && <p className="messages-empty">Posez une question ou choisissez une suggestion.</p>}
            {exchanges.map(exchange => (
              <div key={exchange.id} className="exchange">
                <div className="user-message">{exchange.question}</div>
                <div className="assistant-message">
                  <span className="assistant-avatar" aria-hidden="true"><Icon name="sparkles" /></span>
                  <div>
                    {!exchange.answer && !exchange.error && <p className="typing" role="status">Analyse en cours…</p>}
                    {exchange.error && <p className="danger-text" role="alert">{exchange.error}</p>}
                    {exchange.answer && (
                      <>
                        <p>{exchange.answer.text} {exchange.answer.highlight && <strong>{exchange.answer.highlight}</strong>}</p>
                        {exchange.answer.cards.length > 0 && (
                          <div className="answer-cards">
                            {exchange.answer.cards.map((card, i) => <AnswerCardView key={card.title} card={card} primary={i === 0} onOpen={navigate} />)}
                          </div>
                        )}
                        {exchange.answer.note && <div className="ai-note"><Icon name="bulb" className="h-4 w-4" />{exchange.answer.note}</div>}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <form className="composer" onSubmit={submit}>
            <label className="sr-only" htmlFor="assistant-question">Votre question</label>
            <TextInput id="assistant-question" value={query} onChange={e => setQuery(e.target.value)} placeholder="Posez une question sur votre entreprise…" autoComplete="off" />
            <Button type="submit" aria-label="Envoyer" disabled={!query.trim() || pending}><Icon name="send" className="h-5 w-5" /></Button>
          </form>
          <div className="disclaimer">
            {isDemo
              ? 'Mode démonstration : aucune IA n’est interrogée. Les réponses sont calculées par règles à partir des données de démonstration.'
              : 'Les analyses sont générées à partir des données disponibles dans WANS COMMERCE.'}
          </div>
        </Card>

        <aside className="assistant-aside">
          <Card>
            <Heading level={3}>Suggestions</Heading>
            <p>Questions fréquentes pour commencer.</p>
            {suggestions.map(([label, icon]) => (
              <Button key={label} variant="ghost" onClick={() => void ask(label)} disabled={pending}>
                <Icon name={icon} /><span>{label}</span><Icon name="chevron" className="h-4 w-4" />
              </Button>
            ))}
          </Card>
          <Card>
            <Heading level={3}>Sources analysées</Heading>
            {sources.map(([title, detail]) => (
              <div className="source-row" key={title}>
                <span><Icon name="check" className="h-3 w-3" /></span>
                <div><strong>{title}</strong><small>{detail}</small></div>
              </div>
            ))}
          </Card>
        </aside>
      </div>
    </div>
  )
}

export default function AssistantPage() {
  return isDemo
    ? <AssistantPageDemo />
    : <ApiUnavailablePage title="Assistant IA" description="Analysez votre entreprise avec vos données."
      message="L’assistant IA n’est pas encore relié à un modèle ni à vos données. Aucune réponse simulée n’est affichée." />
}
