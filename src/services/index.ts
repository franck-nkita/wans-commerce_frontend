/**
 * Point d'entrée unique de l'accès aux données. Les composants n'importent jamais
 * directement le magasin de démonstration ni le client HTTP.
 *
 * Chaque service a deux implémentations, choisies par VITE_DATA_SOURCE :
 * - `demo` : magasin local de démonstration (ci-dessous) ;
 * - `api`  : backend Django (./apiAdapters.ts).
 * Les fonctions sans source de données réelle lèvent une erreur explicite en mode API.
 */
import type {
  CompanyProfile, Customer, CustomerStats, CustomerType, DashboardPeriod, InventoryStats, MemberRole, MembershipStatus, Order,
  OrderLine, OrderStatus, Payment, PaymentMethod, PaymentStats, Product, Report, ReportFormat, ReportPeriod, ReportType, Restock,
  SalesStats, StockAlert, TeamMember, Warehouse, WarehouseStatus,
} from '@/types/domain'
import { orderTotals, productStatus, stockLevel, suggestedReorder, type StockLevel } from '@/lib/domain'
import { matchesQuery, todayISO } from '@/lib/format'
import { dataSource, demoLatencyMs } from './config'
import { apiServices, type TableRows } from './apiAdapters'
import { session } from './session'
import { demoStore, readCompany, writeCompany } from './demo/store'
import {
  dashboardSummary, forecastTrend, marginByCategory, monthlyAnalytics, performanceRadar, revenueByPeriod,
  salesTrend, seedCategories, seedPredictedDemand, seedSuppliers, type Anomaly, type Recommendation,
} from './demo/seed'
import { answerQuestion, type AssistantAnswer } from './demo/assistant'

export type { Anomaly, Recommendation, AssistantAnswer }
export { session } from './session'

/** Erreur métier affichable telle quelle à l'utilisateur. */
export class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DomainError'
  }
}

const useApi = dataSource === 'api'

async function run<T>(operation: () => T): Promise<T> {
  if (demoLatencyMs > 0) await new Promise(resolve => setTimeout(resolve, demoLatencyMs))
  return structuredClone(operation())
}

/** Fonction sans donnée réelle côté serveur : erreur explicite plutôt que des chiffres simulés. */
function unavailable(feature: string): Promise<never> {
  return Promise.reject(new DomainError(`${feature} n’est pas disponible avec l’API : aucune donnée réelle ne l’alimente encore.`))
}

/* ------------------------- Notification des modifications ------------------------- */

const apiListeners = new Set<() => void>()
const notifyChange = () => apiListeners.forEach(listener => listener())

/** Exécute une écriture côté API puis prévient les écrans (rechargement silencieux des listes). */
async function mutate<T>(operation: () => Promise<T>): Promise<T> {
  const result = await operation()
  notifyChange()
  return result
}

const nextId = (prefix: string, existing: string[], width = 4) => {
  const max = existing.reduce((acc, id) => {
    const n = Number(id.replace(/\D/g, ''))
    return Number.isFinite(n) && n > acc ? n : acc
  }, 0)
  return `${prefix}${String(max + 1).padStart(width, '0')}`
}

const warehouseName = (id: string) => demoStore.read().warehouses.find(w => w.id === id)?.name ?? id

/* ---------------------------------- Produits --------------------------------- */

export interface ProductInput {
  name: string
  sku: string
  category: string
  brand: string
  description: string
  purchasePrice: number
  price: number
  stock: number
  minStock: number
  warehouseId: string
  supplier: string
  imageName?: string
}

