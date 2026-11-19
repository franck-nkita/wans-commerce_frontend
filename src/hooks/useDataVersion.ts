import { useSyncExternalStore } from 'react'
import { subscribeToData } from '@/services'

let version = 0
subscribeToData(() => { version += 1 })

/** Renvoie un compteur incrémenté à chaque modification des données, pour recalculer des valeurs dérivées. */
export function useDataVersion() {
  return useSyncExternalStore(subscribeToData, () => version, () => version)
}
