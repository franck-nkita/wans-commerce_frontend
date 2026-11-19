export type ProductStatus = 'Actif' | 'Stock faible' | 'Rupture de stock'
export type DemandTrend = 'Forte demande' | 'En croissance' | 'En baisse' | 'Stable'

export interface Product {
  sku: string
  name: string
  category: string
  brand: string
  description: string
  purchasePrice: number
  price: number
  stock: number
  minStock: number
  warehouseId: string
  supplier: string
  performance: DemandTrend
  imageName?: string
}

export type OrderStatus = 'Livrée' | 'Expédiée' | 'En traitement' | 'En attente' | 'Brouillon' | 'Annulée'

export interface OrderLine {
  sku: string
  name: string
  quantity: number
  unitPrice: number
}

export interface Order {
  id: string
  customerId: string
  customerName: string
  lines: OrderLine[]
  discountPct: number
  total: number
  status: OrderStatus
  date: string
  paymentMethod: PaymentMethod
  warehouseId: string
  notes: string
  /** Reste à payer, calculé par le serveur (mode API) ou par le magasin de démonstration. */
  amountDue?: number
}

export type CustomerTier = 'Platine' | 'Or' | 'Argent'
export type CustomerType = 'Entreprise' | 'Grossiste' | 'Détaillant' | 'Particulier'

export interface Customer {
  id: string
  name: string
  phone: string
  email: string
  address: string
  city: string
  country: string
  company: string
  type: CustomerType
  tier: CustomerTier
  spent: number
  orders: number
  joined: string
  notes: string
}

export type WarehouseStatus = 'Opérationnel' | 'Presque saturé' | 'En maintenance'

export interface Warehouse {
  id: string
  name: string
  city: string
  country: string
  capacity: number
  used: number
  skus: number
  stockValue: number
  manager: string
  status: WarehouseStatus
}

export const paymentMethods = ['Espèces', 'Mobile Money', 'Carte bancaire', 'Virement bancaire', 'Autre'] as const
export type PaymentMethod = (typeof paymentMethods)[number]
export type PaymentStatus = 'Réglé' | 'En attente' | 'En traitement' | 'Échoué'

export interface Payment {
  id: string
  reference: string
  customerId: string
  customerName: string
  orderId: string
  amount: number
  currency: 'CDF'
  method: PaymentMethod
  institution: string
  status: PaymentStatus
  date: string
  notes: string
}

export interface Restock {
  id: string
  sku: string
  warehouseId: string
  quantity: number
  supplier: string
  expectedDate: string
  notes: string
  createdAt: string
}

export const reportTypes = [
  'Rapport des ventes',
  'Rapport des stocks',
  'Rapport financier',
  'Rapport des clients',
  'Rapport des produits',
  'Rapport des paiements',
] as const
export type ReportType = (typeof reportTypes)[number]

export const reportPeriods = ["Aujourd'hui", 'Cette semaine', 'Ce mois', 'Ce trimestre', 'Cette année', 'Période personnalisée'] as const
export type ReportPeriod = (typeof reportPeriods)[number]

export const reportFormats = ['PDF', 'Excel', 'CSV'] as const
export type ReportFormat = (typeof reportFormats)[number]

export interface Report {
  id: string
  name: string
  type: ReportType
  period: string
  generatedAt: string
  format: ReportFormat
}

export interface StockAlert {
  sku: string
  product: string
  warehouseId: string
  current: number
  minimum: number
  level: 'Rupture imminente' | 'Sous le stock minimum'
  action: string
}

export interface CompanyProfile {
  companyName: string
  product: string
  market: string
  activity: string
  taxId: string
  timezone: string
}

export type DashboardPeriod = '7 jours' | '30 jours' | '3 mois' | '6 mois' | '1 an'

export interface RevenuePoint {
  label: string
  current: number
  previous: number
}

/* ------------------------- Comptes, entreprises, équipe (mode API) ------------------------- */

export type MemberRole = 'owner' | 'admin' | 'manager' | 'seller' | 'viewer'
export type MembershipStatus = 'active' | 'suspended'

export interface CompanyMembership {
  id: string
  role: MemberRole
  roleLabel: string
  status: MembershipStatus
  company: { id: string; name: string; isActive: boolean }
}

export interface SessionUser {
  id: string
  email: string
  fullName: string
  initials: string
  memberships: CompanyMembership[]
}

export interface TeamMember {
  id: string
  email: string
  fullName: string
  role: MemberRole
  roleLabel: string
  status: MembershipStatus
  joinedAt: string
}

/** Indicateurs des en-têtes de pages (Ventes, Clients, Stocks, Paiements). `null` : non calculable. */
export interface SalesStats {
  todayRevenue: number
  todayRevenueChangePct: number | null
  todayOrders: number
  todayOrdersChangePct: number | null
  averageBasket: number
  averageBasketChangePct: number | null
  ordersThisQuarter: number
}

export interface CustomerStats { total: number; platinum: number; newThisMonth: number }

export interface InventoryStats { references: number; stockValue: number; lowStock: number; outOfStock: number }

export interface PaymentStats {
  settledYear: number
  pendingAmount: number
  pendingCount: number
  failedAmount: number
  failedCount: number
  activeMethods: number
  /** Délai moyen de traitement en heures ; non mesuré par le backend (null). */
  averageDelayHours: number | null
}