export const productsService = {
  list: (): Promise<Product[]> => useApi ? apiServices.products.list() : run(() => demoStore.read().products),
  categories: (): Promise<string[]> => useApi ? apiServices.products.categories() : run(() => seedCategories),
  suppliers: (): Promise<string[]> => useApi ? apiServices.products.suppliers() : run(() => seedSuppliers),
  create: (input: ProductInput): Promise<Product> => {
    if (useApi) {
      const { imageName: _imageName, ...payload } = input
      return mutate(() => apiServices.products.create(payload))
    }
    return run(() => {
      const { products } = demoStore.read()
      const sku = input.sku.trim().toUpperCase()
      if (products.some(p => p.sku === sku)) throw new DomainError(`La référence ${sku} existe déjà dans le catalogue.`)
      const product: Product = { ...input, sku, name: input.name.trim(), performance: 'Stable' }
      demoStore.update(draft => {
        draft.products.unshift(product)
        const warehouse = draft.warehouses.find(w => w.id === input.warehouseId)
        if (warehouse) {
          warehouse.skus += 1
          warehouse.stockValue += input.stock * input.purchasePrice
        }
      })
      return product
    })
  },
}

/* ---------------------------------- Clients ---------------------------------- */

export interface CustomerInput {
  name: string
  phone: string
  email: string
  address: string
  city: string
  company: string
  type: CustomerType
  notes: string
}

export const customersService = {
  list: (): Promise<Customer[]> => useApi ? apiServices.customers.list() : run(() => demoStore.read().customers),
  create: (input: CustomerInput): Promise<Customer> => {
    if (useApi) return mutate(() => apiServices.customers.create(input))
    return run(() => {
      const { customers } = demoStore.read()
      const email = input.email.trim().toLowerCase()
      if (email && customers.some(c => c.email.toLowerCase() === email)) {
        throw new DomainError('Un client utilise déjà cette adresse e-mail.')
      }
      const customer: Customer = {
        ...input, email, id: nextId('CLI-', customers.map(c => c.id)), country: 'RDC', tier: 'Argent',
        spent: 0, orders: 0, joined: todayISO(),
      }
      demoStore.update(draft => { draft.customers.unshift(customer) })
      return customer
    })
  },
}

/* --------------------------------- Commandes --------------------------------- */

export interface OrderInput {
  customerId: string
  lines: OrderLine[]
  discountPct: number
  paymentMethod: PaymentMethod
  warehouseId: string
  notes: string
  date: string
}

/** brouillon : aucun mouvement de stock ; vente : stock décrémenté ; transaction : vente + règlement immédiat. */
export type OrderMode = 'brouillon' | 'vente' | 'transaction'

const statusByMode: Record<OrderMode, OrderStatus> = { brouillon: 'Brouillon', vente: 'En traitement', transaction: 'Livrée' }

function demoAmountDue(orderId: string) {
  const state = demoStore.read()
  const order = state.orders.find(o => o.id === orderId)
  if (!order || order.status === 'Brouillon' || order.status === 'Annulée') return 0
  const paid = state.payments.filter(p => p.orderId === orderId && p.status === 'Réglé').reduce((sum, p) => sum + p.amount, 0)
  return Math.max(order.total - paid, 0)
}

