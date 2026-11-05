import type { NewVocabulary } from '../db'

export interface CsvParseResult {
  words: NewVocabulary[]
  skipped: number
  errors: string[]
  totalRows: number
}

export function detectDelimiter(text: string): ',' | ';' | '\t' {
  const firstLine = text.split(/\r?\n/)[0] ?? ''
  const commas = (firstLine.match(/,/g) ?? []).length
  const semicolons = (firstLine.match(/;/g) ?? []).length
  const tabs = (firstLine.match(/\t/g) ?? []).length
  if (tabs > commas && tabs > semicolons) return '\t'
  if (semicolons > commas) return ';'
  return ','
}

/** Minimal but robust CSV parser: supports quotes and escaped quotes. */
export function parseCSV(text: string): string[][] {
  const delim = detectDelimiter(text)
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === delim) {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      field = ''
      rows.push(row)
      row = []
    } else if (c === '\r') {
      // ignore CR in CRLF line endings
    } else {
      field += c
    }
  }

  row.push(field)
  rows.push(row)

  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

/**
 * Parses a CSV file into vocabulary rows.
 * Expected columns: english, german, example (optional), category (optional).
 * A header row (english,german,…) is detected and skipped.
 */
export function parseVocabCsv(text: string, profileId: number): CsvParseResult {
  const rows = parseCSV(text)
  if (rows.length === 0) {
    return { words: [], skipped: 0, errors: ['The file is empty.'], totalRows: 0 }
  }

  let startIndex = 0
  const first = rows[0].map((c) => c.trim().toLowerCase())
  if (first[0] === 'english' && first[1] === 'german') {
    startIndex = 1
  }

  const words: NewVocabulary[] = []
  const errors: string[] = []
  let skipped = 0

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i]
    const english = (row[0] ?? '').trim()
    const german = (row[1] ?? '').trim()
    const example = (row[2] ?? '').trim()
    const category = (row[3] ?? '').trim()

    if (!english || !german) {
      skipped++
      errors.push(`Row ${i + 1}: missing English or German`)
      continue
    }

    words.push({
      profileId,
      english,
      german,
      example: example || undefined,
      category: category || undefined,
    })
  }

  return { words, skipped, errors, totalRows: Math.max(rows.length - startIndex, 0) }
}

export function csvTemplate(): string {
  return 'english,german,example,category\n'
}

/** Quotes a value for CSV output when it contains special characters. */
export function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return '"' + value.replace(/"/g, '""') + '"'
  }
  return value
}
