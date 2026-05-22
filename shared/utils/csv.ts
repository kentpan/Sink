const CSV_ESCAPE_REGEX = /^[=+\-@\t\r]/
const CSV_QUOTE_REGEX = /[",\n\r]/

function escapeCsvCell(value: unknown): string {
  let text = String(value ?? '')

  if (CSV_ESCAPE_REGEX.test(text))
    text = `'${text}`

  if (CSV_QUOTE_REGEX.test(text))
    return `"${text.replaceAll('"', '""')}"`

  return text
}

export function generateCsv(headers: string[], rows: unknown[][]): string {
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map(row => row.map(escapeCsvCell).join(',')),
  ]

  return `\uFEFF${lines.join('\n')}\n`
}
