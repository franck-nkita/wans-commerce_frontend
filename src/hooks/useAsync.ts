import { useCallback, useEffect, useRef, useState } from 'react'
import { subscribeToData } from '@/services'

export type AsyncState<T> =
  | { status: 'loading'; data: T | undefined; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'error'; data: T | undefined; error: string }

export function errorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : 'Une erreur inattendue est survenue.'
}

/**
 * Charge une ressource et la recharge automatiquement quand les données changent
 * (création d'une commande, d'un produit…), sans repasser par l'état de chargement.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading', data: undefined, error: null })
  const loaderRef = useRef(loader)
  loaderRef.current = loader
  const requestId = useRef(0)

  const load = useCallback((silent: boolean) => {
    const id = ++requestId.current
    if (!silent) setState(prev => ({ status: 'loading', data: prev.data, error: null }))
    loaderRef.current()
      .then(data => { if (id === requestId.current) setState({ status: 'success', data, error: null }) })
      .catch((error: unknown) => {
        if (id === requestId.current) setState(prev => ({ status: 'error', data: prev.data, error: errorMessage(error) }))
      })
  }, [])

  useEffect(() => {
    load(false)
    return subscribeToData(() => load(true))
  }, [load, ...deps])

  const reload = useCallback(() => load(false), [load])
  return { ...state, reload }
}
