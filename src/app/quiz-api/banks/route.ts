import configPromise from '@payload-config'
import { getPayload } from 'payload'
import type { User } from '@/payload-types'

export const POST = async (request: Request) => {
  try {
    const payload = await getPayload({ config: configPromise })
    const authResult = await payload.auth({ headers: request.headers })
    const user =
      authResult.user && authResult.user.collection === 'users'
        ? (authResult.user as User)
        : null

    if (!user) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as {
      name?: unknown
      description?: unknown
    } | null

    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const description =
      typeof body?.description === 'string' ? body.description.trim() : ''

    if (!name) {
      return Response.json({ error: 'Bank name is required.' }, { status: 400 })
    }

    const existing = await payload.find({
      collection: 'question-banks',
      user,
      overrideAccess: false,
      depth: 0,
      limit: 1,
      where: {
        name: { equals: name },
      },
    })

    if (existing.docs.length > 0) {
      return Response.json(
        { error: `A bank named "${name}" already exists.` },
        { status: 409 },
      )
    }

    const bank = await payload.create({
      collection: 'question-banks',
      user,
      overrideAccess: false,
      data: {
        name,
        ...(description ? { description } : {}),
      },
    })

    return Response.json({ bank: { id: bank.id, name: bank.name } }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create bank.'
    return Response.json({ error: message }, { status: 500 })
  }
}