export const ordersService = {
  list: (): Promise<Order[]> => useApi
    ? apiServices.orders.list()
    : run(() => demoStore.read().orders.map(o => ({ ...o, amountDue: demoAmountDue(o.id) }))),
  /** `idempotencyKey` : identifiant unique de la saisie ; un renvoi (double clic, réseau) ne crée pas de doublon côté API. */
  create: (input: OrderInput, mode: OrderMode, idempotencyKey?: string): Promise<Order> => {
    if (useApi) return mutate(() => apiServices.orders.create({ ...input }, mode, idempotencyKey))
    return run(() => {
      const state = demoStore.read()
      const customer = state.customers.find(c => c.id === input.customerId)
      if (!customer) throw new DomainError('Sélectionnez un client existant.')
      if (input.lines.length === 0) throw new DomainError('Ajoutez au moins un produit.')
      if (mode !== 'brouillon') {
        for (const line of input.lines) {
          const product = state.products.find(p => p.sku === line.sku)
          if (!product) throw new DomainError(`Produit introuvable : ${line.name}.`)
          if (product.stock < line.quantity) {
            throw new DomainError(`Stock insuffisant pour « ${product.name} » : ${product.stock} disponible(s), ${line.quantity} demandé(s).`)
          }
        }
      }
      const { total } = orderTotals(input.lines, input.discountPct)
      const order: Order = {
        id: nextId('CMD-', state.orders.map(o => o.id), 5),
        customerId: customer.id, customerName: customer.name, lines: input.lines, discountPct: input.discountPct,
        total, status: statusByMode[mode], date: input.date, paymentMethod: input.paymentMethod,
        warehouseId: input.warehouseId, notes: input.notes,
      }
      demoStore.update(draft => {
        draft.orders.unshift(order)
        if (mode === 'brouillon') return
        for (const line of input.lines) {
          const product = draft.products.find(p => p.sku === line.sku)
          if (product) product.stock -= line.quantity
        }
        const c = draft.customers.find(x => x.id === customer.id)
        if (c) { c.orders += 1; c.spent += total }
        if (mode === 'transaction') {
          draft.payments.unshift({
            id: nextId('PAI-', draft.payments.map(p => p.id), 5), reference: `TXN-${order.id.slice(4)}`,
            customerId: customer.id, customerName: customer.name, orderId: order.id, amount: total, currency: 'CDF',
            method: input.paymentMethod, institution: '—', status: 'Réglé', date: `${input.date}T${new Date().toTimeString().slice(0, 5)}:00`, notes: '',
          })
        }
      })
      return order
    })
  },
}

/* --------------------------------- Inventaire -------------------------------- */

export interface InventoryItem {
  sku: string
  name: string
  warehouseId: string
  warehouseName: string
  quantity: number
  minStock: number
  predicted: number
  value: number
  level: StockLevel
  plannedRestock: number
}

function buildInventory(): InventoryItem[] {
  const { products, restocks } = demoStore.read()
  return products.map(p => ({
    sku: p.sku, name: p.name, warehouseId: p.warehouseId, warehouseName: warehouseName(p.warehouseId),
    quantity: p.stock, minStock: p.minStock, predicted: seedPredictedDemand[p.sku] ?? p.minStock,
    value: p.stock * p.price, level: stockLevel(p),
    plannedRestock: restocks.filter(r => r.sku === p.sku).reduce((sum, r) => sum + r.quantity, 0),
  }))
}

function buildAlerts(): StockAlert[] {
  return demoStore.read().products
    .filter(p => productStatus(p) !== 'Actif')
    .map(p => {
      const qty = suggestedReorder(p, seedPredictedDemand[p.sku] ?? p.minStock)
      return {
        sku: p.sku, product: p.name, warehouseId: p.warehouseId, current: p.stock, minimum: p.minStock,
        level: p.stock <= 0 ? 'Rupture imminente' : 'Sous le stock minimum',
        action: p.stock <= 0 ? `Commande urgente de ${qty} unités` : `Commander ${qty} unités`,
      } satisfies StockAlert
    })
    .sort((a, b) => a.current / a.minimum - b.current / b.minimum)
}

export interface RestockInput {
  sku: string
  warehouseId: string
  quantity: number
  supplier: string
  expectedDate: string
  notes: string
}

export const inventoryService = {
  list: (): Promise<InventoryItem[]> => useApi ? apiServices.inventory.list() : run(buildInventory),
  alerts: (): Promise<StockAlert[]> => useApi ? apiServices.inventory.alerts() : run(buildAlerts),
  createRestock: (input: RestockInput): Promise<Restock> => {
    if (useApi) return mutate(() => apiServices.inventory.createRestock(input))
    return run(() => {
      const state = demoStore.read()
      if (!state.products.some(p => p.sku === input.sku)) throw new DomainError('Produit introuvable.')
      const restock: Restock = { ...input, id: nextId('REA-', state.restocks.map(r => r.id)), createdAt: new Date().toISOString() }
      demoStore.update(draft => { draft.restocks.unshift(restock) })
      return restock
    })
  },
}

