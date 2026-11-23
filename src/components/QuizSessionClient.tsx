'use client'

import Link from 'next/link'
import React, { useState } from 'react'

import { RichText } from '@/components/RichText'
import type { AnswerLetter } from '@/lib/csv'
import type { QuizMode, QuizSessionQuestion } from '@/lib/quiz-data'

interface QuizSessionClientProps {
  bank: {
    id: string
    name: string
  }
  mode: QuizMode
  requestedCount: number
  questions: QuizSessionQuestion[]
}

interface CheckedAnswerState {
  selectedAnswer: AnswerLetter
  correctAnswer: AnswerLetter
  isCorrect: boolean
}

export function QuizSessionClient({
  bank,
  mode,
  requestedCount,
  questions,
}: QuizSessionClientProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [saveWarning, setSaveWarning] = useState<string | null>(null)
  const [checked, setChecked] = useState<CheckedAnswerState | null>(null)
  const [resultsByQuestion, setResultsByQuestion] = useState<Record<string, boolean>>({})
  const [finished, setFinished] = useState(false)

  if (questions.length === 0) {
    return (
      <div className="page-body-narrow">
        <Link
          href={`/practice?bank=${encodeURIComponent(bank.id)}&count=${encodeURIComponent(String(requestedCount))}`}
          className="back-link"
        >
          ← &nbsp;Back to practice setup
        </Link>
        <div className="empty-state">
          <p className="empty-state-title">No matching questions for this mode</p>
          <p className="empty-state-desc">
            Try switching quiz modes or importing more questions into {bank.name}.
          </p>
          <Link
            href={`/practice?bank=${encodeURIComponent(bank.id)}&count=${encodeURIComponent(String(requestedCount))}`}
            className="btn btn-primary"
          >
            Choose another mode
          </Link>
        </div>
      </div>
    )
  }

  if (finished) {
    const practiced = questions.length
    const correctCount = questions.filter((q) => resultsByQuestion[q.id] === true).length
    const incorrectCount = practiced - correctCount
    const accuracy = practiced > 0 ? Math.round((correctCount / practiced) * 100) : 0

    return (
      <div className="page-body-narrow">
        <h1 className="page-title page-title-lg">Quiz results</h1>

        {saveWarning && (
          <div className="banner-error" style={{ marginTop: 16 }}>
            {saveWarning}
          </div>
        )}

        <div className="results-score-card">
          <div>
            <div className="results-accuracy-num">{accuracy}%</div>
            <div className="results-stat-label">Session accuracy</div>
          </div>

          <div className="results-divider" />

          <div className="results-breakdown">
            <div>
              <div className="results-stat-num text-correct">{correctCount}</div>
              <div className="results-stat-label">Correct</div>
            </div>
            <div>
              <div className="results-stat-num text-incorrect">{incorrectCount}</div>
              <div className="results-stat-label">Incorrect</div>
            </div>
            <div>
              <div className="results-stat-num">{practiced}</div>
              <div className="results-stat-label">Practiced</div>
            </div>
          </div>
        </div>

        <div className="actions-between">
          <Link
            href={`/banks/${bank.id}`}
            className="btn btn-secondary"
            style={{ minWidth: 232 }}
          >
            Back to question bank
          </Link>
          <Link
            href={`/practice?bank=${encodeURIComponent(bank.id)}&mode=${encodeURIComponent(mode)}&count=${encodeURIComponent(String(requestedCount))}`}
            className="btn btn-primary"
            style={{ minWidth: 184 }}
          >
            Practice again
          </Link>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentIndex]
  const total = questions.length
  const progressPercent = ((currentIndex + 1) / total) * 100
  const isLastQuestion = currentIndex === total - 1

  const handleSelectOption = (letter: AnswerLetter) => {
    if (checked) return

    // Grade immediately on the client for instant feedback (0ms latency)
    const correctAnswer = currentQuestion.correctAnswer
    const isCorrect = letter === correctAnswer
    const questionId = currentQuestion.id

    setChecked({
      selectedAnswer: letter,
      correctAnswer,
      isCorrect,
    })
    setResultsByQuestion((prev) => ({
      ...prev,
      [questionId]: isCorrect,
    }))

    // Persist the attempt to Payload in the background without blocking the UI
    void fetch('/quiz-api/attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      keepalive: true,
      body: JSON.stringify({
        questionId,
        selectedAnswer: letter,
      }),
    })
      .then((res) => {
        if (!res.ok) {
          setSaveWarning('One or more attempts could not be saved to history.')
        }
      })
      .catch(() => {
        setSaveWarning('One or more attempts could not be saved due to a network error.')
      })
  }

  const handleRedo = () => {
    setChecked(null)
  }

  const handleNext = () => {
    if (isLastQuestion) {
      setFinished(true)
    } else {
      setCurrentIndex((idx) => idx + 1)
      setChecked(null)
    }
  }

  const metaPrefix = currentQuestion.source || bank.name
  const metaSuffix = currentQuestion.isNew ? 'New question' : 'Previously answered'

  return (
    <div className="page-body-narrow">
      <div className="quiz-topbar">
        <Link
          href={`/practice?bank=${encodeURIComponent(bank.id)}&count=${encodeURIComponent(String(requestedCount))}`}
          className="back-link"
          style={{ marginBottom: 0 }}
        >
          ← &nbsp;Exit quiz
        </Link>
        <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          Question {currentIndex + 1} of {total}
        </span>
      </div>

      <div className="quiz-progress-track">
        <div className="quiz-progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      <p className="quiz-meta">
        {metaPrefix} · {metaSuffix}
      </p>

      <div className="quiz-question-title">
        <RichText
          value={currentQuestion.question}
          variant="block"
          className="question-rich-text"
        />
      </div>

      <p
        className="quiz-prompt"
        style={{
          color: !checked
            ? 'var(--text-secondary)'
            : checked.isCorrect
              ? 'var(--correct-text)'
              : 'var(--incorrect-text)',
          fontWeight: checked ? 500 : 400,
        }}
      >
        {!checked
          ? 'Select an answer to check it.'
          : checked.isCorrect
            ? 'Correct.'
            : `Incorrect. The correct answer is ${checked.correctAnswer}.`}
      </p>

      {saveWarning && <div className="banner-error">{saveWarning}</div>}

      <div className="quiz-options">
        {currentQuestion.options.map((opt) => {
          const isCorrectChoice = checked?.correctAnswer === opt.letter
          const isChosen = checked?.selectedAnswer === opt.letter
          const isIncorrectChosen = Boolean(checked && isChosen && !checked.isCorrect)

          const optionClass = isCorrectChoice
            ? 'is-correct'
            : isIncorrectChosen
              ? 'is-incorrect'
              : ''

          let marker: string | null = null
          let markerClass = ''
          if (checked) {
            if (isCorrectChoice) {
              marker = isChosen ? 'Your answer · Correct' : 'Correct'
              markerClass = 'text-correct'
            } else if (isIncorrectChosen) {
              marker = 'Incorrect'
              markerClass = 'text-incorrect'
            }
          }

          return (
            <button
              key={opt.letter}
              type="button"
              className={`quiz-option ${optionClass}`}
              disabled={Boolean(checked)}
              onClick={() => handleSelectOption(opt.letter)}
            >
              <span className="quiz-option-left">
                <span className="option-letter-box">{opt.letter}</span>
                <span className="option-text">{opt.text}</span>
              </span>
              {marker && <span className={`option-marker ${markerClass}`}>{marker}</span>}
            </button>
          )
        })}
      </div>

      {checked && (
        <div className="actions-between" style={{ marginTop: 28 }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ minWidth: 112 }}
            onClick={handleRedo}
          >
            Redo
          </button>

          <button
            type="button"
            className="btn btn-primary"
            style={{ minWidth: 160 }}
            onClick={handleNext}
          >
            {isLastQuestion ? 'View results' : 'Next question'}
          </button>
        </div>
      )}
    </div>
  )
}
