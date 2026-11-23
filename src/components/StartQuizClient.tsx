'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import type { BankSummary, QuizMode } from '@/lib/quiz-data'

interface StartQuizClientProps {
  banks: BankSummary[]
  initialBankId?: string
  initialMode?: QuizMode
  initialCount?: number
}

const DEFAULT_BATCH_SIZE = 10
const PRESET_COUNTS = [5, 10, 20] as const

const MODES: Array<{
  id: QuizMode
  title: string
  description: string
  cta: string
}> = [
  {
    id: 'new',
    title: 'New',
    description: 'Include only questions you haven’t answered before.',
    cta: 'Start new quiz',
  },
  {
    id: 'review',
    title: 'Review',
    description: 'Include only previously answered questions.',
    cta: 'Start review quiz',
  },
  {
    id: 'mix',
    title: 'Mix',
    description: 'Include new and previously answered questions.',
    cta: 'Start mix quiz',
  },
]

export function StartQuizClient({
  banks,
  initialBankId,
  initialMode = 'mix',
  initialCount = DEFAULT_BATCH_SIZE,
}: StartQuizClientProps) {
  const router = useRouter()
  const [selectedBankId, setSelectedBankId] = useState<string>(() => {
    if (initialBankId && banks.some((b) => b.id === initialBankId)) {
      return initialBankId
    }
    return banks[0]?.id ?? ''
  })
  const [mode, setMode] = useState<QuizMode>(initialMode)
  const [batchChoice, setBatchChoice] = useState<'all' | 'count'>('count')
  const [requestedCount, setRequestedCount] = useState<number>(
    Number.isFinite(initialCount) && initialCount > 0 ? Math.floor(initialCount) : DEFAULT_BATCH_SIZE,
  )
  const [customInput, setCustomInput] = useState<string>(
    String(
      Number.isFinite(initialCount) && initialCount > 0
        ? Math.floor(initialCount)
        : DEFAULT_BATCH_SIZE,
    ),
  )

  const selectedBank = banks.find((b) => b.id === selectedBankId) ?? banks[0] ?? null

  if (!selectedBank) {
    return (
      <div>
        <h1 className="page-title" style={{ marginBottom: 24 }}>
          Start a quiz
        </h1>
        <div className="empty-state">
          <p className="empty-state-title">No question banks available</p>
          <p className="empty-state-desc">
            Import a CSV or create a bank before starting a quiz session.
          </p>
          <Link href="/import" className="btn btn-primary">
            Import CSV
          </Link>
        </div>
      </div>
    )
  }

  const availableForMode =
    mode === 'new'
      ? selectedBank.newCount
      : mode === 'review'
        ? selectedBank.answeredCount
        : selectedBank.totalQuestions

  const desiredCount =
    batchChoice === 'all' ? availableForMode : Math.max(1, Math.min(500, requestedCount))
  const sessionLength = Math.min(desiredCount, availableForMode)
  const canStart = sessionLength > 0
  const activeModeConfig = MODES.find((m) => m.id === mode) ?? MODES[2]

  const unavailableMessage =
    mode === 'new'
      ? 'You have already answered all questions in this bank. Try Review or Mix mode.'
      : mode === 'review'
        ? 'No previously answered questions in this bank yet. Answer some new questions first.'
        : 'This bank does not have any questions yet. Import a CSV to add questions.'

  const handleSelectPreset = (count: number) => {
    setBatchChoice('count')
    setRequestedCount(count)
    setCustomInput(String(count))
  }

  const handleSelectAll = () => {
    setBatchChoice('all')
    if (availableForMode > 0) {
      setCustomInput(String(availableForMode))
    }
  }

  const handleCustomInputChange = (value: string) => {
    setCustomInput(value)
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed) && parsed >= 1) {
      setBatchChoice('count')
      setRequestedCount(Math.min(500, parsed))
    }
  }

  const handleCustomInputBlur = () => {
    const parsed = Number.parseInt(customInput, 10)
    if (!Number.isFinite(parsed) || parsed < 1) {
      setBatchChoice('count')
      setRequestedCount(DEFAULT_BATCH_SIZE)
      setCustomInput(String(DEFAULT_BATCH_SIZE))
    } else {
      const clamped = Math.min(500, parsed)
      setRequestedCount(clamped)
      setCustomInput(String(clamped))
    }
  }

  const handleStart = () => {
    if (!canStart) return
    router.push(
      `/practice/session?bank=${encodeURIComponent(selectedBank.id)}&mode=${encodeURIComponent(mode)}&count=${encodeURIComponent(String(sessionLength))}`,
    )
  }

  return (
    <div>
      <h1 className="page-title" style={{ marginBottom: 6 }}>
        Start a quiz
      </h1>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 28,
          flexWrap: 'wrap',
        }}
      >
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
          {selectedBank.name}
        </p>

        {banks.length > 1 && (
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              color: 'var(--text-secondary)',
            }}
          >
            <span>Bank:</span>
            <select
              className="form-select"
              style={{ height: 34, fontSize: 13 }}
              value={selectedBank.id}
              onChange={(e) => setSelectedBankId(e.target.value)}
            >
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.totalQuestions})
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <p className="section-kicker">QUIZ MODE</p>

      <div className="mode-grid" role="radiogroup" aria-label="Quiz mode">
        {MODES.map((m) => {
          const isSelected = mode === m.id
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`mode-card ${isSelected ? 'is-selected' : ''}`}
              onClick={() => setMode(m.id)}
            >
              <div className="mode-card-header">
                <span className="mode-card-title">{m.title}</span>
                <span className={`mode-radio-outer ${isSelected ? 'is-selected' : ''}`}>
                  {isSelected && <span className="mode-radio-dot" />}
                </span>
              </div>
              <p className="mode-card-desc">{m.description}</p>
            </button>
          )
        })}
      </div>

      <div className="batch-size-section">
        <p className="section-kicker">QUESTIONS PER BATCH</p>
        <div className="batch-size-row">
          {PRESET_COUNTS.map((preset) => {
            const isSelected = batchChoice === 'count' && requestedCount === preset
            return (
              <button
                key={preset}
                type="button"
                className={`batch-pill ${isSelected ? 'is-selected' : ''}`}
                onClick={() => handleSelectPreset(preset)}
              >
                {preset}
              </button>
            )
          })}

          <button
            type="button"
            className={`batch-pill ${batchChoice === 'all' ? 'is-selected' : ''}`}
            onClick={handleSelectAll}
            disabled={availableForMode === 0}
          >
            All ({availableForMode})
          </button>

          <label className="batch-custom-wrap">
            <span className="batch-custom-label">Custom</span>
            <input
              type="number"
              min={1}
              max={500}
              inputMode="numeric"
              aria-label="Custom number of questions"
              className="form-input batch-custom-input"
              value={customInput}
              onChange={(e) => handleCustomInputChange(e.target.value)}
              onBlur={handleCustomInputBlur}
            />
          </label>
        </div>
      </div>

      <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--text-secondary)' }}>
        {sessionLength} {sessionLength === 1 ? 'question' : 'questions'}
        {availableForMode > 0 && sessionLength < availableForMode
          ? ` (of ${availableForMode} available)`
          : ''}{' '}
        · Immediate feedback · No time limit
      </p>

      {!canStart && (
        <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--incorrect-text)' }}>
          {unavailableMessage}
        </p>
      )}

      <div className="actions-between" style={{ marginTop: 32 }}>
        <Link
          href={`/banks/${selectedBank.id}`}
          className="btn btn-secondary"
          style={{ minWidth: 139 }}
        >
          Back to bank
        </Link>

        <button
          type="button"
          className="btn btn-primary"
          style={{ minWidth: 185 }}
          disabled={!canStart}
          onClick={handleStart}
        >
          {activeModeConfig.cta}
        </button>
      </div>
    </div>
  )
}