/* --------------------------------- Entrepôts --------------------------------- */

export interface WarehouseInput {
  name: string
  city: string
  manager: string
  capacity: number
  status: WarehouseStatus
}

export const warehousesService = {
  list: (): Promise<Warehouse[]> => useApi ? apiServices.warehouses.list() : run(() => demoStore.read().warehouses),
  create: (input: WarehouseInput): Promise<Warehouse> => {
    if (useApi) return mutate(() => apiServices.warehouses.create(input))
    return run(() => {
      const { warehouses } = demoStore.read()
      if (warehouses.some(w => w.name.toLowerCase() === input.name.trim().toLowerCase())) {
        throw new DomainError('Un entrepôt porte déjà ce nom.')
      }
      const warehouse: Warehouse = {
        ...input, name: input.name.trim(), id: nextId('ENT-', warehouses.map(w => w.id), 3), country: 'RDC',
        used: 0, skus: 0, stockValue: 0,
      }
      demoStore.update(draft => { draft.warehouses.push(warehouse) })
      return warehouse
    })
  },
  update: (id: string, input: WarehouseInput): Promise<Warehouse> => {
    if (useApi) return mutate(() => apiServices.warehouses.update(id, input))
    return run(() => {
      const existing = demoStore.read().warehouses.find(w => w.id === id)
      if (!existing) throw new DomainError('Entrepôt introuvable.')
      if (input.capacity < existing.used) {
        throw new DomainError(`La capacité ne peut pas être inférieure à la surface occupée (${existing.used} m²).`)
      }
      demoStore.update(draft => {
        const w = draft.warehouses.find(x => x.id === id)
        if (w) Object.assign(w, { ...input, name: input.name.trim() })
      })
      return { ...existing, ...input }
    })
  },
}

/* --------------------------------- Paiements --------------------------------- */

export interface PaymentInput {
  customerId: string
  orderId: string
  amount: number
  method: PaymentMethod
  reference: string
  date: string
  notes: string
}

export const paymentsService = {
  list: (): Promise<Payment[]> => useApi ? apiServices.payments.list() : run(() => demoStore.read().payments),
  create: (input: PaymentInput): Promise<Payment> => {
    if (useApi) return mutate(() => apiServices.payments.create(input))
    return run(() => {
      const state = demoStore.read()
      const order = state.orders.find(o => o.id === input.orderId)
      if (!order || order.customerId !== input.customerId) throw new DomainError('La commande sélectionnée n’appartient pas à ce client.')
      const due = demoAmountDue(order.id)
      if (due <= 0) throw new DomainError(`La commande ${order.id} est déjà entièrement réglée.`)
      if (input.amount > due) throw new DomainError(`Le montant dépasse le reste à payer de la commande (${due.toLocaleString('fr-FR')} FC).`)
      if (state.payments.some(p => p.reference.toLowerCase() === input.reference.trim().toLowerCase())) {
        throw new DomainError('Cette référence de transaction a déjà été enregistrée.')
      }
      const payment: Payment = {
        id: nextId('PAI-', state.payments.map(p => p.id), 5), reference: input.reference.trim(), customerId: order.customerId,
        customerName: order.customerName, orderId: order.id, amount: input.amount, currency: 'CDF', method: input.method,
        institution: '—', status: 'Réglé', date: `${input.date}T${new Date().toTimeString().slice(0, 5)}:00`, notes: input.notes,
      }
      demoStore.update(draft => { draft.payments.unshift(payment) })
      return payment
    })
  },
}

/* ---------------------------------- Rapports --------------------------------- */

export interface ReportInput {
  type: ReportType
  period: ReportPeriod
  format: ReportFormat
  from?: string
  to?: string
}

