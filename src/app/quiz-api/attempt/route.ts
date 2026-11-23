import configPromise from '@payload-config'
import { getPayload } from 'payload'

import type { AnswerLetter } from '@/lib/csv'
import { extractRelId } from '@/lib/quiz-data'
import type { User } from '@/payload-types'

const VALID_ANSWERS = new Set<AnswerLetter>(['A', 'B', 'C', 'D', 'E'])

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
      questionId?: unknown
      selectedAnswer?: unknown
    } | null

    const questionId = typeof body?.questionId === 'string' ? body.questionId.trim() : ''
    const selectedAnswer =
      typeof body?.selectedAnswer === 'string'
        ? (body.selectedAnswer.trim().toUpperCase() as AnswerLetter)
        : ('' as AnswerLetter)

    if (!questionId || !VALID_ANSWERS.has(selectedAnswer)) {
      return Response.json(
        { error: 'Valid questionId and selectedAnswer (A-E) are required.' },
        { status: 400 },
      )
    }

    const question = await payload.findByID({
      collection: 'questions',
      id: questionId,
      user,
      overrideAccess: false,
      depth: 0,
    })

    const bankId = extractRelId(question.bank)
    const hasAnswerE = typeof question.answerE === 'string' && question.answerE.trim().length > 0
    if (selectedAnswer === 'E' && !hasAnswerE) {
      return Response.json(
        { error: 'Option E is not available for this question.' },
        { status: 400 },
      )
    }
    const correctAnswer = question.correctAnswer as AnswerLetter
    const isCorrect = selectedAnswer === correctAnswer

    const attempt = await payload.create({
      collection: 'question-attempts',
      user,
      overrideAccess: false,
      data: {
        user: user.id,
        bank: bankId,
        question: question.id,
        selectedAnswer,
        isCorrect,
        answeredAt: new Date().toISOString(),
      },
    })

    return Response.json(
      {
        attemptId: attempt.id,
        selectedAnswer,
        correctAnswer,
        isCorrect,
      },
      { status: 201 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to record answer.'
    return Response.json({ error: message }, { status: 500 })
  }
}
