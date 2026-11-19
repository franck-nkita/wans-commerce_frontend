import { useSyncExternalStore } from 'react'
import { session } from '@/services/session'

/** Session du mode API (utilisateur connecté, entreprise active), mise à jour en temps réel. */
export function useSession() {
  return useSyncExternalStore(session.subscribe, session.getState, session.getState)
}