export function describePeriod(input: Pick<ReportInput, 'period' | 'from' | 'to'>) {
  if (input.period === 'Période personnalisée' && input.from && input.to) {
    const fmt = (iso: string) => new Date(iso).toLocaleDateString('fr-FR')
    return `Du ${fmt(input.from)} au ${fmt(input.to)}`
  }
  return input.period
}

/** Lignes d'un rapport : d'après un rapport enregistré (`reportId`) ou une définition (type et période). */
export type ReportRowsQuery = { reportId?: string; type: ReportType; period?: ReportPeriod | string; from?: string; to?: string }

function demoRows(type: ReportType): TableRows {
  const state = demoStore.read()
  switch (type) {
    case 'Rapport des ventes':
      return { columns: ['Commande', 'Client', 'Date', 'Statut', 'Total (FC)'], rows: state.orders.map(o => [o.id, o.customerName, o.date, o.status, o.total]) }
    case 'Rapport des stocks':
      return { columns: ['SKU', 'Produit', 'Entrepôt', 'Stock', 'Minimum'], rows: state.products.map(p => [p.sku, p.name, warehouseName(p.warehouseId), p.stock, p.minStock]) }
    case 'Rapport financier': {
      const settled = state.payments.filter(p => p.status === 'Réglé').reduce((s, p) => s + p.amount, 0)
      const pending = state.payments.filter(p => p.status !== 'Réglé' && p.status !== 'Échoué').reduce((s, p) => s + p.amount, 0)
      const ordered = state.orders.filter(o => o.status !== 'Brouillon').reduce((s, o) => s + o.total, 0)
      return { columns: ['Indicateur', 'Montant (FC)'], rows: [['Commandes confirmées', ordered], ['Encaissements réglés', settled], ['Règlements en attente', pending]] }
    }
    case 'Rapport des clients':
      return { columns: ['ID', 'Client', 'Ville', 'Niveau', 'Commandes', 'Dépenses (FC)'], rows: state.customers.map(c => [c.id, c.name, c.city, c.tier, c.orders, c.spent]) }
    case 'Rapport des produits':
      return { columns: ['SKU', 'Produit', 'Catégorie', 'Prix (FC)', 'Statut'], rows: state.products.map(p => [p.sku, p.name, p.category, p.price, productStatus(p)]) }
    case 'Rapport des paiements':
      return { columns: ['Paiement', 'Client', 'Commande', 'Mode', 'Statut', 'Montant (FC)'], rows: state.payments.map(p => [p.id, p.customerName, p.orderId, p.method, p.status, p.amount]) }
  }
}

export const reportsService = {
  list: (): Promise<Report[]> => useApi ? apiServices.reports.list() : run(() => demoStore.read().reports),
  create: (input: ReportInput): Promise<Report> => {
    if (useApi) return mutate(() => apiServices.reports.create(input))
    return run(() => {
      const { reports } = demoStore.read()
      const report: Report = {
        id: nextId('RAP-', reports.map(r => r.id), 3), name: `${input.type} — ${describePeriod(input)}`,
        type: input.type, period: describePeriod(input), generatedAt: todayISO(), format: input.format,
      }
      demoStore.update(draft => { draft.reports.unshift(report) })
      return report
    })
  },
  /** Lignes tabulaires d'un rapport. En mode API, elles sont calculées par le serveur sur la période demandée. */
  rows: (query: ReportRowsQuery): Promise<TableRows> => {
    if (useApi) {
      return query.reportId
        ? apiServices.reports.rowsOf(query.reportId)
        : apiServices.reports.rows({ type: query.type, period: query.period ?? 'Ce mois', from: query.from, to: query.to })
    }
    return Promise.resolve(demoRows(query.type))
  },
}

/* ------------------------------ Tableau de bord ------------------------------ */

