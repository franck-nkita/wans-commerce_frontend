const numberFormatter = new Intl.NumberFormat('fr-FR')

/** Espace fine insécable utilisée par Intl pour fr-FR, normalisée en espace insécable classique. */
function normalizeSpaces(value: string) {
  return value.replace(/ /g, ' ')
}

export function formatNumber(value: number) {
  return normalizeSpaces(numberFormatter.format(value))
}

export function formatFC(value: number) {
  return `FC ${formatNumber(Math.round(value))}`
}

/** Montant compact : FC 68,4 M, FC 680 K. */
export function formatFCCompact(value: number) {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `FC ${normalizeSpaces((value / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }))} M`
  if (abs >= 1_000) return `FC ${normalizeSpaces((value / 1_000).toLocaleString('fr-FR', { maximumFractionDigits: 0 }))} K`
  return formatFC(value)
}

export function formatDate(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return `${formatDate(iso)} · ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
}

export function todayISO() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

/** Comparaison insensible à la casse et aux accents. */
export function normalizeText(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function matchesQuery(query: string, ...fields: (string | number)[]) {
  const q = normalizeText(query.trim())
  if (!q) return true
  return fields.some(field => normalizeText(String(field)).includes(q))
}

/** Évolution en pourcentage : « +12,4 % », « −3 % » ; « — » quand la comparaison est impossible. */
export function formatChange(pct: number | null | undefined) {
  if (pct === null || pct === undefined || !Number.isFinite(pct)) return '—'
  const value = normalizeSpaces(Math.abs(pct).toLocaleString('fr-FR', { maximumFractionDigits: 1 }))
  return `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${value} %`
}
