import type { CompanyProfile, Customer, Order, Payment, Product, Report, Restock, Warehouse } from '@/types/domain'
import {
  defaultCompany, seedAnomalies, seedCustomers, seedOrders, seedPayments, seedProducts,
  seedRecommendations, seedReports, seedWarehouses, type Anomaly, type Recommendation,
} from './seed'

/**
 * Magasin du mode démonstration. Les modifications sont réelles pour la session de l'onglet
 * (elles apparaissent dans les listes) mais ne sont envoyées à aucun serveur.
 */
export interface DemoState {
  products: Product[]
  orders: Order[]
  customers: Customer[]
  warehouses: Warehouse[]
  payments: Payment[]
  reports: Report[]
  restocks: Restock[]
  anomalies: Anomaly[]
  recommendations: Recommendation[]
}

const clone = <T,>(value: T): T => structuredClone(value)

function initialState(): DemoState {
  return {
    products: clone(seedProducts),
    orders: clone(seedOrders),
    customers: clone(seedCustomers),
    warehouses: clone(seedWarehouses),
    payments: clone(seedPayments),
    reports: clone(seedReports),
    restocks: [],
    anomalies: clone(seedAnomalies),
    recommendations: clone(seedRecommendations),
  }
}

/** Les données saisies survivent à un rechargement, jusqu'à la fermeture de l'onglet. */
const SESSION_KEY = 'wans-demo-state-v1'

function restore(): DemoState {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && 'products' in parsed && 'orders' in parsed) return { ...initialState(), ...(parsed as Partial<DemoState>) }
    }
  } catch {
    // Stockage indisponible ou contenu corrompu : on repart des données de démonstration.
  }
  return initialState()
}

function persist(value: DemoState) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(value))
  } catch {
    // Quota dépassé ou navigation privée : les données restent valables en mémoire.
  }
}

let state = restore()
const listeners = new Set<() => void>()

export const demoStore = {
  read: () => state,
  update(mutator: (draft: DemoState) => void) {
    const draft = clone(state)
    mutator(draft)
    state = draft
    persist(state)
    listeners.forEach(listener => listener())
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  },
  reset() {
    state = initialState()
    try { sessionStorage.removeItem(SESSION_KEY) } catch { /* rien à nettoyer */ }
    listeners.forEach(listener => listener())
  },
}

const COMPANY_KEY = 'wans-company-profile'

export function readCompany(): CompanyProfile {
  try {
    const raw = localStorage.getItem(COMPANY_KEY)
    if (!raw) return { ...defaultCompany }
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return { ...defaultCompany, ...(parsed as Partial<CompanyProfile>) }
  } catch {
    // Stockage indisponible ou valeur corrompue : on revient au profil par défaut.
  }
  return { ...defaultCompany }
}

export function writeCompany(profile: CompanyProfile) {
  localStorage.setItem(COMPANY_KEY, JSON.stringify(profile))
}