export const dashboardService = {
  summary: () => useApi ? apiServices.dashboard.summary() : run(() => {
    const alerts = buildAlerts().length
    const { availableProducts, ...rest } = dashboardSummary
    return { ...rest, stock: { value: availableProducts, alerts, warehouses: demoStore.read().warehouses.length } }
  }),
  revenue: (period: DashboardPeriod) => useApi ? apiServices.dashboard.revenue(period) : run(() => revenueByPeriod[period] ?? []),
}

/** Indicateurs des en-têtes de pages. En démonstration : valeurs de la maquette Figma. */
export const statsService = {
  sales: (): Promise<SalesStats> => useApi ? apiServices.stats.sales() : run(() => ({
    todayRevenue: 5_400_000, todayRevenueChangePct: 11.3, todayOrders: 184, todayOrdersChangePct: 8.7,
    averageBasket: 284_500, averageBasketChangePct: 6.4, ordersThisQuarter: 24_821,
  })),
  customers: (): Promise<CustomerStats> => useApi ? apiServices.stats.customers() : run(() => ({ total: 8394, platinum: 284, newThisMonth: 142 })),
  inventory: (): Promise<InventoryStats> => useApi ? apiServices.stats.inventory() : run(() => ({
    references: 12_847, stockValue: 127_300_000, lowStock: 47, outOfStock: 12,
  })),
  payments: (): Promise<PaymentStats> => useApi ? apiServices.stats.payments() : run(() => ({
    settledYear: 48_700_000, pendingAmount: 6_200_000, pendingCount: 14, failedAmount: 1_800_000, failedCount: 6,
    activeMethods: 5, averageDelayHours: 1.4,
  })),
}

/* ------------------------------- Intelligence -------------------------------- */

export const analyticsService = {
  salesTrend: () => useApi ? apiServices.analytics.salesTrend() : run(() => salesTrend),
  monthly: () => useApi ? apiServices.analytics.monthly() : run(() => monthlyAnalytics),
  radar: () => useApi ? unavailable('Le radar de performance') : run(() => performanceRadar),
  forecast: () => useApi ? unavailable('La projection par modèle statistique') : run(() => forecastTrend),
  margins: () => useApi ? apiServices.analytics.margins() : run(() => marginByCategory),
}

export const anomaliesService = {
  list: () => useApi ? unavailable('La détection d’anomalies') : run(() => demoStore.read().anomalies),
  setStatus: (id: string, status: Anomaly['status']) => useApi ? unavailable('La détection d’anomalies') : run(() => {
    demoStore.update(draft => {
      const anomaly = draft.anomalies.find(a => a.id === id)
      if (anomaly) anomaly.status = status
    })
    return status
  }),
}

export const recommendationsService = {
  list: () => useApi ? unavailable('Le moteur de recommandations') : run(() => demoStore.read().recommendations),
  setDone: (id: string, done: boolean) => useApi ? unavailable('Le moteur de recommandations') : run(() => {
    demoStore.update(draft => {
      const rec = draft.recommendations.find(r => r.id === id)
      if (rec) rec.done = done
    })
    return done
  }),
}

export const assistantService = {
  ask: (question: string) => useApi ? unavailable('L’assistant IA') : run(() => answerQuestion(question, demoStore.read())),
}

/* ------------------------------ Paramètres ----------------------------------- */

export const settingsService = {
  getCompany: (): Promise<CompanyProfile> => useApi ? apiServices.settings.getCompany() : run(readCompany),
  saveCompany: (profile: CompanyProfile): Promise<CompanyProfile> => {
    if (useApi) return mutate(() => apiServices.settings.saveCompany(profile))
    return run(() => {
      writeCompany(profile)
      return profile
    })
  },
}

