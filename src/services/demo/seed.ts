/**
 * Données de démonstration issues des maquettes Figma WANS COMMERCE.
 * Elles ne proviennent d'aucune base réelle et sont signalées comme telles dans l'interface.
 */
import type { CompanyProfile, Customer, Order, Payment, Product, Report, Warehouse } from '@/types/domain'

export const seedWarehouses: Warehouse[] = [
  { id: 'ENT-001', name: 'Centre de distribution de Kinshasa', city: 'Kinshasa', country: 'RDC', capacity: 50000, used: 38420, skus: 4821, stockValue: 48_200_000, manager: 'Patrick Ilunga', status: 'Opérationnel' },
  { id: 'ENT-002', name: 'Centre logistique de Lubumbashi', city: 'Lubumbashi', country: 'RDC', capacity: 30000, used: 18900, skus: 2840, stockValue: 31_700_000, manager: 'Grâce Mutombo', status: 'Opérationnel' },
  { id: 'ENT-003', name: 'Dépôt régional de Goma', city: 'Goma', country: 'RDC', capacity: 25000, used: 22100, skus: 2190, stockValue: 22_400_000, manager: 'David Bahati', status: 'Presque saturé' },
  { id: 'ENT-004', name: 'Centre de Matadi', city: 'Matadi', country: 'RDC', capacity: 20000, used: 9800, skus: 1640, stockValue: 12_800_000, manager: 'Sarah Mbala', status: 'Opérationnel' },
  { id: 'ENT-005', name: 'Centre de Kisangani', city: 'Kisangani', country: 'RDC', capacity: 18000, used: 4200, skus: 890, stockValue: 7_500_000, manager: 'Alain Lombo', status: 'Opérationnel' },
  { id: 'ENT-006', name: 'Dépôt de Kolwezi', city: 'Kolwezi', country: 'RDC', capacity: 12000, used: 1100, skus: 320, stockValue: 4_700_000, manager: 'Aminata Diallo', status: 'En maintenance' },
]

export const seedProducts: Product[] = [
  { sku: 'WC-TX-0041', name: 'Rouleaux de tissu premium (50 m)', category: 'Textile', brand: 'Kano Textile', description: 'Rouleau de tissu premium de 50 mètres.', purchasePrice: 3600, price: 5000, stock: 1842, minStock: 200, warehouseId: 'ENT-001', supplier: 'Kano Textile Co.', performance: 'Forte demande' },
  { sku: 'WC-EL-0098', name: 'Groupe électrogène industriel 20 KVA', category: 'Électronique', brand: 'Surelec', description: 'Groupe électrogène diesel 20 KVA.', purchasePrice: 13200, price: 18000, stock: 428, minStock: 50, warehouseId: 'ENT-002', supplier: 'Surelec Nigeria', performance: 'En croissance' },
  { sku: 'WC-FM-0213', name: 'Huile de palme bio 5 L', category: 'Agroalimentaire', brand: 'Delta Agro', description: 'Bidon de 5 litres d’huile de palme biologique.', purchasePrice: 940, price: 1150, stock: 5210, minStock: 800, warehouseId: 'ENT-004', supplier: 'Delta Agro Farms', performance: 'En baisse' },
  { sku: 'WC-BM-0055', name: 'Sac de ciment Dangote 50 kg', category: 'Matériaux de construction', brand: 'Dangote', description: 'Ciment Portland, sac de 50 kg.', purchasePrice: 930, price: 1200, stock: 3840, minStock: 1000, warehouseId: 'ENT-003', supplier: 'Dangote Group', performance: 'Stable' },
  { sku: 'WC-HC-0310', name: 'Gants d’examen médical (boîte)', category: 'Santé', brand: 'MedPlus', description: 'Boîte de 100 gants d’examen en nitrile.', purchasePrice: 330, price: 450, stock: 8920, minStock: 2000, warehouseId: 'ENT-004', supplier: 'MedPlus Health', performance: 'Stable' },
  { sku: 'WC-EL-0102', name: 'Onduleur solaire 5 KVA', category: 'Électronique', brand: 'Greentech', description: 'Onduleur hybride solaire 5 KVA.', purchasePrice: 5270, price: 8500, stock: 34, minStock: 100, warehouseId: 'ENT-001', supplier: 'Greentech Solar', performance: 'Forte demande' },
  { sku: 'WC-TX-0049', name: 'Tissu Ankara imprimé (5,5 m)', category: 'Textile', brand: 'Accra Prints', description: 'Coupon de wax Ankara de 5,5 mètres.', purchasePrice: 1900, price: 2800, stock: 96, minStock: 150, warehouseId: 'ENT-004', supplier: 'Accra Prints Ltd', performance: 'En croissance' },
  { sku: 'WC-FM-0220', name: 'Nouilles Indomie (carton)', category: 'Agroalimentaire', brand: 'Indomie', description: 'Carton de 40 sachets de nouilles instantanées.', purchasePrice: 2620, price: 3200, stock: 0, minStock: 500, warehouseId: 'ENT-003', supplier: 'Dufil Prima Foods', performance: 'Stable' },
]

