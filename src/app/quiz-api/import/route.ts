import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { parseQuestionsCsv } from '@/lib/csv'
import { lexicalToPlainText, stringToLexical } from '@/lib/richtext'
import type { Question, User } from '@/payload-types'

interface ImportRequestBody {
  filename?: unknown
  csvContent?: unknown
  destination?: {
    type?: unknown
    bankId?: unknown
    bankName?: unknown
  }
}

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

    const body = (await request.json().catch(() => null)) as ImportRequestBody | null
    const filename =
      typeof body?.filename === 'string' && body.filename.trim()
        ? body.filename.trim()
        : 'import.csv'
    const csvContent = typeof body?.csvContent === 'string' ? body.csvContent : ''

    if (!csvContent.trim()) {
      return Response.json({ error: 'CSV content is empty.' }, { status: 400 })
    }

    const parsed = parseQuestionsCsv(csvContent)
    if (parsed.headerError) {
      return Response.json({ error: parsed.headerError }, { status: 400 })
    }
    if (parsed.validRows.length === 0) {
      return Response.json(
        {
          error:
            parsed.rowErrors[0]?.message ??
            'No valid question rows found in the uploaded CSV.',
        },
        { status: 400 },
      )
    }

    const destination = body?.destination
    let targetBankId = ''
    let targetBankName = ''

    if (destination?.type === 'new') {
      const bankName =
        typeof destination.bankName === 'string' ? destination.bankName.trim() : ''
      if (!bankName) {
        return Response.json({ error: 'New bank name is required.' }, { status: 400 })
      }

      const existing = await payload.find({
        collection: 'question-banks',
        user,
        overrideAccess: false,
        depth: 0,
        limit: 1,
        where: {
          name: { equals: bankName },
        },
      })

      if (existing.docs.length > 0) {
        return Response.json(
          { error: `A bank named "${bankName}" already exists.` },
          { status: 409 },
        )
      }

      const createdBank = await payload.create({
        collection: 'question-banks',
        user,
        overrideAccess: false,
        data: {
          name: bankName,
        },
      })

      targetBankId = createdBank.id
      targetBankName = createdBank.name
    } else if (destination?.type === 'existing') {
      const bankId =
        typeof destination.bankId === 'string' ? destination.bankId.trim() : ''
      if (!bankId) {
        return Response.json({ error: 'Destination bank is required.' }, { status: 400 })
      }

      try {
        const existingBank = await payload.findByID({
          collection: 'question-banks',
          id: bankId,
          user,
          overrideAccess: false,
          depth: 0,
        })
        targetBankId = existingBank.id
        targetBankName = existingBank.name
      } catch {
        return Response.json({ error: 'Destination bank not found.' }, { status: 404 })
      }
    } else {
      return Response.json({ error: 'Invalid destination bank selection.' }, { status: 400 })
    }

    let importedCount = 0
    for (const row of parsed.validRows) {
      const lexicalQuestion = stringToLexical(row.question) as unknown as Question['question']
      const questionTitle = lexicalToPlainText(lexicalQuestion).slice(0, 240)
      await payload.create({
        collection: 'questions',
        user,
        overrideAccess: false,
        data: {
          bank: targetBankId,
          question: lexicalQuestion,
          questionTitle,
          answerA: row.answerA,
          answerB: row.answerB,
          answerC: row.answerC,
          answerD: row.answerD,
          ...(row.answerE ? { answerE: row.answerE } : {}),
          correctAnswer: row.correctAnswer,
          source: filename,
        },
      })
      importedCount++
    }

    return Response.json(
      {
        bankId: targetBankId,
        bankName: targetBankName,
        importedCount,
      },
      { status: 201 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed.'
    return Response.json({ error: message }, { status: 500 })
  }
}
