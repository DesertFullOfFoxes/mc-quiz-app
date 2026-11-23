export type AnswerLetter = 'A' | 'B' | 'C' | 'D' | 'E'

export const REQUIRED_CSV_HEADERS = [
  'question',
  'answer_a',
  'answer_b',
  'answer_c',
  'answer_d',
  'answer_e',
  'correct_answer',
] as const

export const FOUR_OPTION_CSV_HEADERS = [
  'question',
  'answer_a',
  'answer_b',
  'answer_c',
  'answer_d',
  'correct_answer',
] as const

export interface ParsedCsvQuestion {
  rowNumber: number
  question: string
  answerA: string
  answerB: string
  answerC: string
  answerD: string
  answerE: string
  correctAnswer: AnswerLetter
}

export interface CsvRowError {
  rowNumber: number
  message: string
}

export interface CsvParseResult {
  headerError: string | null
  validRows: ParsedCsvQuestion[]
  rowErrors: CsvRowError[]
}

const VALID_LETTERS = new Set<AnswerLetter>(['A', 'B', 'C', 'D', 'E'])

/**
 * RFC 4180 compliant CSV parser supporting quoted commas, escaped quotes (""),
 * embedded newlines inside quotes, and UTF-8 BOM.
 */
export function parseRawCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, '')
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (char === '"') {
        if (next === '"') {
          currentField += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        currentField += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      currentRow.push(currentField)
      currentField = ''
    } else if (char === '\r' && next === '\n') {
      currentRow.push(currentField)
      rows.push(currentRow)
      currentRow = []
      currentField = ''
      i++
    } else if (char === '\n' || char === '\r') {
      currentRow.push(currentField)
      rows.push(currentRow)
      currentRow = []
      currentField = ''
    } else {
      currentField += char
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField)
    rows.push(currentRow)
  }

  return rows.filter((row) => row.some((cell) => cell.trim().length > 0))
}

export function parseQuestionsCsv(content: string): CsvParseResult {
  const rawRows = parseRawCsv(content)

  if (rawRows.length === 0) {
    return {
      headerError: 'The CSV file is empty.',
      validRows: [],
      rowErrors: [],
    }
  }

  const headerRow = rawRows[0].map((cell) => cell.trim())
  const isFiveOptionHeader =
    headerRow.length === REQUIRED_CSV_HEADERS.length &&
    REQUIRED_CSV_HEADERS.every((expected, idx) => headerRow[idx] === expected)
  const isFourOptionHeader =
    headerRow.length === FOUR_OPTION_CSV_HEADERS.length &&
    FOUR_OPTION_CSV_HEADERS.every((expected, idx) => headerRow[idx] === expected)

  if (!isFiveOptionHeader && !isFourOptionHeader) {
    return {
      headerError: `Headers must match: ${REQUIRED_CSV_HEADERS.join(',')} (or omit answer_e: ${FOUR_OPTION_CSV_HEADERS.join(',')})`,
      validRows: [],
      rowErrors: [],
    }
  }

  const expectedColumns = isFiveOptionHeader
    ? REQUIRED_CSV_HEADERS.length
    : FOUR_OPTION_CSV_HEADERS.length

  const validRows: ParsedCsvQuestion[] = []
  const rowErrors: CsvRowError[] = []

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i]
    const rowNumber = i + 1

    if (row.length < expectedColumns) {
      rowErrors.push({
        rowNumber,
        message: `Row ${rowNumber} has ${row.length} columns; expected ${expectedColumns}.`,
      })
      continue
    }

    const trimmed = row.map((c) => c.trim())
    const [question, answerA, answerB, answerC, answerD] = trimmed
    const answerE = isFiveOptionHeader ? trimmed[5] : ''
    const correctRaw = isFiveOptionHeader ? trimmed[6] : trimmed[5]

    if (!question || !answerA || !answerB || !answerC || !answerD) {
      rowErrors.push({
        rowNumber,
        message: `Row ${rowNumber} is missing the question or one of answers A–D.`,
      })
      continue
    }

    const normalizedCorrect = correctRaw.toUpperCase() as AnswerLetter
    if (!VALID_LETTERS.has(normalizedCorrect)) {
      rowErrors.push({
        rowNumber,
        message: `Row ${rowNumber} has invalid correct_answer "${correctRaw}". Must be A, B, C, D, or E.`,
      })
      continue
    }

    if (normalizedCorrect === 'E' && !answerE) {
      rowErrors.push({
        rowNumber,
        message: `Row ${rowNumber} sets correct_answer to E, but answer_e is empty.`,
      })
      continue
    }

    validRows.push({
      rowNumber,
      question,
      answerA,
      answerB,
      answerC,
      answerD,
      answerE,
      correctAnswer: normalizedCorrect,
    })
  }

  return {
    headerError: null,
    validRows,
    rowErrors,
  }
}

export function getBankNameFromFilename(filename: string): string {
  const trimmed = filename.trim()
  const withoutExt = trimmed.replace(/\.csv$/i, '')
  return withoutExt || 'imported_bank'
}

export function getAnswerText(
  q: Pick<ParsedCsvQuestion, 'answerA' | 'answerB' | 'answerC' | 'answerD' | 'answerE'>,
  letter: AnswerLetter,
): string {
  switch (letter) {
    case 'A':
      return q.answerA
    case 'B':
      return q.answerB
    case 'C':
      return q.answerC
    case 'D':
      return q.answerD
    case 'E':
      return q.answerE
  }
}