/** Demande prévue à 30 jours (unités) par référence. */
export const seedPredictedDemand: Record<string, number> = {
  'WC-TX-0041': 1280, 'WC-EL-0098': 210, 'WC-FM-0213': 2600, 'WC-BM-0055': 2200,
  'WC-HC-0310': 3900, 'WC-EL-0102': 82, 'WC-TX-0049': 141, 'WC-FM-0220': 640,
}

export const seedCustomers: Customer[] = [
  { id: 'CLI-1001', name: 'Grande enseigne de Kinshasa SARL', phone: '+243 81 000 1001', email: 'achats@gek.cd', address: 'Boulevard du 30 Juin', city: 'Kinshasa', country: 'RDC', company: 'Grande enseigne de Kinshasa SARL', type: 'Entreprise', tier: 'Platine', spent: 84_200_000, orders: 142, joined: '2024-01-15', notes: '' },
  { id: 'CLI-1002', name: 'Comptoir commercial de Matadi', phone: '+243 81 000 1002', email: 'contact@ccmatadi.cd', address: 'Avenue de la Douane', city: 'Matadi', country: 'RDC', company: 'Comptoir commercial de Matadi', type: 'Grossiste', tier: 'Or', spent: 42_800_000, orders: 87, joined: '2024-03-04', notes: '' },
  { id: 'CLI-1003', name: 'Centre de gros de Goma', phone: '+243 81 000 1003', email: 'gros@cgg.cd', address: 'Avenue du Lac', city: 'Goma', country: 'RDC', company: 'Centre de gros de Goma', type: 'Grossiste', tier: 'Or', spent: 31_500_000, orders: 64, joined: '2024-06-11', notes: '' },
  { id: 'CLI-1004', name: 'Distribution Kolwezi SARL', phone: '+243 81 000 1004', email: 'info@dkolwezi.cd', address: 'Route de Likasi', city: 'Kolwezi', country: 'RDC', company: 'Distribution Kolwezi SARL', type: 'Entreprise', tier: 'Argent', spent: 18_900_000, orders: 38, joined: '2024-09-02', notes: '' },
  { id: 'CLI-1005', name: 'Marché central de Lubumbashi', phone: '+243 81 000 1005', email: 'direction@mcl.cd', address: 'Avenue Mama Yemo', city: 'Lubumbashi', country: 'RDC', company: 'Marché central de Lubumbashi', type: 'Détaillant', tier: 'Platine', spent: 76_400_000, orders: 128, joined: '2024-02-19', notes: '' },
  { id: 'CLI-1006', name: 'Groupe Commerce Kinshasa', phone: '+243 81 000 1006', email: 'compta@gck.cd', address: 'Avenue Kasa-Vubu', city: 'Kinshasa', country: 'RDC', company: 'Groupe Commerce Kinshasa', type: 'Entreprise', tier: 'Argent', spent: 12_100_000, orders: 24, joined: '2024-11-07', notes: '' },
  { id: 'CLI-1007', name: 'Comptoir commercial de Mbuji-Mayi', phone: '+243 81 000 1007', email: 'ventes@ccmm.cd', address: 'Avenue Lumumba', city: 'Mbuji-Mayi', country: 'RDC', company: 'Comptoir commercial de Mbuji-Mayi', type: 'Grossiste', tier: 'Or', spent: 38_700_000, orders: 72, joined: '2024-04-22', notes: '' },
]

