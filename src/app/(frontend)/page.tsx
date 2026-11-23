import Link from 'next/link'
import React from 'react'

import { AppShell } from '@/components/AppShell'
import { HomePracticeCard } from '@/components/HomePracticeCard'
import { RichText } from '@/components/RichText'
import { requireUser } from '@/lib/auth'
import { formatAttemptTimestamp, getHomePageData } from '@/lib/quiz-data'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const { payload, user } = await requireUser('/')
  const { metrics, banks, recentAnswers } = await getHomePageData(payload, user)

  return (
    <AppShell user={user}>
      <div className="page-header">
        <h1 className="page-title">Home</h1>
        <div className="page-actions">
          <Link href="/import" className="btn btn-secondary" style={{ minWidth: 127 }}>
            Import CSV
          </Link>
        </div>
      </div>

      <section className="metrics-grid-3" aria-label="Overview metrics">
        <div className="metric-card">
          <span className="metric-label">Questions</span>
          <span className="metric-value">{metrics.totalQuestions}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">New</span>
          <span className="metric-value">{metrics.newCount}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Answered</span>
          <span className="metric-value">{metrics.answeredCount}</span>
        </div>
      </section>

      <HomePracticeCard banks={banks} />

      <section aria-label="Recent answers">
        <h2 className="section-heading">Recent answers</h2>

        {recentAnswers.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-title">No recent answers yet</p>
            <p className="empty-state-desc">
              Complete a quiz question and your latest attempts will appear here.
            </p>
          </div>
        ) : (
          <div className="data-table">
            <div className="data-table-head table-cols-recent">
              <span>QUESTION</span>
              <span>BANK</span>
              <span>LAST ANSWERED</span>
              <span>RESULT</span>
            </div>

            {recentAnswers.map((item) => (
              <Link
                key={item.attemptId}
                href={`/questions/${item.questionId}`}
                className="data-table-row data-table-row-link table-cols-recent"
                style={{ minHeight: 64 }}
              >
                <span className="row-title">
                  <RichText value={item.question} variant="inline" />
                </span>
                <span className="row-muted">{item.bankName}</span>
                <span className="row-muted-sm">{formatAttemptTimestamp(item.answeredAt)}</span>
                <span
                  style={{ fontSize: 12, fontWeight: 500 }}
                  className={item.isCorrect ? 'text-correct' : 'text-incorrect'}
                >
                  {item.isCorrect ? 'Correct' : 'Incorrect'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  )
}