/** Équipe de l'entreprise active (mode API uniquement : la démonstration n'a pas de comptes). */
export const teamService = {
  list: (): Promise<TeamMember[]> => useApi ? apiServices.team.list() : unavailable('La gestion de l’équipe'),
  add: (input: { email: string; fullName?: string; role: MemberRole; password?: string }): Promise<TeamMember> =>
    useApi ? mutate(() => apiServices.team.add(input)) : unavailable('La gestion de l’équipe'),
  update: (id: string, patch: { role?: MemberRole; status?: MembershipStatus }): Promise<TeamMember> =>
    useApi ? mutate(() => apiServices.team.update(id, patch)) : unavailable('La gestion de l’équipe'),
}

/* ------------------------- Recherche et notifications ------------------------ */

export interface SearchResult {
  id: string
  kind: 'Produit' | 'Client' | 'Commande' | 'Paiement'
  label: string
  detail: string
  to: string
}

function demoSearch(query: string, limit = 8): SearchResult[] {
  if (query.trim().length < 2) return []
  const state = demoStore.read()
  const q = encodeURIComponent(query.trim())
  const results: SearchResult[] = [
    ...state.products.filter(p => matchesQuery(query, p.name, p.sku, p.category))
      .map(p => ({ id: p.sku, kind: 'Produit' as const, label: p.name, detail: p.sku, to: `/produits?q=${q}` })),
    ...state.customers.filter(c => matchesQuery(query, c.name, c.city, c.id))
      .map(c => ({ id: c.id, kind: 'Client' as const, label: c.name, detail: c.city, to: `/clients?q=${q}` })),
    ...state.orders.filter(o => matchesQuery(query, o.id, o.customerName))
      .map(o => ({ id: o.id, kind: 'Commande' as const, label: o.id, detail: o.customerName, to: `/ventes?q=${q}` })),
    ...state.payments.filter(p => matchesQuery(query, p.id, p.reference, p.customerName))
      .map(p => ({ id: p.id, kind: 'Paiement' as const, label: p.id, detail: p.customerName, to: `/paiements?q=${q}` })),
  ]
  return results.slice(0, limit)
}

/** Recherche transversale (produits, clients, commandes, paiements), limitée à l'entreprise active en mode API. */
export function searchAll(query: string): Promise<SearchResult[]> {
  if (query.trim().length < 2) return Promise.resolve([])
  return useApi ? apiServices.search(query.trim()) : Promise.resolve(demoSearch(query))
}

export interface AppNotification {
  id: string
  tone: 'danger' | 'warning' | 'info'
  title: string
  text: string
  to: string
}

function demoNotifications(): AppNotification[] {
  const state = demoStore.read()
  return [
    ...buildAlerts().map(a => ({
      id: `stock-${a.sku}`, tone: (a.current <= 0 ? 'danger' : 'warning') as AppNotification['tone'],
      title: a.level, text: `${a.product} : ${a.current} en stock (minimum ${a.minimum}).`, to: '/flux/alerts',
    })),
    ...state.anomalies.filter(a => a.status === 'À examiner').map(a => ({
      id: `anomalie-${a.id}`, tone: 'info' as const, title: a.title, text: a.subject, to: '/anomalies',
    })),
  ]
}

export function notifications(): Promise<AppNotification[]> {
  return useApi ? apiServices.notifications() : Promise.resolve(demoNotifications())
}

export function resetDemoData() {
  demoStore.reset()
}

/** Abonnement aux modifications de données : écritures, réinitialisation de la démonstration, changement d'entreprise. */
export function subscribeToData(listener: () => void) {
  if (!useApi) return demoStore.subscribe(listener)
  apiListeners.add(listener)
  const unsubscribeCompany = session.onCompanyChange(listener)
  return () => { apiListeners.delete(listener); unsubscribeCompany() }
}

/** Anomalies à examiner (démonstration uniquement ; aucune détection n'existe côté serveur). */
export function openAnomaliesCount() {
  return useApi ? 0 : demoStore.read().anomalies.filter(a => a.status === 'À examiner').length
}
