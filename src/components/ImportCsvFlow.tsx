'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useMemo, useRef, useState } from 'react'

import { RichText } from '@/components/RichText'
import {
  getAnswerText,
  getBankNameFromFilename,
  parseQuestionsCsv,
  REQUIRED_CSV_HEADERS,
  type CsvParseResult,
} from '@/lib/csv'
import { stringToLexical } from '@/lib/richtext'
import type { BankSummary } from '@/lib/quiz-data'

interface ImportCsvFlowProps {
  banks: BankSummary[]
  preselectedBankId?: string
}

export function ImportCsvFlow({ banks, preselectedBankId }: ImportCsvFlowProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<1 | 2>(1)
  const [filename, setFilename] = useState('')
  const [csvContent, setCsvContent] = useState('')
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  const suggestedBankName = useMemo(
    () => (filename ? getBankNameFromFilename(filename) : ''),
    [filename],
  )

  const filenameBankAlreadyExists = useMemo(() => {
    if (!suggestedBankName) return false
    const lower = suggestedBankName.toLowerCase()
    return banks.some((b) => b.name.toLowerCase() === lower)
  }, [banks, suggestedBankName])

  const [destination, setDestination] = useState<
    { type: 'existing'; bankId: string } | { type: 'new' }
  >(() => {
    if (preselectedBankId && banks.some((b) => b.id === preselectedBankId)) {
      return { type: 'existing', bankId: preselectedBankId }
    }
    if (banks.length > 0) {
      return { type: 'existing', bankId: banks[0].id }
    }
    return { type: 'new' }
  })

  const backHref =
    preselectedBankId && banks.some((b) => b.id === preselectedBankId)
      ? `/banks/${preselectedBankId}`
      : '/banks'

  const handleFileSelected = async (file: File | null) => {
    if (!file) return
    setUploadError(null)
    setImportError(null)

    try {
      const text = await file.text()
      const parsed = parseQuestionsCsv(text)
      if (parsed.headerError) {
        setUploadError(parsed.headerError)
        return
      }
      if (parsed.validRows.length === 0) {
        setUploadError(
          parsed.rowErrors[0]?.message ??
            'No valid rows were found in this CSV. Check that every row has a question, answers A–D (answer_e is optional), and a valid correct_answer.',
        )
        return
      }

      const candidateName = getBankNameFromFilename(file.name)
      const existsAlready = banks.some(
        (b) => b.name.toLowerCase() === candidateName.toLowerCase(),
      )

      setFilename(file.name)
      setCsvContent(text)
      setParseResult(parsed)

      if (preselectedBankId && banks.some((b) => b.id === preselectedBankId)) {
        setDestination({ type: 'existing', bankId: preselectedBankId })
      } else if (banks.length > 0) {
        setDestination({ type: 'existing', bankId: banks[0].id })
      } else if (!existsAlready) {
        setDestination({ type: 'new' })
      }

      setStep(2)
    } catch {
      setUploadError('Could not read the selected file. Please make sure it is a UTF-8 CSV.')
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleConfirmImport = async () => {
    if (!parseResult || parseResult.validRows.length === 0) return
    setImportError(null)
    setImporting(true)

    try {
      const payloadDestination =
        destination.type === 'new'
          ? { type: 'new', bankName: suggestedBankName }
          : { type: 'existing', bankId: destination.bankId }

      const res = await fetch('/quiz-api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          filename,
          csvContent,
          destination: payloadDestination,
        }),
      })

      const data = (await res.json()) as {
        bankId?: string
        importedCount?: number
        error?: string
      }

      if (!res.ok) {
        setImportError(data.error ?? 'Failed to import questions.')
        return
      }

      if (data.bankId) {
        router.push(
          `/banks/${data.bankId}?imported=${encodeURIComponent(String(data.importedCount ?? parseResult.validRows.length))}`,
        )
        router.refresh()
      }
    } catch {
      setImportError('Network error while importing questions.')
    } finally {
      setImporting(false)
    }
  }

  if (step === 1 || !parseResult) {
    return (
      <div>
        <Link href={backHref} className="back-link">
          ← &nbsp;Banks
        </Link>

        <h1 className="page-title">Import questions</h1>

        <div className="step-indicator">
          <span className="step-active">1 &nbsp;Choose CSV</span>
          <span className="step-dash">—</span>
          <span className="step-inactive">2 &nbsp;Review &amp; import</span>
        </div>

        {uploadError && <div className="banner-error">{uploadError}</div>}

        <div style={{ marginBottom: 40 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={(e) => void handleFileSelected(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            className="btn btn-primary"
            style={{ minWidth: 136 }}
            onClick={() => fileInputRef.current?.click()}
          >
            Choose CSV
          </button>
        </div>

        <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>Required format</h2>
        <p style={{ color: 'var(--text-secondary)', margin: '0 0 16px' }}>
          Use these headers exactly, in this order:
        </p>

        <div className="csv-schema-box">{REQUIRED_CSV_HEADERS.join(',')}</div>

        <div className="format-rules">
          <div>Set correct_answer to A, B, C, D, or E (when answer_e is provided).</div>
          <div>Include a question and answers A–D in every row; answer_e is optional.</div>
          <div>Wrap values containing commas in double quotes. Save as UTF-8 CSV.</div>
          <div>
            Format questions with Markdown or HTML (e.g. <strong>**bold**</strong>,{' '}
            <em>*italic*</em>, <code>`code`</code>, or headings like <code>## Title</code>).
          </div>
        </div>
      </div>
    )
  }

  const validCount = parseResult.validRows.length

  return (
    <div>
      <Link href={backHref} className="back-link">
        ← &nbsp;Banks
      </Link>

      <h1 className="page-title">Review your import</h1>

      <div className="step-indicator">
        <span className="step-inactive">1 &nbsp;Choose CSV</span>
        <span className="step-dash">—</span>
        <span className="step-active">2 &nbsp;Review &amp; import</span>
      </div>

      <div className="banner-surface">
        <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>
          {filename}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
          {validCount} valid {validCount === 1 ? 'question' : 'questions'}
          {parseResult.rowErrors.length > 0
            ? ` · ${parseResult.rowErrors.length} invalid ${parseResult.rowErrors.length === 1 ? 'row' : 'rows'} skipped`
            : ''}
        </div>
      </div>

      {parseResult.rowErrors.length > 0 && (
        <div className="banner-error">
          <strong>Skipped rows:</strong>{' '}
          {parseResult.rowErrors
            .slice(0, 3)
            .map((e) => e.message)
            .join(' ')}
        </div>
      )}

      {importError && <div className="banner-error">{importError}</div>}

      <div className="data-table" style={{ marginBottom: 32 }}>
        <div className="data-table-head table-cols-preview" style={{ background: 'transparent' }}>
          <span>QUESTION</span>
          <span>ANSWERS</span>
          <span>CORRECT ANSWER</span>
        </div>
        {parseResult.validRows.map((row) => (
          <div
            key={row.rowNumber}
            className="data-table-row table-cols-preview"
            style={{ minHeight: 46 }}
          >
            <span className="row-title">
              <RichText value={stringToLexical(row.question)} variant="inline" />
            </span>
            <span className="row-muted">{row.answerE ? '5 answers' : '4 answers'}</span>
            <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>
              {row.correctAnswer} · {getAnswerText(row, row.correctAnswer)}
            </span>
          </div>
        ))}
      </div>

      <div>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px' }}>Destination bank</h2>

        <div className="destination-list" role="radiogroup" aria-label="Destination bank">
          {banks.map((bank) => {
            const isSelected =
              destination.type === 'existing' && destination.bankId === bank.id
            return (
              <button
                key={bank.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={`destination-row ${isSelected ? 'is-selected' : ''}`}
                onClick={() => setDestination({ type: 'existing', bankId: bank.id })}
              >
                <span className="destination-row-left">
                  <span className={`radio-outer ${isSelected ? 'is-selected' : ''}`}>
                    {isSelected && <span className="radio-dot" />}
                  </span>
                  <span>{bank.name}</span>
                </span>
                <span className="destination-row-right">
                  {bank.totalQuestions}{' '}
                  {bank.totalQuestions === 1 ? 'question' : 'questions'}
                </span>
              </button>
            )
          })}

          {filenameBankAlreadyExists ? (
            <div className="destination-row is-disabled" aria-disabled="true">
              <span className="destination-row-left" style={{ color: 'var(--text-secondary)' }}>
                <span>New bank · {suggestedBankName}</span>
              </span>
              <span className="destination-row-right">Bank already exists</span>
            </div>
          ) : (
            <button
              type="button"
              role="radio"
              aria-checked={destination.type === 'new'}
              className={`destination-row ${destination.type === 'new' ? 'is-selected' : ''}`}
              onClick={() => setDestination({ type: 'new' })}
            >
              <span className="destination-row-left">
                <span
                  className={`radio-outer ${destination.type === 'new' ? 'is-selected' : ''}`}
                >
                  {destination.type === 'new' && <span className="radio-dot" />}
                </span>
                <span>New bank · {suggestedBankName}</span>
              </span>
              <span className="destination-row-right">CSV filename</span>
            </button>
          )}
        </div>

        <div className="actions-between">
          <button
            type="button"
            className="btn btn-secondary"
            style={{ minWidth: 180 }}
            onClick={() => {
              setStep(1)
              setParseResult(null)
              setImportError(null)
            }}
            disabled={importing}
          >
            Choose another CSV
          </button>

          <button
            type="button"
            className="btn btn-primary"
            style={{ minWidth: 188 }}
            onClick={() => void handleConfirmImport()}
            disabled={importing}
          >
            {importing
              ? 'Importing…'
              : `Import ${validCount} ${validCount === 1 ? 'question' : 'questions'}`}
          </button>
        </div>
      </div>
    </div>
  )
}
