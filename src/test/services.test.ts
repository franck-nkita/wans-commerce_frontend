import { describe, expect, it } from 'vitest'
import {
  customersService, inventoryService, ordersService, paymentsService, productsService, reportsService, warehousesService,
} from '@/services'

const line = (sku: string, quantity: number, unitPrice = 1000) => ({ sku, name: sku, quantity, unitPrice })
const orderInput = (lines: ReturnType<typeof line>[]) => ({
  customerId: 'CLI-1001', lines, discountPct: 0, paymentMethod: 'Espèces' as const, warehouseId: 'ENT-001', notes: '', date: '2026-10-01',
})

describe('commandes', () => {
  it('un brouillon ne modifie pas le stock', async () => {
    const before = (await productsService.list()).find(p => p.sku === 'WC-EL-0098')?.stock
    const order = await ordersService.create(orderInput([line('WC-EL-0098', 5)]), 'brouillon')
    expect(order.status).toBe('Brouillon')
    expect((await productsService.list()).find(p => p.sku === 'WC-EL-0098')?.stock).toBe(before)
  })

  it('une vente confirmée décrémente le stock et met à jour le client', async () => {
    const client = (await customersService.list()).find(c => c.id === 'CLI-1001')
    const order = await ordersService.create(orderInput([line('WC-EL-0098', 5, 18000)]), 'vente')
    expect(order.total).toBe(90000)
    expect((await productsService.list()).find(p => p.sku === 'WC-EL-0098')?.stock).toBe(423)
    const after = (await customersService.list()).find(c => c.id === 'CLI-1001')
    expect(after?.orders).toBe((client?.orders ?? 0) + 1)
  })

  it('refuse une vente au-delà du stock disponible', async () => {
    await expect(ordersService.create(orderInput([line('WC-EL-0102', 35)]), 'vente')).rejects.toThrow(/Stock insuffisant/)
  })

  it('une transaction crée aussi le paiement réglé', async () => {
    const order = await ordersService.create(orderInput([line('WC-HC-0310', 2, 450)]), 'transaction')
    const payment = (await paymentsService.list()).find(p => p.orderId === order.id)
    expect(payment?.status).toBe('Réglé')
    expect(payment?.amount).toBe(900)
  })
})

describe('paiements', () => {
  it('refuse un montant supérieur au reste à payer', async () => {
    await expect(paymentsService.create({
      customerId: 'CLI-1002', orderId: 'CMD-20489', amount: 3_000_000, method: 'Mobile Money', reference: 'TXN-TEST-1', date: '2026-10-01', notes: '',
    })).rejects.toThrow(/reste à payer/)
  })

  it('refuse une commande déjà réglée et une référence en double', async () => {
    await expect(paymentsService.create({
      customerId: 'CLI-1001', orderId: 'CMD-20491', amount: 10, method: 'Espèces', reference: 'NOUVELLE', date: '2026-10-01', notes: '',
    })).rejects.toThrow(/déjà entièrement réglée/)
    await expect(paymentsService.create({
      customerId: 'CLI-1002', orderId: 'CMD-20489', amount: 10, method: 'Espèces', reference: 'txn-84291', date: '2026-10-01', notes: '',
    })).rejects.toThrow(/déjà été enregistrée/)
  })

  it('enregistre un paiement partiel valide', async () => {
    const payment = await paymentsService.create({
      customerId: 'CLI-1002', orderId: 'CMD-20489', amount: 180_000, method: 'Mobile Money', reference: 'TXN-90001', date: '2026-10-01', notes: '',
    })
    expect(payment.id).toBe('PAI-91822')
  })
})

describe('produits, stocks et entrepôts', () => {
  it('refuse un SKU en double', async () => {
    await expect(productsService.create({
      name: 'Doublon', sku: 'wc-tx-0041', category: 'Textile', brand: '', description: '', purchasePrice: 1, price: 2,
      stock: 0, minStock: 0, warehouseId: 'ENT-001', supplier: 'Kivu Import',
    })).rejects.toThrow(/existe déjà/)
  })

  it('liste les alertes de stock, de la plus critique à la moins critique', async () => {
    const alerts = await inventoryService.alerts()
    expect(alerts.map(a => a.sku)).toEqual(['WC-FM-0220', 'WC-EL-0102', 'WC-TX-0049'])
    expect(alerts[0].level).toBe('Rupture imminente')
  })

  it('un réapprovisionnement apparaît dans l’inventaire', async () => {
    await inventoryService.createRestock({ sku: 'WC-FM-0220', warehouseId: 'ENT-003', quantity: 1000, supplier: 'Kivu Import', expectedDate: '2026-12-01', notes: '' })
    const item = (await inventoryService.list()).find(i => i.sku === 'WC-FM-0220')
    expect(item?.plannedRestock).toBe(1000)
  })

  it('refuse une capacité inférieure à la surface occupée', async () => {
    await expect(warehousesService.update('ENT-001', { name: 'Kin', city: 'Kinshasa', manager: 'P. Ilunga', capacity: 100, status: 'Opérationnel' }))
      .rejects.toThrow(/capacité/)
  })
})

describe('rapports', () => {
  it('génère un rapport et ses lignes', async () => {
    const report = await reportsService.create({ type: 'Rapport des stocks', period: 'Période personnalisée', format: 'CSV', from: '2026-09-01', to: '2026-09-30' })
    expect(report.name).toMatch(/^Rapport des stocks — Du 0?1\/09\/2026 au 30\/09\/2026$/)
    expect((await reportsService.list())[0].id).toBe(report.id)
    expect((await reportsService.rows({ reportId: report.id, type: report.type })).rows).toHaveLength(8)
  })
})
