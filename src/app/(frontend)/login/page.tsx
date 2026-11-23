import { redirect } from 'next/navigation'
import React from 'react'

import { LoginCard } from '@/components/LoginCard'
import { getPayloadWithUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>
}) {
  const { user } = await getPayloadWithUser()
  const params = await searchParams
  const redirectPath =
    params.redirect && params.redirect.startsWith('/') && !params.redirect.startsWith('//')
      ? params.redirect
      : '/'

  if (user) {
    redirect(redirectPath)
  }

  return <LoginCard redirectPath={redirectPath} hasAuthError={Boolean(params.error)} />
}
