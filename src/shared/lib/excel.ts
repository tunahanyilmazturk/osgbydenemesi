export interface ExcelColumn {
  header: string
  width?: number
  align?: 'left' | 'center' | 'right'
  format?: 'text' | 'number' | 'date' | 'currency'
}

export interface ExcelSection {
  title: string
  columns: ExcelColumn[]
  rows: unknown[][]
}

export interface ExcelReportOptions {
  fileName: string
  title: string
  subtitle?: string
  filters?: { label: string; value: string }[]
  summary?: { label: string; value: string | number }[]
  sections: ExcelSection[]
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function cellValue(value: unknown, format?: ExcelColumn['format']) {
  if (value === null || value === undefined) return ''
  if (format === 'currency') return `₺${Number(value).toFixed(2)}`
  if (format === 'number') return Number(value).toLocaleString('tr-TR')
  return String(value)
}

function columnStyle(column: ExcelColumn) {
  const align = column.align ?? 'left'
  const width = column.width ?? 120
  return `width:${width}px;text-align:${align};`
}

export function downloadExcelReport(options: ExcelReportOptions) {
  const filterRows = options.filters?.filter((filter) => filter.value.trim() !== '') ?? []
  const summaryRows = options.summary ?? []
  const sectionsHtml = options.sections
    .map((section) => {
      const header = section.columns
        .map((column) => `<th style="${columnStyle(column)}">${escapeHtml(column.header)}</th>`)
        .join('')
      const rows = section.rows.length
        ? section.rows
            .map(
              (row) =>
                `<tr>${section.columns
                  .map((column, index) => {
                    const value = cellValue(row[index], column.format)
                    return `<td style="${columnStyle(column)}">${escapeHtml(value)}</td>`
                  })
                  .join('')}</tr>`
            )
            .join('')
        : `<tr><td colspan="${section.columns.length}" class="empty">Kayıt bulunamadı.</td></tr>`

      return `
        <tr><td colspan="${section.columns.length}" class="section-title">${escapeHtml(section.title)}</td></tr>
        <tr class="table-header">${header}</tr>
        ${rows}
      `
    })
    .join('')

  const filtersHtml = filterRows.length
    ? `<table class="meta"><tr>${filterRows
        .map((filter) => `<td><strong>${escapeHtml(filter.label)}:</strong> ${escapeHtml(filter.value)}</td>`)
        .join('')}</tr></table>`
    : ''

  const summaryHtml = summaryRows.length
    ? `<table class="summary"><tr>${summaryRows
        .map((item) => `<td><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></td>`)
        .join('')}</tr></table>`
    : ''

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <style>
          @page { margin: 0.5in; }
          body { font-family: Arial, sans-serif; color: #1e293b; font-size: 10pt; }
          table { border-collapse: collapse; width: 100%; table-layout: fixed; }
          .title { background: #0f172a; color: #ffffff; font-size: 18pt; font-weight: bold; padding: 16px; }
          .subtitle { background: #e2e8f0; color: #475569; padding: 8px 12px; font-size: 10pt; }
          .meta { margin: 12px 0; background: #f8fafc; }
          .meta td { border: 1px solid #cbd5e1; padding: 7px 9px; color: #475569; }
          .summary { margin: 12px 0 18px; }
          .summary td { background: #eff6ff; border: 1px solid #bfdbfe; padding: 9px 12px; text-align: center; }
          .summary span { display: block; color: #64748b; font-size: 8pt; text-transform: uppercase; }
          .summary strong { display: block; color: #1d4ed8; font-size: 13pt; padding-top: 3px; }
          .section-title { background: #1e40af; color: #ffffff; font-size: 12pt; font-weight: bold; padding: 9px 10px; }
          .table-header th { background: #dbeafe; color: #1e3a8a; border: 1px solid #93c5fd; padding: 8px 7px; font-weight: bold; }
          td { border: 1px solid #dbe3ee; padding: 7px; vertical-align: top; word-wrap: break-word; mso-number-format: "\\@"; }
          tr:nth-child(even) td { background: #f8fafc; }
          .empty { color: #94a3b8; text-align: center; padding: 16px; }
        </style>
      </head>
      <body>
        <table><tr><td class="title">${escapeHtml(options.title)}</td></tr>${options.subtitle ? `<tr><td class="subtitle">${escapeHtml(options.subtitle)}</td></tr>` : ''}</table>
        ${filtersHtml}
        ${summaryHtml}
        <table>${sectionsHtml}</table>
      </body>
    </html>
  `

  const blob = new Blob([`\uFEFF${html}`], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = options.fileName.endsWith('.xls') ? options.fileName : `${options.fileName}.xls`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
