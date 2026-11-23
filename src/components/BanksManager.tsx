'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import type { BankSummary } from '@/lib/quiz-data'

interface BanksManagerProps {
  banks: BankSummary[]
}

export function BanksManager({ banks }: BanksManagerProps) {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Please enter a bank name.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/quiz-api/banks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: trimmed, description: description.trim() }),
      })
      const data = (await res.json()) as { bank?: { id: string }; error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Could not create bank.')
        return
      }

      setName('')
      setDescription('')
      setShowCreate(false)
      if (data.bank?.id) {
        router.push(`/banks/${data.bank.id}`)
      } else {
        router.refresh()
      }
    } catch {
      setError('Network error while creating bank.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Question banks</h1>
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-secondary"
            style={{ minWidth: 127 }}
            onClick={() => {
              setShowCreate((prev) => !prev)
              setError(null)
            }}
          >
            New bank
          </button>
          <Link href="/import" className="btn btn-primary" style={{ minWidth: 140 }}>
            Import CSV
          </Link>
        </div>
      </div>

      {showCreate && (
        <form className="inline-create-panel" onSubmit={handleCreate}>
          <h2 className="section-heading" style={{ fontSize: 16 }}>
            Create a new bank
          </h2>
          {error && <div className="banner-error">{error}</div>}
          <div className="form-field">
            <label htmlFor="bank-name" className="form-label">
              Bank name
            </label>
            <input
              id="bank-name"
              type="text"
              className="form-input"
              placeholder="e.g. Biology Chapter 1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="bank-description" className="form-label">
              Description (optional)
            </label>
            <input
              id="bank-description"
              type="text"
              className="form-input"
              placeholder="Short note about this question set"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="page-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create bank'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {banks.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">No question banks yet</p>
          <p className="empty-state-desc">
            Create an empty bank or import a CSV file to automatically build your first bank.
          </p>
          <Link href="/import" className="btn btn-primary">
            Import CSV
          </Link>
        </div>
      ) : (
        <div className="data-table">
          <div className="data-table-head table-cols-banks">
            <span>BANK</span>
            <span>QUESTIONS</span>
            <span>NEW</span>
            <span>ANSWERED</span>
          </div>
          {banks.map((bank) => (
            <Link
              key={bank.id}
              href={`/banks/${bank.id}`}
              className="data-table-row data-table-row-link table-cols-banks"
              style={{ minHeight: 68 }}
            >
              <span className="row-title-lg">{bank.name}</span>
              <span className="row-muted">{bank.totalQuestions}</span>
              <span className="row-muted">{bank.newCount}</span>
              <span className="row-muted">{bank.answeredCount}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
