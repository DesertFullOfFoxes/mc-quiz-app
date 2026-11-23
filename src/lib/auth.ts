import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload, type Payload } from 'payload'

import config from '@/payload.config'
import type { User } from '@/payload-types'

export async function getPayloadWithUser(): Promise<{
  payload: Payload
  user: User | null
}> {
  const headers = await getHeaders()
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const authResult = await payload.auth({ headers })

  const user =
    authResult.user && authResult.user.collection === 'users'
      ? (authResult.user as User)
      : null

  return { payload, user }
}

export async function requireUser(returnPath = '/'): Promise<{
  payload: Payload
  user: User
}> {
  const { payload, user } = await getPayloadWithUser()
  if (!user) {
    const query =
      returnPath && returnPath !== '/' ? `?redirect=${encodeURIComponent(returnPath)}` : ''
    redirect(`/login${query}`)
  }
  return { payload, user }
}
