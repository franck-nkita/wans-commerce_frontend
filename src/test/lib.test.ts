import { describe, expect, it } from 'vitest'
import { activePage } from '@/app/navigation'
import { orderTotals, productStatus, stockLevel, suggestedReorder } from '@/lib/domain'
import { toCsv, toSpreadsheetXml, slugify } from '@/lib/exportFile'
import { formatFC, formatFCCompact, matchesQuery } from '@/lib/format'
import { email, hasErrors, percent, phone, positiveNumber, required, validate, type Schema } from '@/lib/validation'

describe('format', () => {
  it('formate les montants en francs congolais', () => {
    expect(formatFC(1240000)).toBe('FC 1 240 000')
    expect(formatFCCompact(68_400_000)).toBe('FC 68,4 M')
    expect(formatFCCompact(680_000)).toBe('FC 680 K')
  })

  it('recherche sans tenir compte des accents ni de la casse', () => {
    expect(matchesQuery('electronique', 'Électronique')).toBe(true)
    expect(matchesQuery('  ', 'peu importe')).toBe(true)
    expect(matchesQuery('ciment', 'Huile de palme')).toBe(false)
  })
})

describe('validation', () => {
  type V = { name: string; mail: string; tel: string; qty: string; pct: string }
  const schema: Schema<V> = { name: [required<V>()], mail: [email<V>()], tel: [phone<V>()], qty: [positiveNumber<V>()], pct: [percent<V>()] }

  it('signale chaque champ invalide', () => {
    const errors = validate({ name: ' ', mail: 'pas-un-mail', tel: 'abc', qty: '0', pct: '120' }, schema)
    expect(errors).toEqual({
      name: 'Ce champ est obligatoire.', mail: 'Adresse e-mail invalide.', tel: 'Numéro de téléphone invalide.',
      qty: 'Saisissez un nombre supérieur à 0.', pct: 'La remise doit être comprise entre 0 et 100 %.',
    })
  })

  it('accepte des valeurs correctes', () => {
    const errors = validate({ name: 'Kinshasa SARL', mail: 'contact@kin.cd', tel: '+243 81 000 1001', qty: '3', pct: '5' }, schema)
    expect(hasErrors(errors)).toBe(false)
  })
})

describe('règles métier', () => {
  it('déduit le statut du stock', () => {
    expect(productStatus({ stock: 0, minStock: 10 })).toBe('Rupture de stock')
    expect(productStatus({ stock: 5, minStock: 10 })).toBe('Stock faible')
    expect(productStatus({ stock: 10, minStock: 10 })).toBe('Actif')
    expect(stockLevel({ stock: 0, minStock: 1 })).toBe('Critique')
  })

  it('calcule sous-total, remise et total', () => {
    expect(orderTotals([{ quantity: 2, unitPrice: 8500 }], 5)).toEqual({ subtotal: 17000, discount: 850, total: 16150 })
    expect(orderTotals([], 10).total).toBe(0)
  })

  it('arrondit la quantité de réapprovisionnement à la dizaine', () => {
    expect(suggestedReorder({ stock: 34, minStock: 100 }, 82)).toBe(170)
    expect(suggestedReorder({ stock: 5000, minStock: 100 }, 82)).toBe(0)
  })
})

describe('export', () => {
  it('produit un CSV séparé par des points-virgules et échappe les valeurs', () => {
    expect(toCsv({ columns: ['Nom', 'Montant'], rows: [['Comptoir; Matadi', 12], ['Dit "Kin"', 3]] }))
      .toBe('Nom;Montant\r\n"Comptoir; Matadi";12\r\n"Dit ""Kin""";3')
  })

  it('produit un classeur SpreadsheetML échappé', () => {
    const xml = toSpreadsheetXml({ title: 't', subtitle: 's', columns: ['A'], rows: [['<b>'], [42]] })
    expect(xml).toContain('&lt;b&gt;')
    expect(xml).toContain('<Data ss:Type="Number">42</Data>')
  })

  it('génère des noms de fichiers sûrs', () => {
    expect(slugify('Rapport des ventes — Ce mois')).toBe('rapport-des-ventes-ce-mois')
  })
})

describe('navigation', () => {
  it('active la rubrique parente des parcours', () => {
    expect(activePage('/')).toBe('Dashboard')
    expect(activePage('/produits')).toBe('Products')
    expect(activePage('/flux/reorder')).toBe('Inventory')
    expect(activePage('/flux/inconnu')).toBe('Dashboard')
    expect(activePage('/inexistant')).toBe('Dashboard')
  })
})
