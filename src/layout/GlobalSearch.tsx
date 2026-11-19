import { useEffect, useId, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router'
import { Icon, TextInput } from '@/components/ui'
import { searchAll, type SearchResult } from '@/services'
import { isDemo } from '@/services/config'

/** Recherche transversale (produits, clients, commandes, paiements) avec navigation au clavier. */
export function GlobalSearch({ autoFocus = false, onDone, variant = 'inline' }: { autoFocus?: boolean; onDone?: () => void; variant?: 'inline' | 'panel' }) {
  const navigate = useNavigate()
  const listId = useId()
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [results, setResults] = useState<SearchResult[]>([])

  // Recherche temporisée en mode API (une requête au plus toutes les 200 ms) ; les réponses obsolètes sont ignorées.
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return }
    let current = true
    const timer = window.setTimeout(() => {
      searchAll(query).then(found => { if (current) setResults(found) }).catch(() => { if (current) setResults([]) })
    }, isDemo ? 0 : 200)
    return () => { current = false; window.clearTimeout(timer) }
  }, [query])
  const showList = (focused || variant === 'panel') && query.trim().length >= 2

  const go = (to: string) => {
    navigate(to)
    setQuery('')
    setFocused(false)
    onDone?.()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex(i => Math.min(i + 1, results.length - 1)) }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
    else if (event.key === 'Enter' && results[activeIndex]) { event.preventDefault(); go(results[activeIndex].to) }
    else if (event.key === 'Escape') { setQuery(''); (event.target as HTMLInputElement).blur() }
  }

  return (
    <div className={`global-search global-search-${variant}`}>
      <label className="search-box">
        <Icon name="search" className="h-4 w-4" />
        <span className="sr-only">Rechercher dans l’application</span>
        <TextInput
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && results[activeIndex] ? `${listId}-${activeIndex}` : undefined}
          placeholder="Rechercher…"
          value={query}
          autoFocus={autoFocus}
          onChange={e => { setQuery(e.target.value); setActiveIndex(0) }}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          onKeyDown={onKeyDown}
        />
      </label>
      {showList && (
        <ul id={listId} role="listbox" className="search-results" aria-label="Résultats de recherche">
          {results.length === 0 && <li className="search-empty" role="option" aria-selected="false" aria-disabled="true">Aucun résultat pour « {query} »</li>}
          {results.map((result, index) => (
            <li
              key={`${result.kind}-${result.id}`}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={`search-result ${index === activeIndex ? 'search-result-active' : ''}`}
              onMouseDown={event => { event.preventDefault(); go(result.to) }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span className="search-kind">{result.kind}</span>
              <span className="search-label">{result.label}</span>
              <span className="search-detail">{result.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
