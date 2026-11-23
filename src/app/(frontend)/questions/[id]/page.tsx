import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { AppShell } from '@/components/AppShell'
import { RichText } from '@/components/RichText'
import { requireUser } from '@/lib/auth'
import type { AnswerLetter } from '@/lib/csv'
import { formatAttemptTimestamp, getQuestionHistoryData } from '@/lib/quiz-data'

export const dynamic = 'force-dynamic'

export default async function QuestionHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { payload, user } = await requireUser(`/questions/${id}`)

  const data = await getQuestionHistoryData(payload, user, id)
  if (!data) {
    notFound()
  }

  const answerKey: Array<{ letter: AnswerLetter; text: string }> = [
    { letter: 'A', text: data.question.answerA },
    { letter: 'B', text: data.question.answerB },
    { letter: 'C', text: data.question.answerC },
    { letter: 'D', text: data.question.answerD },
    ...(data.question.answerE ? [{ letter: 'E' as const, text: data.question.answerE }] : []),
  ]

  const breadcrumbPrefix = data.question.source || data.bank.name

  return (
    <AppShell user={user}>
      <Link href={`/banks/${data.bank.id}`} className="back-link">
        ← &nbsp;Question bank
      </Link>

      <div className="page-title page-title-md" style={{ marginBottom: 10 }}>
        <RichText value={data.question.question} variant="block" />
      </div>

      <div className="page-header" style={{ marginBottom: 24 }}>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
          {breadcrumbPrefix} &nbsp;/&nbsp; Question history
        </p>

        <div className="page-actions">
          <Link
            href={`/practice?bank=${encodeURIComponent(data.bank.id)}&mode=${data.metrics.attempts > 0 ? 'review' : 'mix'}`}
            className="btn btn-primary"
            style={{ minWidth: 204 }}
          >
            Start review quiz
          </Link>
        </div>
      </div>

      <section className="metrics-grid-4" aria-label="Question metrics" style={{ marginBottom: 36 }}>
        <div className="metric-card metric-card-compact">
          <span className="metric-label">Attempts</span>
          <span className="metric-value">{data.metrics.attempts}</span>
        </div>
        <div className="metric-card metric-card-compact">
          <span className="metric-label">Correct</span>
          <span className="metric-value">{data.metrics.correct}</span>
        </div>
        <div className="metric-card metric-card-compact">
          <span className="metric-label">Incorrect</span>
          <span className="metric-value">{data.metrics.incorrect}</span>
        </div>
        <div className="metric-card metric-card-compact">
          <span className="metric-label">Accuracy</span>
          <span className="metric-value">
            {data.metrics.accuracy !== null ? `${data.metrics.accuracy}%` : '—'}
          </span>
        </div>
      </section>

      <div className="history-columns">
        <section>
          <div className="history-section-header">
            <h2 className="history-section-title">Answer key</h2>
          </div>

          <div className="answer-key-list">
            {answerKey.map((item) => {
              const isCorrect = item.letter === data.question.correctAnswer
              return (
                <div
                  key={item.letter}
                  className={`answer-key-row ${isCorrect ? 'is-correct' : ''}`}
                >
                  <span className="answer-key-left">
                    <span className="answer-key-letter">{item.letter}</span>
                    <span>{item.text}</span>
                  </span>
                  {isCorrect && (
                    <span style={{ fontSize: 12, fontWeight: 500 }}>Correct</span>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <section>
          <div className="history-section-header">
            <h2 className="history-section-title">Your attempts</h2>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Newest first</span>
          </div>

          {data.attempts.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 16px' }}>
              <p className="empty-state-desc" style={{ margin: 0 }}>
                No attempts recorded yet for this question.
              </p>
            </div>
          ) : (
            <div>
              {data.attempts.map((attempt) => (
                <div key={attempt.id} className="attempt-item">
                  <div className="attempt-time">
                    {formatAttemptTimestamp(attempt.answeredAt)}
                  </div>
                  <div
                    className={`attempt-outcome ${attempt.isCorrect ? 'text-correct' : 'text-incorrect'}`}
                  >
                    {attempt.selectedAnswer} · {attempt.isCorrect ? 'Correct' : 'Incorrect'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}
