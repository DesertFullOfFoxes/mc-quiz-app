import React from 'react'

import { AppShell } from '@/components/AppShell'
import { BanksManager } from '@/components/BanksManager'
import { requireUser } from '@/lib/auth'
import { getBanksPageData } from '@/lib/quiz-data'

export const dynamic = 'force-dynamic'

export default async function BanksPage() {
  const { payload, user } = await requireUser('/banks')
  const banks = await getBanksPageData(payload, user)

  return (
    <AppShell user={user}>
      <BanksManager banks={banks} />
    </AppShell>
  )
}