function seedOrder(id: string, customerId: string, customerName: string, quantity: number, total: number, status: Order['status'], date: string, paymentMethod: Order['paymentMethod']): Order {
  return {
    id, customerId, customerName, discountPct: 0, total, status, date, paymentMethod, warehouseId: 'ENT-001', notes: '',
    lines: [{ sku: 'LOT', name: 'Lot de marchandises', quantity, unitPrice: Math.round(total / quantity) }],
  }
}

export const seedOrders: Order[] = [
  seedOrder('CMD-20491', 'CLI-1001', 'Grande enseigne de Kinshasa SARL', 12, 1_240_000, 'Livrée', '2026-09-21', 'Virement bancaire'),
  seedOrder('CMD-20490', 'CLI-1005', 'Marché central de Lubumbashi', 8, 875_500, 'Expédiée', '2026-09-21', 'Mobile Money'),
  seedOrder('CMD-20489', 'CLI-1002', 'Comptoir commercial de Matadi', 24, 2_180_000, 'En traitement', '2026-09-20', 'Virement bancaire'),
  seedOrder('CMD-20488', 'CLI-1003', 'Centre de gros de Goma', 5, 540_000, 'Livrée', '2026-09-20', 'Carte bancaire'),
  seedOrder('CMD-20487', 'CLI-1004', 'Distribution Kolwezi SARL', 31, 3_620_000, 'En attente', '2026-09-19', 'Virement bancaire'),
  seedOrder('CMD-20486', 'CLI-1006', 'Groupe Commerce Kinshasa', 9, 980_000, 'En attente', '2026-09-19', 'Mobile Money'),
]

export const seedPayments: Payment[] = [
  { id: 'PAI-91821', reference: 'TXN-84291', customerId: 'CLI-1001', customerName: 'Grande enseigne de Kinshasa SARL', orderId: 'CMD-20491', amount: 1_240_000, currency: 'CDF', method: 'Virement bancaire', institution: 'Rawbank', status: 'Réglé', date: '2026-09-21T09:14:00', notes: '' },
  { id: 'PAI-91820', reference: 'TXN-84290', customerId: 'CLI-1005', customerName: 'Marché central de Lubumbashi', orderId: 'CMD-20490', amount: 875_500, currency: 'CDF', method: 'Mobile Money', institution: 'M-Pesa', status: 'Réglé', date: '2026-09-21T08:42:00', notes: '' },
  { id: 'PAI-91819', reference: 'TXN-84289', customerId: 'CLI-1002', customerName: 'Comptoir commercial de Matadi', orderId: 'CMD-20489', amount: 2_180_000, currency: 'CDF', method: 'Virement bancaire', institution: 'Equity BCDC', status: 'En attente', date: '2026-09-20T17:31:00', notes: '' },
  { id: 'PAI-91818', reference: 'TXN-84288', customerId: 'CLI-1003', customerName: 'Centre de gros de Goma', orderId: 'CMD-20488', amount: 540_000, currency: 'CDF', method: 'Carte bancaire', institution: 'Visa •4821', status: 'Réglé', date: '2026-09-20T14:05:00', notes: '' },
  { id: 'PAI-91817', reference: 'TXN-84287', customerId: 'CLI-1004', customerName: 'Distribution Kolwezi SARL', orderId: 'CMD-20487', amount: 3_620_000, currency: 'CDF', method: 'Virement bancaire', institution: 'Ecobank', status: 'En traitement', date: '2026-09-19T11:22:00', notes: '' },
  { id: 'PAI-91816', reference: 'TXN-84286', customerId: 'CLI-1006', customerName: 'Groupe Commerce Kinshasa', orderId: 'CMD-20486', amount: 980_000, currency: 'CDF', method: 'Mobile Money', institution: 'Orange Money', status: 'Échoué', date: '2026-09-19T09:55:00', notes: '' },
]

