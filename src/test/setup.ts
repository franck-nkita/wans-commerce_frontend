import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup, configure } from '@testing-library/react'
import { demoStore } from '@/services/demo/store'

// Le premier affichage d'une page chargée à la demande peut dépasser le délai par défaut (1 s),
// et largement plus quand les fichiers de tests s'exécutent en parallèle sur une machine chargée.
configure({ asyncUtilTimeout: 10000 })

// jsdom n'implémente pas window.scrollTo.
window.scrollTo = () => undefined

// jsdom n'implémente pas ResizeObserver (utilisé par Recharts) ni matchMedia.
class ResizeObserverStub implements ResizeObserver {
  constructor(_callback: ResizeObserverCallback) {}
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub

if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener: () => undefined, removeEventListener: () => undefined,
    addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false,
  })
}

// Le Request natif de Node (undici) refuse l'AbortSignal de jsdom que React Router lui transmet.
// En test, on retire ce signal : l'annulation des navigations n'est pas vérifiée ici.
const NativeRequest = globalThis.Request
class TestRequest extends NativeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    const { signal: _signal, ...rest } = init ?? {}
    super(input, rest)
  }
}
globalThis.Request = TestRequest

afterEach(() => {
  cleanup()
  demoStore.reset()
  localStorage.clear()
})
