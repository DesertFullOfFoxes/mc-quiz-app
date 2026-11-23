import { redirect } from 'next/navigation'
import React from 'react'

import { AppShell } from '@/components/AppShell'
import { QuizSessionClient } from '@/components/QuizSessionClient'
import { requireUser } from '@/lib/auth'
import { buildQuizSession, type QuizMode } from '@/lib/quiz-data'

export const dynamic = 'force-dynamic'

function parseMode(raw?: string): QuizMode {
  if (raw === 'new' || raw === 'review' || raw === 'mix') {
    return raw
  }
  return 'mix'
}

export default async function PracticeSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ bank?: string; mode?: string }>
}) {
  const query = await searchParams
  const bankId = query.bank?.trim() ?? ''
  const mode = parseMode(query.mode)

  const returnPath = bankId
    ? `/practice/session?bank=${encodeURIComponent(bankId)}&mode=${encodeURIComponent(mode)}`
    : '/practice'

  const { payload, user } = await requireUser(returnPath)

  if (!bankId) {
    redirect('/practice')
  }

  const session = await buildQuizSession(payload, user, bankId, mode, 5)
  if (!session) {
    redirect('/practice')
  }

  return (
    <AppShell user={user}>
      <QuizSessionClient bank={session.bank} mode={mode} questions={session.questions} />
    </AppShell>
  )
}
