import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiServices } from '@/services/apiAdapters'
import { ApiError, apiRequest, fetchAll, tokenStore } from '@/services/http'

type Call = { url: string; init: RequestInit }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

let calls: Call[]
let responses: (() => Response)[]

beforeEach(() => {
  calls = []
  responses = []
  tokenStore.set('jeton-acces')
  tokenStore.setCompany('0d9e-entreprise')
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    const next = responses.shift()
    if (!next) throw new Error(`Requête inattendue : ${url}`)
    return next()
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  tokenStore.set(null)
  tokenStore.setCompany(null)
})

const header = (call: Call, name: string) => new Headers(call.init.headers).get(name)

describe('client HTTP', () => {
  it('envoie le jeton, l’entreprise active et le cookie', async () => {
    responses.push(() => json({ ok: true }))
    await apiRequest('/products/')
    expect(calls[0].url).toBe('http://localhost:8000/api/v1/products/')
    expect(header(calls[0], 'Authorization')).toBe('Bearer jeton-acces')
    expect(header(calls[0], 'X-Company-ID')).toBe('0d9e-entreprise')
    expect(calls[0].init.credentials).toBe('include')
  })

  it('rafraîchit le jeton une fois après un 401 puis rejoue la requête', async () => {
    responses.push(
      () => json({ detail: 'expiré', code: 'token_not_valid' }, 401),
      () => json({ access: 'nouveau-jeton' }),
      () => json({ ok: true }),
    )
    await expect(apiRequest('/orders/')).resolves.toEqual({ ok: true })
    expect(calls[1].url).toContain('/auth/refresh/')
    expect(header(calls[1], 'X-Requested-With')).toBe('XMLHttpRequest')
    expect(header(calls[2], 'Authorization')).toBe('Bearer nouveau-jeton')
  })

  it('signale l’expiration de session si le rafraîchissement échoue', async () => {
    const expired = vi.fn()
    tokenStore.onExpired(expired)
    responses.push(() => json({}, 401), () => json({}, 401))
    await expect(apiRequest('/orders/')).rejects.toMatchObject({ status: 401 })
    expect(expired).toHaveBeenCalledOnce()
    expect(tokenStore.get()).toBeNull()
  })

  it('affiche le message métier du serveur et masque les erreurs 500', async () => {
    responses.push(() => json({ detail: 'Stock insuffisant pour « Ciment ».', code: 'insufficient_stock', fields: {} }, 409))
    const error = await apiRequest('/orders/', { method: 'POST', body: '{}' }).catch(e => e as ApiError)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).message).toBe('Stock insuffisant pour « Ciment ».')
    expect((error as ApiError).code).toBe('insufficient_stock')

    responses.push(() => new Response('Traceback… secret', { status: 500 }))
    await expect(apiRequest('/orders/')).rejects.toThrow('Le serveur a rencontré une erreur')
  })

  it('parcourt toutes les pages d’une liste', async () => {
    responses.push(
      () => json({ count: 3, next: 'page2', results: [1, 2] }),
      () => json({ count: 3, next: null, results: [3] }),
    )
    await expect(fetchAll<number>('/products/')).resolves.toEqual([1, 2, 3])
    expect(calls[1].url).toContain('page=2&pageSize=500')
  })
})

describe('adaptateurs API', () => {
  it('convertit le résumé du tableau de bord vers la forme des pages', async () => {
    responses.push(() => json({
      revenue: { value: 6_840_000, changePct: 12.4 }, sales: { value: 12, changePct: null },
      orders: { value: 9, changePct: -3, processing: 2 }, stock: { value: 40, alerts: 3, warehouses: 2 },
    }))
    const summary = await apiServices.dashboard.summary()
    expect(summary.revenue).toEqual({ value: 6_840_000, change: '+12,4 %' })
    expect(summary.sales.change).toBe('—')
    expect(summary.orders.change).toBe('−3 %')
    expect(summary.stock.alerts).toBe(3)
  })

  it('exprime les courbes en millions de FC', async () => {
    responses.push(() => json([{ label: '16 oct.', current: 2_500_000, previous: 1_250 }]))
    await expect(apiServices.dashboard.revenue('7 jours')).resolves.toEqual([{ label: '16 oct.', current: 2.5, previous: 0.001 }])
    expect(calls[0].url).toContain('period=7j')
  })

  it('n’envoie que les champs attendus pour une commande', async () => {
    responses.push(() => json({ id: 'CMD-00001' }, 201))
    await apiServices.orders.create({
      customerId: 'CLI-0001', lines: [{ sku: 'SKU-1', name: 'Produit', quantity: 2, unitPrice: 1000 }],
    }, 'vente', 'cle-1')
    const body = JSON.parse(String(calls[0].init.body)) as Record<string, unknown>
    expect(body).toMatchObject({ mode: 'vente', idempotencyKey: 'cle-1', lines: [{ sku: 'SKU-1', quantity: 2, unitPrice: 1000 }] })
    expect((body.lines as object[])[0]).not.toHaveProperty('name')
  })
})
