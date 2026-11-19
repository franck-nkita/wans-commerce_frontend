import { apiBaseUrl, apiPrefix } from './config'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields: Record<string, string[]>

  constructor(status: number, message: string, code = 'error', fields: Record<string, string[]> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
  }
}

/**
 * Jeton d'accès (courte durée) gardé **en mémoire uniquement** : jamais dans localStorage, pour qu'un script
 * injecté ne puisse pas le lire durablement. Le jeton de rafraîchissement est un cookie HttpOnly géré par le navigateur.
 */
let accessToken: string | null = null
let companyId: string | null = null
let onSessionExpired: (() => void) | null = null
let refreshing: Promise<boolean> | null = null

export const tokenStore = {
  set: (token: string | null) => { accessToken = token },
  get: () => accessToken,
  setCompany: (id: string | null) => { companyId = id },
  getCompany: () => companyId,
  onExpired: (callback: () => void) => { onSessionExpired = callback },
}

const url = (path: string) => `${apiBaseUrl}${apiPrefix}${path}`

interface ErrorBody { detail?: unknown; code?: unknown; fields?: unknown }

async function toApiError(response: Response): Promise<ApiError> {
  if (response.status >= 500) {
    return new ApiError(response.status, 'Le serveur a rencontré une erreur. Réessayez dans quelques instants.', 'server_error')
  }
  let body: ErrorBody = {}
  try {
    body = (await response.json()) as ErrorBody
  } catch {
    // Corps absent ou non JSON : message générique ci-dessous.
  }
  // Les messages 4xx du backend WANS TECH sont rédigés pour être affichés tels quels.
  const message = typeof body.detail === 'string' && body.detail
    ? body.detail
    : response.status === 403 ? 'Vous n’avez pas les droits nécessaires pour cette action.'
      : response.status === 404 ? 'Élément introuvable.'
        : `La requête a été refusée (code ${response.status}).`
  const fields = body.fields && typeof body.fields === 'object' ? (body.fields as Record<string, string[]>) : {}
  return new ApiError(response.status, message, typeof body.code === 'string' ? body.code : 'error', fields)
}

async function send(path: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body !== undefined) headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  if (companyId) headers.set('X-Company-ID', companyId)
  try {
    return await fetch(url(path), { ...init, headers, credentials: 'include' })
  } catch {
    throw new ApiError(0, 'Le serveur est injoignable. Vérifiez votre connexion et réessayez.', 'network_error')
  }
}

/** Obtient un nouveau jeton d'accès à partir du cookie. Les appels simultanés partagent la même requête. */
export function refreshAccessToken(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const response = await fetch(url('/auth/refresh/'), {
        method: 'POST', credentials: 'include', headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      })
      if (!response.ok) return false
      const body = (await response.json()) as { access?: string }
      accessToken = body.access ?? null
      return Boolean(accessToken)
    } catch {
      return false
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

/**
 * Requête JSON vers l'API. Un 401 déclenche un seul rafraîchissement du jeton puis une nouvelle tentative ;
 * en cas d'échec, la session est considérée comme expirée.
 */
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response = await send(path, init)
  if (response.status === 401 && !path.startsWith('/auth/')) {
    if (await refreshAccessToken()) {
      response = await send(path, init)
    }
    if (response.status === 401) {
      accessToken = null
      onSessionExpired?.()
      throw new ApiError(401, 'Votre session a expiré. Reconnectez-vous.', 'not_authenticated')
    }
  }
  if (!response.ok) throw await toApiError(response)
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, body?: unknown, headers?: HeadersInit) =>
    apiRequest<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body), headers }),
  patch: <T>(path: string, body: unknown) => apiRequest<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path: string) => apiRequest<void>(path, { method: 'DELETE' }),
}

interface Page<T> { count: number; next: string | null; results: T[] }

/** Parcourt toutes les pages d'une liste paginée (les écrans filtrent ensuite côté navigateur). */
export async function fetchAll<T>(path: string, pageSize = 500): Promise<T[]> {
  const separator = path.includes('?') ? '&' : '?'
  const items: T[] = []
  for (let page = 1; ; page += 1) {
    const data = await api.get<Page<T>>(`${path}${separator}page=${page}&pageSize=${pageSize}`)
    items.push(...data.results)
    if (!data.next || page >= 200) return items
  }
}