export const seedReports: Report[] = [
  { id: 'RAP-006', name: 'Synthèse financière du 3e trimestre 2026', type: 'Rapport financier', period: 'Juil.–sept. 2026', generatedAt: '2026-09-21', format: 'PDF' },
  { id: 'RAP-005', name: 'Rapport d’audit des stocks', type: 'Rapport des stocks', period: 'Sept. 2026', generatedAt: '2026-09-20', format: 'Excel' },
  { id: 'RAP-004', name: 'Analyse de segmentation des clients', type: 'Rapport des clients', period: '3e trim. 2026', generatedAt: '2026-09-18', format: 'PDF' },
  { id: 'RAP-003', name: '50 meilleurs produits par chiffre d’affaires', type: 'Rapport des produits', period: 'Sept. 2026', generatedAt: '2026-09-15', format: 'Excel' },
  { id: 'RAP-002', name: 'Rapport d’utilisation des entrepôts', type: 'Rapport des stocks', period: 'Sept. 2026', generatedAt: '2026-09-14', format: 'PDF' },
  { id: 'RAP-001', name: 'Rapport de rapprochement des paiements', type: 'Rapport des paiements', period: 'Août 2026', generatedAt: '2026-09-01', format: 'Excel' },
]

export const seedSuppliers = ['Congo Supply SARL', 'Kivu Import', 'WANS Distribution', 'Kano Textile Co.', 'Surelec Nigeria', 'Delta Agro Farms', 'Dangote Group', 'MedPlus Health', 'Greentech Solar', 'Accra Prints Ltd', 'Dufil Prima Foods']

export const seedCategories = ['Électronique', 'Textile', 'Agroalimentaire', 'Matériaux de construction', 'Santé']

export const defaultCompany: CompanyProfile = {
  companyName: 'WANS TECH Ltd.',
  product: 'WANS COMMERCE',
  market: 'RDC (Afrique centrale)',
  activity: 'Commerce de gros et distribution B2B',
  taxId: 'RC-1284920',
  timezone: 'Afrique/Kinshasa (UTC+1)',
}

/** Indicateurs consolidés affichés sur la vue générale (valeurs de démonstration Figma). */
export const dashboardSummary = {
  revenue: { value: 68_400_000, change: '+12,4 %' },
  sales: { value: 1248, change: '+8,2 %' },
  orders: { value: 328, change: '+5,7 %', processing: 41 },
  /** Nombre de références disponibles (indicateur consolidé de la maquette). */
  availableProducts: 2481,
}

