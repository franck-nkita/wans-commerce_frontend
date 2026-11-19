export type DataSource = 'demo' | 'api'

const rawSource = import.meta.env.VITE_DATA_SOURCE

export const dataSource: DataSource = rawSource === 'api' ? 'api' : 'demo'
export const isDemo = dataSource === 'demo'

export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(/\/+$/, '')

/** Préfixe de version de l'API Django. */
export const apiPrefix = import.meta.env.VITE_API_PREFIX ?? '/api/v1'

/** Latence simulée pour rendre visibles les états de chargement en mode démonstration. */
export const demoLatencyMs = import.meta.env.MODE === 'test' ? 0 : 280
