'use client'

import Link from 'next/link'
import React, { useState } from 'react'

import type { BankSummary } from '@/lib/quiz-data'

interface HomePracticeCardProps {
  banks: BankSummary[]
}

export function HomePracticeCard({ banks }: HomePracticeCardProps) {
  const [selectedBankId, setSelectedBankId] = useState<string>(banks[0]?.id ?? '')

  const selectedBank = banks.find((b) => b.id === selectedBankId) ?? banks[0] ?? null

  return (
    <section className="section-card">
      <h2 className="section-heading">Practice</h2>

      {banks.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">No question banks yet</p>
          <p className="empty-state-desc">
            Import a CSV or create a question bank to start practicing multiple-choice questions.
          </p>
          <Link href="/import" className="btn btn-primary">
            Import CSV
          </Link>
        </div>
      ) : (
        <>
          <div className="practice-bank-grid" role="radiogroup" aria-label="Choose practice bank">
            {banks.map((bank) => {
              const isSelected = bank.id === selectedBank?.id
              return (
                <button
                  key={bank.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`bank-choice-card ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => setSelectedBankId(bank.id)}
                >
                  <span className={`radio-outer ${isSelected ? 'is-selected' : ''}`}>
                    {isSelected && <span className="radio-dot" />}
                  </span>
                  <div>
                    <div className="bank-choice-title">{bank.name}</div>
                    <div className="bank-choice-meta">
                      {bank.totalQuestions}{' '}
                      {bank.totalQuestions === 1 ? 'question' : 'questions'}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="card-action-right">
            {selectedBank && selectedBank.totalQuestions > 0 ? (
              <Link
                href={`/practice?bank=${encodeURIComponent(selectedBank.id)}`}
                className="btn btn-primary"
                style={{ minWidth: 160 }}
              >
                Start quiz
              </Link>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                style={{ minWidth: 160 }}
                disabled
              >
                Start quiz
              </button>
            )}
          </div>
        </>
      )}
    </section>
  )
}
