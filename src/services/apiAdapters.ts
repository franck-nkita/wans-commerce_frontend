/**
 * Implémentation « API » des services : appels au backend Django et conversion des réponses vers les types
 * de `src/types/domain.ts`. Contrat de référence : docs/API_CONTRACT.md.
 */
import type {
  CompanyProfile, Customer, CustomerStats, DashboardPeriod, InventoryStats, MemberRole, MembershipStatus, Order, OrderLine, Payment,
  PaymentStats, Product, Report, Restock, RevenuePoint, SalesStats, StockAlert, TeamMember, Warehouse,
} from '@/types/domain'
import { formatChange } from '@/lib/format'
import { api, fetchAll } from './http'

const enc = encodeURIComponent

/** Les graphiques du frontend sont exprimés en millions de FC. */
const toMillions = (value: number) => Math.round(value / 1000) / 1000

const periodKeys: Record<DashboardPeriod, string> = { '7 jours': '7j', '30 jours': '30j', '3 mois': '3m', '6 mois': '6m', '1 an': '1a' }

interface ApiSummary {
  revenue: { value: number; changePct: number | null }
  sales: { value: number; changePct: number | null }
  orders: { value: number; changePct: number | null; processing: number }
  stock: { value: number; alerts: number; warehouses: number }
}

export interface InventoryItemDto {
  sku: string; name: string; warehouseId: string; warehouseName: string; quantity: number; minStock: number
  predicted: number; value: number; level: 'Optimal' | 'Faible' | 'Critique'; plannedRestock: number
}

export interface SearchResultDto { id: string; kind: 'Produit' | 'Client' | 'Commande' | 'Paiement'; label: string; detail: string; to: string }
export interface NotificationDto { id: string; tone: 'danger' | 'warning' | 'info'; title: string; text: string; to: string }
export interface TableRows { columns: string[]; rows: (string | number)[][] }

export const apiServices = {
  products: {
    list: () => fetchAll<Product>('/products/'),
    categories: () => api.get<string[]>('/categories/'),
    suppliers: () => api.get<string[]>('/suppliers/'),
    create: (input: object) => api.post<Product>('/products/', input),
  },
  customers: {
    list: () => fetchAll<Customer>('/customers/'),
    create: (input: object) => api.post<Customer>('/customers/', input),
  },
  orders: {
    list: () => fetchAll<Order>('/orders/'),
    create: (input: { lines: OrderLine[]; [field: string]: unknown }, mode: string, idempotencyKey?: string) =>
      api.post<Order>('/orders/', {
        ...input, mode, idempotencyKey,
        lines: input.lines.map(({ sku, quantity, unitPrice }) => ({ sku, quantity, unitPrice })),
      }),
  },
  inventory: {
    list: () => fetchAll<InventoryItemDto>('/inventory/'),
    alerts: () => api.get<StockAlert[]>('/inventory/alerts/'),
    createRestock: (input: object) => api.post<Restock>('/restocks/', input),
  },
  warehouses: {
    list: () => fetchAll<Warehouse>('/warehouses/'),
    create: (input: object) => api.post<Warehouse>('/warehouses/', input),
    update: (id: string, input: object) => api.patch<Warehouse>(`/warehouses/${enc(id)}/`, input),
  },
  payments: {
    list: () => fetchAll<Payment>('/payments/'),
    create: (input: object) => api.post<Payment>('/payments/', input),
  },
  reports: {
    list: () => fetchAll<Report>('/reports/'),
    create: (input: object) => api.post<Report>('/reports/', input),
    rows: (input: { type: string; period: string; from?: string; to?: string }) => {
      const params = new URLSearchParams({ type: input.type, period: input.period })
      if (input.period === 'Période personnalisée' && input.from && input.to) {
        params.set('from', input.from)
        params.set('to', input.to)
      }
      return api.get<TableRows>(`/reports/rows/?${params}`)
    },
    rowsOf: (id: string) => api.get<TableRows>(`/reports/${enc(id)}/rows/`),
  },
  dashboard: {
    summary: async () => {
      const s = await api.get<ApiSummary>('/dashboard/summary/?period=30j')
      return {
        revenue: { value: s.revenue.value, change: formatChange(s.revenue.changePct) },
        sales: { value: s.sales.value, change: formatChange(s.sales.changePct) },
        orders: { value: s.orders.value, change: formatChange(s.orders.changePct), processing: s.orders.processing },
        stock: s.stock,
      }
    },
    revenue: async (period: DashboardPeriod): Promise<RevenuePoint[]> => {
      const points = await api.get<RevenuePoint[]>(`/dashboard/revenue/?period=${periodKeys[period]}`)
      return points.map(p => ({ label: p.label, current: toMillions(p.current), previous: toMillions(p.previous) }))
    },
  },
  analytics: {
    salesTrend: async () => {
      const points = await api.get<RevenuePoint[]>('/dashboard/revenue/?period=7j')
      return points.map(p => ({ date: p.label, sales: toMillions(p.current) }))
    },
    monthly: async () => {
      const rows = await api.get<{ month: string; revenue: number; customers: number; orders: number }[]>('/analytics/monthly/')
      return rows.map(r => ({ ...r, revenue: toMillions(r.revenue) }))
    },
    margins: () => api.get<{ name: string; margin: number }[]>('/analytics/margins/'),
  },
  stats: {
    sales: () => api.get<SalesStats>('/stats/sales/'),
    customers: () => api.get<CustomerStats>('/stats/customers/'),
    inventory: () => api.get<InventoryStats>('/stats/inventory/'),
    payments: async (): Promise<PaymentStats> => ({ ...(await api.get<Omit<PaymentStats, 'averageDelayHours'>>('/stats/payments/')), averageDelayHours: null }),
  },
  settings: {
    getCompany: () => api.get<CompanyProfile>('/company/'),
    saveCompany: (profile: CompanyProfile) => api.patch<CompanyProfile>('/company/', profile),
  },
  team: {
    list: () => api.get<TeamMember[]>('/company/members/'),
    add: (input: { email: string; fullName?: string; role: MemberRole; password?: string }) => api.post<TeamMember>('/company/members/', input),
    update: (id: string, patch: { role?: MemberRole; status?: MembershipStatus }) => api.patch<TeamMember>(`/company/members/${enc(id)}/`, patch),
  },
  search: (query: string) => api.get<SearchResultDto[]>(`/search/?q=${enc(query)}`),
  notifications: () => api.get<NotificationDto[]>('/notifications/'),
}
