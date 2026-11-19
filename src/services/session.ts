/**
 * Session utilisateur du mode API : utilisateur connecté et entreprise active.
 * L'identifiant de l'entreprise active est mémorisé dans localStorage (préférence non sensible) ;
 * le serveur revérifie l'adhésion à chaque requête.
 */
import type { CompanyMembership, SessionUser } from '@/types/domain'
import { api, refreshAccessToken, tokenStore } from './http'

export type SessionStatus = 'loading' | 'anonymous' | 'authenticated'

export interface SessionState {
  status: SessionStatus
  user: SessionUser | null
  membership: CompanyMembership | null
}

const COMPANY_KEY = 'wans-active-company'

let state: SessionState = { status: 'loading', user: null, membership: null }
const listeners = new Set<() => void>()
const companyListeners = new Set<() => void>()

function emit(next: SessionState) {
  state = next
  listeners.forEach(listener => listener())
}

function readStoredCompany() {
  try { return localStorage.getItem(COMPANY_KEY) } catch { return null }
}

function storeCompany(id: string | null) {
  try {
    if (id) localStorage.setItem(COMPANY_KEY, id)
    else localStorage.removeItem(COMPANY_KEY)
  } catch {
    // Stockage indisponible : l'entreprise sera redemandée au prochain chargement.
  }
}

function pickMembership(user: SessionUser, preferred: string | null) {
  return user.memberships.find(m => m.company.id === preferred) ?? user.memberships[0] ?? null
}

function authenticate(user: SessionUser) {
  const membership = pickMembership(user, readStoredCompany())
  tokenStore.setCompany(membership?.company.id ?? null)
  storeCompany(membership?.company.id ?? null)
  emit({ status: 'authenticated', user, membership })
}

function clear() {
  tokenStore.set(null)
  tokenStore.setCompany(null)
  emit({ status: 'anonymous', user: null, membership: null })
}

tokenStore.onExpired(clear)

interface AuthResponse { access: string; user: SessionUser }

export const session = {
  getState: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  },
  /** Prévient les écrans quand l'entreprise active change, pour qu'ils rechargent leurs données. */
  onCompanyChange(listener: () => void) {
    companyListeners.add(listener)
    return () => { companyListeners.delete(listener) }
  },

  /** Au chargement de l'application : tente de reprendre la session grâce au cookie de rafraîchissement. */
  async restore() {
    if (!(await refreshAccessToken())) return clear()
    try {
      authenticate(await api.get<SessionUser>('/auth/me/'))
    } catch {
      clear()
    }
  },

  async login(email: string, password: string) {
    const body = await api.post<AuthResponse>('/auth/login/', { email, password })
    tokenStore.set(body.access)
    authenticate(body.user)
  },

  async register(input: { email: string; password: string; fullName: string; companyName: string }) {
    const body = await api.post<AuthResponse>('/auth/register/', input)
    tokenStore.set(body.access)
    authenticate(body.user)
  },

  async logout() {
    try {
      await api.post('/auth/logout/', undefined, { 'X-Requested-With': 'XMLHttpRequest' })
    } finally {
      clear()
    }
  },

  async changePassword(currentPassword: string, newPassword: string) {
    const body = await api.post<{ access: string }>('/auth/change-password/', { currentPassword, newPassword })
    tokenStore.set(body.access)
  },

  selectCompany(companyId: string) {
    const user = state.user
    const membership = user?.memberships.find(m => m.company.id === companyId)
    if (!user || !membership) return
    tokenStore.setCompany(companyId)
    storeCompany(companyId)
    emit({ ...state, membership })
    companyListeners.forEach(listener => listener())
  },
}