export const revenueByPeriod: Record<string, { label: string; current: number; previous: number }[]> = {
  '7 jours': [
    { label: 'Lun.', current: 1.8, previous: 1.6 }, { label: 'Mar.', current: 2.1, previous: 1.7 }, { label: 'Mer.', current: 2.0, previous: 1.9 },
    { label: 'Jeu.', current: 2.4, previous: 2.0 }, { label: 'Ven.', current: 2.9, previous: 2.3 }, { label: 'Sam.', current: 3.1, previous: 2.6 },
    { label: 'Dim.', current: 2.2, previous: 2.0 },
  ],
  '30 jours': [
    { label: '01 sept.', current: 3.2, previous: 2.7 }, { label: '05 sept.', current: 3.8, previous: 3.1 },
    { label: '09 sept.', current: 3.5, previous: 3.3 }, { label: '13 sept.', current: 4.6, previous: 3.7 },
    { label: '17 sept.', current: 5.2, previous: 4.1 }, { label: '21 sept.', current: 5.8, previous: 4.6 },
    { label: '25 sept.', current: 6.4, previous: 5.1 }, { label: '30 sept.', current: 7.2, previous: 5.7 },
  ],
  '3 mois': [
    { label: 'Juil.', current: 46.5, previous: 41.2 }, { label: 'Août', current: 52.1, previous: 44.8 }, { label: 'Sept.', current: 68.4, previous: 60.9 },
  ],
  '6 mois': [
    { label: 'Avr.', current: 35.4, previous: 30.1 }, { label: 'Mai', current: 41.8, previous: 35.0 }, { label: 'Juin', current: 39.2, previous: 36.4 },
    { label: 'Juil.', current: 46.5, previous: 41.2 }, { label: 'Août', current: 52.1, previous: 44.8 }, { label: 'Sept.', current: 68.4, previous: 60.9 },
  ],
  '1 an': [
    { label: 'Oct.', current: 24.1, previous: 20.3 }, { label: 'Nov.', current: 26.8, previous: 22.0 }, { label: 'Déc.', current: 31.5, previous: 27.9 },
    { label: 'Janv.', current: 28.4, previous: 24.6 }, { label: 'Févr.', current: 31.2, previous: 26.1 }, { label: 'Mars', current: 27.6, previous: 25.0 },
    { label: 'Avr.', current: 35.4, previous: 30.1 }, { label: 'Mai', current: 41.8, previous: 35.0 }, { label: 'Juin', current: 39.2, previous: 36.4 },
    { label: 'Juil.', current: 46.5, previous: 41.2 }, { label: 'Août', current: 52.1, previous: 44.8 }, { label: 'Sept.', current: 68.4, previous: 60.9 },
  ],
}

export const salesTrend = [
  { date: '15 sept.', sales: 3.2 }, { date: '16 sept.', sales: 4.1 }, { date: '17 sept.', sales: 3.8 },
  { date: '18 sept.', sales: 5.2 }, { date: '19 sept.', sales: 4.7 }, { date: '20 sept.', sales: 6.1 },
  { date: '21 sept.', sales: 5.4 },
]

export const monthlyAnalytics = [
  { month: 'Janv.', revenue: 2840, customers: 620, orders: 1840 },
  { month: 'Févr.', revenue: 3120, customers: 710, orders: 2100 },
  { month: 'Mars', revenue: 2760, customers: 680, orders: 1920 },
  { month: 'Avr.', revenue: 3540, customers: 820, orders: 2380 },
  { month: 'Mai', revenue: 4180, customers: 940, orders: 2840 },
  { month: 'Juin', revenue: 3920, customers: 890, orders: 2640 },
  { month: 'Juil.', revenue: 4650, customers: 1080, orders: 3120 },
  { month: 'Août', revenue: 5210, customers: 1240, orders: 3580 },
  { month: 'Sept.', revenue: 4870, customers: 1140, orders: 3340 },
]

export const performanceRadar = [
  { metric: 'Chiffre d’affaires', value: 88 },
  { metric: 'Satisfaction client', value: 94 },
  { metric: 'Taux de service', value: 92 },
  { metric: 'Exactitude des commandes', value: 97 },
  { metric: 'Délai de livraison', value: 78 },
  { metric: 'Taux de retour', value: 85 },
]

export const forecastTrend = [
  { month: 'Avr.', actual: 820, forecast: null, low: null, high: null },
  { month: 'Mai', actual: 910, forecast: null, low: null, high: null },
  { month: 'Juin', actual: 980, forecast: null, low: null, high: null },
  { month: 'Juil.', actual: 1080, forecast: null, low: null, high: null },
  { month: 'Août', actual: 1130, forecast: 1130, low: 1130, high: 1130 },
  { month: 'Sept.', actual: null, forecast: 1210, low: 1140, high: 1280 },
  { month: 'Oct.', actual: null, forecast: 1284, low: 1175, high: 1390 },
  { month: 'Nov.', actual: null, forecast: 1390, low: 1240, high: 1540 },
]

