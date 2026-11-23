import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { AppShell } from '@/components/AppShell'
import { RichText } from '@/components/RichText'
import { requireUser } from '@/lib/auth'
import { getBankDetailData } from '@/lib/quiz-data'

export const dynamic = 'force-dynamic'

export default async function BankDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ imported?: string }>
}) {
  const { id } = await params
  const query = await searchParams
  const { payload, user } = await requireUser(`/banks/${id}`)

  const data = await getBankDetailData(payload, user, id)
  if (!data) {
    notFound()
  }

  const importedCount = query.imported ? Number(query.imported) : 0
  const showImportBanner = Number.isFinite(importedCount) && importedCount > 0

  return (
    <AppShell user={user}>
      <div className="page-header">
        <h1 className="page-title">{data.bank.name}</h1>
        <div className="page-actions">
          <Link
            href={`/import?bank=${encodeURIComponent(data.bank.id)}`}
            className="btn btn-secondary"
            style={{ minWidth: 127 }}
          >
            Import CSV
          </Link>
          {data.metrics.totalQuestions > 0 ? (
            <Link
              href={`/practice?bank=${encodeURIComponent(data.bank.id)}`}
              className="btn btn-primary"
              style={{ minWidth: 140 }}
            >
              Start quiz
            </Link>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              style={{ minWidth: 140 }}
              disabled
            >
              Start quiz
            </button>
          )}
        </div>
      </div>

      <section className="metrics-grid-4" aria-label="Bank metrics">
        <div className="metric-card metric-card-tall">
          <span className="metric-label">Total questions</span>
          <span className="metric-value">{data.metrics.totalQuestions}</span>
        </div>
        <div className="metric-card metric-card-tall">
          <span className="metric-label">New</span>
          <span className="metric-value">{data.metrics.newCount}</span>
        </div>
        <div className="metric-card metric-card-tall">
          <span className="metric-label">Previously answered</span>
          <span className="metric-value">{data.metrics.previouslyAnsweredCount}</span>
        </div>
        <div className="metric-card metric-card-tall">
          <span className="metric-label">All-time accuracy</span>
          <span className="metric-value">
            {data.metrics.allTimeAccuracy !== null ? `${data.metrics.allTimeAccuracy}%` : '—'}
          </span>
        </div>
      </section>

      {showImportBanner && (
        <div className="banner-success" role="status">
          {importedCount} {importedCount === 1 ? 'question' : 'questions'} imported.
        </div>
      )}

      {data.questions.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">No questions in this bank yet</p>
          <p className="empty-state-desc">
            Import a CSV file or add rich-text questions from Payload Admin to populate this bank.
          </p>
          <Link
            href={`/import?bank=${encodeURIComponent(data.bank.id)}`}
            className="btn btn-primary"
          >
            Import CSV
          </Link>
        </div>
      ) : (
        <>
          <div className="data-table">
            <div className="data-table-head table-cols-bank-detail">
              <span>QUESTION</span>
              <span>LAST RESULT</span>
              <span>ACCURACY</span>
            </div>

            {data.questions.map((q) => {
              const subtextParts: string[] = []
              if (q.source) subtextParts.push(q.source)
              if (q.attemptCount > 0) subtextParts.push('View history →')

              const pillClass =
                q.lastResult === 'correct'
                  ? 'status-pill status-pill-correct'
                  : q.lastResult === 'incorrect'
                    ? 'status-pill status-pill-incorrect'
                    : 'status-pill status-pill-new'

              const pillLabel =
                q.lastResult === 'correct'
                  ? 'Correct'
                  : q.lastResult === 'incorrect'
                    ? 'Incorrect'
                    : 'New'

              return (
                <Link
                  key={q.id}
                  href={`/questions/${q.id}`}
                  className="data-table-row data-table-row-link table-cols-bank-detail"
                >
                  <div>
                    <div className="row-title">
                      <RichText value={q.question} variant="inline" />
                    </div>
                    {subtextParts.length > 0 && (
                      <div className="row-subtext">{subtextParts.join(' · ')}</div>
                    )}
                  </div>
                  <div>
                    <span className={pillClass}>{pillLabel}</span>
                  </div>
                  <div className="row-muted">
                    {q.attemptCount > 0 ? `${q.correctCount} of ${q.attemptCount}` : '—'}
                  </div>
                </Link>
              )
            })}
          </div>

          <div className="table-footer-note">
            {data.questions.length}{' '}
            {data.questions.length === 1 ? 'question shown' : 'questions shown'}
          </div>
        </>
      )}
    </AppShell>
  )
}
