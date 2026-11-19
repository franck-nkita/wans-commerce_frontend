import type { Order, OrderLine, Product, ProductStatus } from '@/types/domain'

export function productStatus(product: Pick<Product, 'stock' | 'minStock'>): ProductStatus {
  if (product.stock <= 0) return 'Rupture de stock'
  if (product.stock < product.minStock) return 'Stock faible'
  return 'Actif'
}

export type StockLevel = 'Optimal' | 'Faible' | 'Critique'

export function stockLevel(product: Pick<Product, 'stock' | 'minStock'>): StockLevel {
  const status = productStatus(product)
  return status === 'Actif' ? 'Optimal' : status === 'Stock faible' ? 'Faible' : 'Critique'
}

/** Quantité de réapprovisionnement suggérée : couvrir la demande prévue et revenir au double du minimum. */
export function suggestedReorder(product: Pick<Product, 'stock' | 'minStock'>, predicted: number) {
  const target = Math.max(product.minStock * 2, predicted)
  const missing = Math.max(target - product.stock, 0)
  return Math.ceil(missing / 10) * 10
}

export function linesSubtotal(lines: Pick<OrderLine, 'quantity' | 'unitPrice'>[]) {
  return lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)
}

export function orderTotals(lines: Pick<OrderLine, 'quantity' | 'unitPrice'>[], discountPct: number) {
  const subtotal = linesSubtotal(lines)
  const safeDiscount = Math.min(Math.max(discountPct, 0), 100)
  const discount = Math.round(subtotal * safeDiscount) / 100
  return { subtotal, discount, total: subtotal - discount }
}

export function orderItemsCount(order: Pick<Order, 'lines'>) {
  return order.lines.reduce((sum, line) => sum + line.quantity, 0)
}
