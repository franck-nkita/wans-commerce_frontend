import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark'
export type ThemePreference = Theme | 'system'

const STORAGE_KEY = 'wans-theme-preference'

interface ThemeContextValue {
  /** Thème réellement appliqué. */
  theme: Theme
  /** Choix de l'utilisateur ; « system » suit la préférence du système d'exploitation. */
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    return 'system'
  }
}

const darkQuery = () => (typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference)
  const [systemDark, setSystemDark] = useState(() => darkQuery()?.matches ?? false)

  useEffect(() => {
    const query = darkQuery()
    if (!query) return
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const theme: Theme = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.style.colorScheme = theme
  }, [theme])

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next)
    try {
      if (next === 'system') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Stockage indisponible (navigation privée) : le choix reste valable pour la session.
    }
  }, [])

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    preference,
    setPreference,
    toggleTheme: () => setPreference(theme === 'light' ? 'dark' : 'light'),
  }), [theme, preference, setPreference])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme doit être utilisé dans un ThemeProvider.')
  return context
}

/** Couleurs des graphiques Recharts, qui ne lisent pas les variables CSS. */
export function useChartColors() {
  const { theme } = useTheme()
  return theme === 'dark'
    ? { grid: '#24344D', axis: '#94A3B8', primary: '#3B82F6', secondary: '#60A5FA', muted: '#475A78', area: '#1E3A6E', success: '#34D399', tooltipBg: '#111C2E', tooltipBorder: '#24344D', tooltipText: '#F1F5F9' }
    : { grid: '#E2E8F0', axis: '#64748B', primary: '#2563EB', secondary: '#60A5FA', muted: '#CBD5E1', area: '#DBEAFE', success: '#16A36A', tooltipBg: '#FFFFFF', tooltipBorder: '#E2E8F0', tooltipText: '#0F172A' }
}