export const marginByCategory = [
  { name: 'Onduleurs solaires', margin: 38 },
  { name: 'Textile premium', margin: 32 },
  { name: 'Gants médicaux', margin: 27 },
  { name: 'Matériaux', margin: 22 },
  { name: 'Agroalimentaire', margin: 18 },
]

export interface Anomaly {
  id: string
  title: string
  subject: string
  current: string
  usual: string
  change: string
  severity: 'Élevée' | 'Moyenne'
  detectedAt: string
  target: string
  explanation: string
  status: 'À examiner' | 'Sous surveillance' | 'Ignorée' | 'Résolue'
}

export const seedAnomalies: Anomaly[] = [
  { id: 'ANO-01', title: 'Baisse inhabituelle des ventes', subject: 'Huile de palme bio 5 L', current: '14 ventes', usual: '23 ventes', change: '-39 %', severity: 'Élevée', detectedAt: 'Aujourd’hui, 13:48', target: '/ventes?q=Huile', explanation: 'Les ventes quotidiennes sont inférieures de 39 % à la moyenne des 8 dernières semaines, sans rupture de stock ni changement de prix enregistré.', status: 'À examiner' },
  { id: 'ANO-02', title: 'Paiement au montant atypique', subject: 'Groupe Commerce Kinshasa', current: 'FC 4,8 M', usual: 'FC 1,2 M', change: '+300 %', severity: 'Moyenne', detectedAt: 'Aujourd’hui, 13:48', target: '/paiements?q=Groupe%20Commerce', explanation: 'Le montant dépasse de 300 % le panier habituel de ce client. Vérifiez la commande associée avant validation.', status: 'À examiner' },
  { id: 'ANO-03', title: 'Mouvement de stock inhabituel', subject: 'Gants d’examen médical (boîte)', current: '-180 unités', usual: '-42 unités', change: '+329 %', severity: 'Moyenne', detectedAt: 'Aujourd’hui, 13:48', target: '/inventaire?q=Gants', explanation: 'La sortie de stock journalière est plus de quatre fois supérieure à la normale au Centre de Matadi.', status: 'Sous surveillance' },
]

export interface Recommendation {
  id: string
  category: 'STOCK' | 'VENTES' | 'CLIENTS'
  title: string
  text: string
  facts: string[]
  impact: string
  tone: 'danger' | 'success' | 'warning'
  icon: 'stock' | 'trend' | 'users'
  action: { label: string; to: string }
  done: boolean
}

export const seedRecommendations: Recommendation[] = [
  { id: 'REC-01', category: 'STOCK', title: 'Réapprovisionnement recommandé', text: 'Votre stock d’onduleurs solaires pourrait devenir insuffisant dans 6 jours.', facts: ['Stock actuel : 34', 'Demande prévue : 82', 'Suggestion : commander 60 unités'], impact: 'FC 8,7 M de ventes protégées', tone: 'danger', icon: 'stock', action: { label: 'Créer le réapprovisionnement', to: '/flux/reorder?sku=WC-EL-0102' }, done: false },
  { id: 'REC-02', category: 'VENTES', title: 'Opportunité sur la catégorie Textile', text: 'La demande progresse fortement dans les points de vente de Kinshasa.', facts: ['Croissance : +21 %', 'Marge moyenne : 32 %', 'Potentiel : + FC 3,2 M'], impact: '+4,8 % de CA mensuel estimé', tone: 'success', icon: 'trend', action: { label: 'Voir les produits Textile', to: '/produits?q=Textile' }, done: false },
  { id: 'REC-03', category: 'CLIENTS', title: 'Relancer vos clients professionnels', text: '18 clients à forte valeur n’ont pas commandé depuis plus de 30 jours.', facts: ['18 clients concernés', 'Valeur moyenne : FC 680 K', 'Taux de retour prévu : 26 %'], impact: 'FC 3,1 M récupérables', tone: 'warning', icon: 'users', action: { label: 'Voir les clients', to: '/clients' }, done: false },
]
