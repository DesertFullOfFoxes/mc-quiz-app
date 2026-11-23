import React from 'react'

import { AppShell } from '@/components/AppShell'
import { StartQuizClient } from '@/components/StartQuizClient'
import { requireUser } from '@/lib/auth'
import { getBanksPageData, type QuizMode } from '@/lib/quiz-data'

export const dynamic = 'force-dynamic'

function parseMode(raw?: string): QuizMode {
  if (raw === 'new' || raw === 'review' || raw === 'mix') {
    return raw
  }
  return 'mix'
}

function parseCount(raw?: string): number {
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN
  if (Number.isFinite(parsed) && parsed >= 1) {
    return Math.min(500, parsed)
  }
  return 10
}

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ bank?: string; mode?: string; count?: string }>
}) {
  const { payload, user } = await requireUser('/practice')
  const [banks, query] = await Promise.all([getBanksPageData(payload, user), searchParams])

  return (
    <AppShell user={user}>
      <StartQuizClient
        banks={banks}
        initialBankId={query.bank}
        initialMode={parseMode(query.mode)}
        initialCount={parseCount(query.count)}
      />
    </AppShell>
  )
}
