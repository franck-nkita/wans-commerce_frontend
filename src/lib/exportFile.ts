import type { ReportFormat } from '@/types/domain'

export interface TableData {
  title: string
  subtitle: string
  columns: string[]
  rows: (string | number)[][]
}

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function slugify(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'rapport'
}

function triggerDownload(content: BlobPart, mime: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** CSV séparé par des points-virgules (convention française d'Excel), avec BOM UTF-8. */
export function toCsv(data: Pick<TableData, 'columns' | 'rows'>) {
  const cell = (value: string | number) => {
    const text = String(value)
    return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  return [data.columns, ...data.rows].map(row => row.map(cell).join(';')).join('\r\n')
}

/** Classeur SpreadsheetML 2003 : format XML ouvert nativement par Excel et LibreOffice. */
export function toSpreadsheetXml(data: TableData) {
  const cell = (value: string | number) => typeof value === 'number'
    ? `<Cell><Data ss:Type="Number">${value}</Data></Cell>`
    : `<Cell><Data ss:Type="String">${escapeHtml(value)}</Data></Cell>`
  const header = `<Row>${data.columns.map(c => `<Cell ss:StyleID="h"><Data ss:Type="String">${escapeHtml(c)}</Data></Cell>`).join('')}</Row>`
  const body = data.rows.map(row => `<Row>${row.map(cell).join('')}</Row>`).join('')
  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="h"><Font ss:Bold="1"/></Style></Styles>
<Worksheet ss:Name="Rapport"><Table>${header}${body}</Table></Worksheet>
</Workbook>`
}

export function toPrintableHtml(data: TableData) {
  const rows = data.rows.map(row => `<tr>${row.map(v => `<td>${escapeHtml(typeof v === 'number' ? v.toLocaleString('fr-FR') : v)}</td>`).join('')}</tr>`).join('')
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(data.title)}</title>
<style>body{font-family:Inter,Arial,sans-serif;color:#0F172A;margin:32px}h1{font-size:20px;margin:0}p{color:#64748B;font-size:12px}
table{width:100%;border-collapse:collapse;margin-top:18px;font-size:11px}th{background:#F1F5F9;text-align:left}th,td{border:1px solid #E2E8F0;padding:7px 9px}
footer{margin-top:24px;color:#64748B;font-size:10px}</style></head>
<body><h1>${escapeHtml(data.title)}</h1><p>${escapeHtml(data.subtitle)}</p>
<table><thead><tr>${data.columns.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>
<footer>WANS COMMERCE · généré le ${new Date().toLocaleString('fr-FR')}</footer></body></html>`
}

/** PDF : ouvre la boîte d'impression du navigateur (destination « Enregistrer au format PDF »). */
function printAsPdf(data: TableData) {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(frame)
  const doc = frame.contentDocument
  if (!doc || !frame.contentWindow) {
    frame.remove()
    throw new Error('Impossible de préparer l’impression dans ce navigateur.')
  }
  doc.open()
  doc.write(toPrintableHtml(data))
  doc.close()
  frame.contentWindow.focus()
  frame.contentWindow.print()
  window.setTimeout(() => frame.remove(), 2000)
}

export function exportTable(data: TableData, format: ReportFormat) {
  const base = slugify(data.title)
  if (format === 'CSV') triggerDownload(`﻿${toCsv(data)}`, 'text/csv;charset=utf-8', `${base}.csv`)
  else if (format === 'Excel') triggerDownload(toSpreadsheetXml(data), 'application/vnd.ms-excel', `${base}.xls`)
  else printAsPdf(data)
}
