import { productStatus, suggestedReorder } from '@/lib/domain'
import { formatFCCompact, normalizeText } from '@/lib/format'
import type { DemoState } from './store'
import { marginByCategory, seedPredictedDemand } from './seed'

export interface AssistantCard {
  title: string
  badge: string
  tone: 'danger' | 'warning' | 'success' | 'info'
  facts: [string, string][]
  action?: { label: string; to: string }
}

export interface AssistantAnswer {
  text: string
  highlight?: string
  cards: AssistantCard[]
  note?: string
}

type Intent = 'stock' | 'ventes' | 'previsions' | 'anomalies' | 'rentabilite'

const keywords: Record<Intent, string[]> = {
  stock: ['stock', 'reapprovision', 'rupture', 'inventaire', 'commander'],
  ventes: ['vente', 'chiffre', 'commande', 'client'],
  previsions: ['prevoi', 'prevision', 'futur', 'prochain', 'anticip'],
  anomalies: ['anomal', 'inhabituel', 'fraude', 'suspect', 'variation'],
  rentabilite: ['rentab', 'marge', 'profit', 'benefice'],
}

function detectIntent(question: string): Intent | null {
  const q = normalizeText(question)
  // Les prévisions priment sur « chiffre d'affaires » quand les deux apparaissent.
  const order: Intent[] = ['previsions', 'anomalies', 'rentabilite', 'stock', 'ventes']
  return order.find(intent => keywords[intent].some(k => q.includes(k))) ?? null
}

/**
 * Assistant du mode démonstration : il ne s'appuie sur aucun modèle d'IA.
 * Les réponses sont calculées par règles à partir des données de démonstration chargées.
 */
export function answerQuestion(question: string, state: DemoState): AssistantAnswer {
  const intent = detectIntent(question)

  if (intent === 'stock') {
    const risky = state.products
      .filter(p => productStatus(p) !== 'Actif' || (seedPredictedDemand[p.sku] ?? 0) > p.stock)
      .sort((a, b) => a.stock / Math.max(a.minStock, 1) - b.stock / Math.max(b.minStock, 1))
      .slice(0, 3)
    if (risky.length === 0) return { text: 'Aucun produit ne présente de risque de rupture selon les données actuelles.', cards: [] }
    const protectedValue = risky.reduce((sum, p) => sum + Math.max((seedPredictedDemand[p.sku] ?? 0) - p.stock, 0) * p.price, 0)
    return {
      text: `J’ai comparé le stock de chaque référence à sa demande prévue sur 30 jours.`,
      highlight: `${risky.length} produit${risky.length > 1 ? 's nécessitent' : ' nécessite'} votre attention.`,
      cards: risky.map(p => ({
        title: p.name,
        badge: p.stock <= 0 ? 'Critique' : p.stock < p.minStock ? 'Élevé' : 'Moyen',
        tone: p.stock <= 0 || p.stock < p.minStock / 2 ? 'danger' : 'warning',
        facts: [['Stock', String(p.stock)], ['Prévision', String(seedPredictedDemand[p.sku] ?? '—')]],
        action: { label: 'Réapprovisionner', to: `/flux/reorder?sku=${p.sku}&qte=${suggestedReorder(p, seedPredictedDemand[p.sku] ?? p.minStock)}` },
      })),
      note: protectedValue > 0 ? `Commander maintenant permettrait de couvrir environ ${formatFCCompact(protectedValue)} de ventes prévues.` : undefined,
    }
  }

  if (intent === 'ventes') {
    const confirmed = state.orders.filter(o => o.status !== 'Brouillon')
    const total = confirmed.reduce((sum, o) => sum + o.total, 0)
    const byCustomer = new Map<string, number>()
    confirmed.forEach(o => byCustomer.set(o.customerName, (byCustomer.get(o.customerName) ?? 0) + o.total))
    const top = [...byCustomer.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
    return {
      text: `Les ${confirmed.length} commandes confirmées représentent ${formatFCCompact(total)}. Voici les clients qui pèsent le plus :`,
      cards: top.map(([name, value], i) => ({
        title: name, badge: `#${i + 1}`, tone: 'info',
        facts: [['Montant', formatFCCompact(value)], ['Part', `${Math.round((value / total) * 100)} %`]],
        action: { label: 'Voir les commandes', to: `/ventes?q=${encodeURIComponent(name)}` },
      })),
    }
  }

  if (intent === 'previsions') {
    return {
      text: 'D’après la projection de démonstration, les ventes devraient atteindre 1 284 unités en octobre (+14,2 %), avec un intervalle de confiance de 1 175 à 1 390 unités.',
      cards: [{
        title: 'Octobre 2026', badge: 'Confiance 87 %', tone: 'info',
        facts: [['Ventes prévues', '1 284'], ['CA prévu', 'FC 74,8 M']],
        action: { label: 'Ouvrir les prévisions', to: '/previsions' },
      }],
    }
  }

  if (intent === 'anomalies') {
    const open = state.anomalies.filter(a => a.status === 'À examiner' || a.status === 'Sous surveillance')
    return {
      text: open.length ? `${open.length} anomalie${open.length > 1 ? 's restent' : ' reste'} à examiner :` : 'Aucune anomalie ouverte pour le moment.',
      cards: open.map(a => ({
        title: a.title, badge: `Importance ${a.severity.toLowerCase()}`, tone: a.severity === 'Élevée' ? 'danger' : 'warning',
        facts: [['Actuel', a.current], ['Habituel', a.usual]],
        action: { label: 'Examiner', to: '/anomalies' },
      })),
    }
  }

  if (intent === 'rentabilite') {
    const best = marginByCategory.slice(0, 3)
    return {
      text: 'Voici les catégories qui dégagent la meilleure marge brute moyenne :',
      cards: best.map((c, i) => ({
        title: c.name, badge: `#${i + 1}`, tone: 'success',
        facts: [['Marge', `${c.margin} %`], ['Rang', String(i + 1)]],
        action: { label: 'Voir la rentabilité', to: '/rentabilite' },
      })),
    }
  }

  return {
    text: 'Je ne sais répondre en mode démonstration qu’aux questions portant sur les stocks, les ventes, les prévisions, les anomalies ou la rentabilité. Essayez l’une des suggestions.',
    cards: [],
  }
}
