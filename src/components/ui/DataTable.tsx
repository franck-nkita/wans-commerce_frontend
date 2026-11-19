import { useEffect, useState, type ReactNode } from 'react'
import { Button } from './primitives'
import { Icon } from './Icon'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  align?: 'left' | 'right'
  /** Mise en avant comme titre de la carte sur mobile. */
  primary?: boolean
}

interface DataTableProps<T> {
  caption: string
  columns: Column<T>[]
  rows: T[]
  getRowKey: (row: T) => string
  empty: ReactNode
  pageSize?: number
}

export function DataTable<T>({ caption, columns, rows, getRowKey, empty, pageSize = 8 }: DataTableProps<T>) {
  const [page, setPage] = useState(1)
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))

  useEffect(() => { if (page > pageCount) setPage(pageCount) }, [page, pageCount])

  if (rows.length === 0) return <>{empty}</>

  const start = (page - 1) * pageSize
  const visible = rows.slice(start, start + pageSize)

  return (
    <>
      <div className="responsive-table">
        <table className="data-table">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>{columns.map(c => <th key={c.key} scope="col" className={c.align === 'right' ? 'text-right' : undefined}>{c.header}</th>)}</tr>
          </thead>
          <tbody>
            {visible.map(row => (
              <tr key={getRowKey(row)}>
                {columns.map(c => (
                  <td key={c.key} data-label={c.header} className={`${c.align === 'right' ? 'text-right' : ''} ${c.primary ? 'cell-primary' : ''}`}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && <Pagination page={page} pageCount={pageCount} total={rows.length} start={start} shown={visible.length} onChange={setPage} />}
    </>
  )
}

function Pagination({ page, pageCount, total, start, shown, onChange }: { page: number; pageCount: number; total: number; start: number; shown: number; onChange: (page: number) => void }) {
  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="pagination-info">{start + 1}–{start + shown} sur {total}</span>
      <div className="pagination-buttons">
        <Button variant="secondary" className="icon-button" onClick={() => onChange(page - 1)} disabled={page === 1} aria-label="Page précédente">
          <Icon name="chevron" className="h-4 w-4 rotate-180" />
        </Button>
        <span aria-current="page" className="pagination-current">Page {page} / {pageCount}</span>
        <Button variant="secondary" className="icon-button" onClick={() => onChange(page + 1)} disabled={page === pageCount} aria-label="Page suivante">
          <Icon name="chevron" className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  )
}
