import React from 'react'

import { AppShell } from '@/components/AppShell'
import { ImportCsvFlow } from '@/components/ImportCsvFlow'
import { requireUser } from '@/lib/auth'
import { getBanksPageData } from '@/lib/quiz-data'

export const dynamic = 'force-dynamic'

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ bank?: string }>
}) {
  const { payload, user } = await requireUser('/import')
  const [banks, query] = await Promise.all([getBanksPageData(payload, user), searchParams])

  return (
    <AppShell user={user}>
      <ImportCsvFlow banks={banks} preselectedBankId={query.bank} />
    </AppShell>
  )
}
