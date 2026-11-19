import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

/** Paramètre d'URL lu et écrit comme un état, pour des filtres partageables par lien. */
export function useQueryParam(name: string, fallback = '') {
  const [params, setParams] = useSearchParams()
  const value = params.get(name) ?? fallback
  const setValue = useCallback((next: string) => {
    setParams(prev => {
      const copy = new URLSearchParams(prev)
      if (next && next !== fallback) copy.set(name, next)
      else copy.delete(name)
      return copy
    }, { replace: true })
  }, [name, fallback, setParams])
  return [value, setValue] as const
}
