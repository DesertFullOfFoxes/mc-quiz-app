import type { Payload, Where } from 'payload'
import type { Question, QuestionAttempt, QuestionBank, User } from '@/payload-types'
import type { AnswerLetter } from './csv'
import { lexicalToPlainText } from './richtext'

export type QuizMode = 'new' | 'review' | 'mix'

export interface BankSummary {
  id: string
  name: string
  description: string
  totalQuestions: number
  newCount: number
  answeredCount: number
}

export interface RecentAnswerItem {
  attemptId: string
  questionId: string
  question: Question['question']
  questionText: string
  bankId: string
  bankName: string
  answeredAt: string
  isCorrect: boolean
  selectedAnswer: AnswerLetter
}

export interface BankQuestionRow {
  id: string
  question: Question['question']
  questionText: string
  source: string
  lastResult: 'new' | 'correct' | 'incorrect'
  correctCount: number
  attemptCount: number
}

export interface BankDetailData {
  bank: {
    id: string
    name: string
    description: string
  }
  metrics: {
    totalQuestions: number
    newCount: number
    previouslyAnsweredCount: number
    allTimeAccuracy: number | null
  }
  questions: BankQuestionRow[]
}

export interface QuestionHistoryData {
  question: {
    id: string
    question: Question['question']
    questionText: string
    answerA: string
    answerB: string
    answerC: string
    answerD: string
    answerE: string | null
    correctAnswer: AnswerLetter
    source: string
  }
  bank: {
    id: string
    name: string
  }
  metrics: {
    attempts: number
    correct: number
    incorrect: number
    accuracy: number | null
  }
  attempts: Array<{
    id: string
    selectedAnswer: AnswerLetter
    isCorrect: boolean
    answeredAt: string
  }>
}

export interface QuizSessionQuestion {
  id: string
  question: Question['question']
  questionText: string
  source: string
  isNew: boolean
  options: Array<{
    letter: AnswerLetter
    text: string
  }>
}

export function extractRelId(rel: string | { id: string } | null | undefined): string {
  if (!rel) return ''
  return typeof rel === 'string' ? rel : rel.id
}

export function formatAttemptTimestamp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  const datePart = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)

  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)

  return `${datePart} · ${timePart}`
}

async function findAll<T>(
  fetchPage: (page: number) => Promise<{ docs: T[]; hasNextPage: boolean }>,
): Promise<T[]> {
  const all: T[] = []
  let page = 1
  while (true) {
    const res = await fetchPage(page)
    all.push(...res.docs)
    if (!res.hasNextPage || page >= 50) break
    page++
  }
  return all
}

export async function fetchAllBanks(payload: Payload, user: User): Promise<QuestionBank[]> {
  return findAll((page) =>
    payload.find({
      collection: 'question-banks',
      user,
      overrideAccess: false,
      depth: 0,
      limit: 100,
      page,
      sort: 'name',
    }),
  )
}

export async function fetchAllQuestions(
  payload: Payload,
  user: User,
  where?: Where,
): Promise<Question[]> {
  return findAll((page) =>
    payload.find({
      collection: 'questions',
      user,
      overrideAccess: false,
      depth: 0,
      limit: 100,
      page,
      sort: '-createdAt',
      ...(where ? { where } : {}),
    }),
  )
}

export async function fetchAllUserAttempts(
  payload: Payload,
  user: User,
  extraWhere?: Where,
): Promise<QuestionAttempt[]> {
  const where: Where = extraWhere
    ? {
        and: [{ user: { equals: user.id } }, extraWhere],
      }
    : {
        user: { equals: user.id },
      }

  return findAll((page) =>
    payload.find({
      collection: 'question-attempts',
      user,
      overrideAccess: false,
      depth: 0,
      limit: 100,
      page,
      sort: '-answeredAt',
      where,
    }),
  )
}

export function buildBankSummaries(
  banks: QuestionBank[],
  questions: Question[],
  attempts: QuestionAttempt[],
): BankSummary[] {
  const attemptedQuestionIds = new Set<string>()
  for (const attempt of attempts) {
    attemptedQuestionIds.add(extractRelId(attempt.question))
  }

  const questionsByBank = new Map<string, Question[]>()
  for (const q of questions) {
    const bankId = extractRelId(q.bank)
    const list = questionsByBank.get(bankId)
    if (list) {
      list.push(q)
    } else {
      questionsByBank.set(bankId, [q])
    }
  }

  return banks.map((bank) => {
    const bankQuestions = questionsByBank.get(bank.id) ?? []
    let answeredCount = 0
    for (const q of bankQuestions) {
      if (attemptedQuestionIds.has(q.id)) {
        answeredCount++
      }
    }
    return {
      id: bank.id,
      name: bank.name,
      description: bank.description ?? '',
      totalQuestions: bankQuestions.length,
      newCount: bankQuestions.length - answeredCount,
      answeredCount,
    }
  })
}

export async function getHomePageData(payload: Payload, user: User) {
  const [banks, questions, attempts] = await Promise.all([
    fetchAllBanks(payload, user),
    fetchAllQuestions(payload, user),
    fetchAllUserAttempts(payload, user),
  ])

  const bankSummaries = buildBankSummaries(banks, questions, attempts)
  const bankById = new Map(banks.map((b) => [b.id, b]))
  const questionById = new Map(questions.map((q) => [q.id, q]))

  const attemptedQuestionIds = new Set<string>()
  for (const a of attempts) {
    const qId = extractRelId(a.question)
    if (questionById.has(qId)) {
      attemptedQuestionIds.add(qId)
    }
  }

  const totalQuestions = questions.length
  const answeredCount = attemptedQuestionIds.size
  const newCount = Math.max(0, totalQuestions - answeredCount)

  // Latest attempt per distinct question (up to 10 recent items)
  const seenQuestions = new Set<string>()
  const recentAnswers: RecentAnswerItem[] = []
  for (const attempt of attempts) {
    const qId = extractRelId(attempt.question)
    if (seenQuestions.has(qId)) continue
    const q = questionById.get(qId)
    if (!q) continue
    seenQuestions.add(qId)
    const bId = extractRelId(q.bank)
    const bank = bankById.get(bId)
    recentAnswers.push({
      attemptId: attempt.id,
      questionId: q.id,
      question: q.question,
      questionText: q.questionTitle || lexicalToPlainText(q.question),
      bankId: bId,
      bankName: bank?.name ?? 'Unknown bank',
      answeredAt: attempt.answeredAt,
      isCorrect: Boolean(attempt.isCorrect),
      selectedAnswer: attempt.selectedAnswer as AnswerLetter,
    })
    if (recentAnswers.length >= 10) break
  }

  return {
    metrics: {
      totalQuestions,
      newCount,
      answeredCount,
    },
    banks: bankSummaries,
    recentAnswers,
  }
}

export async function getBanksPageData(payload: Payload, user: User): Promise<BankSummary[]> {
  const [banks, questions, attempts] = await Promise.all([
    fetchAllBanks(payload, user),
    fetchAllQuestions(payload, user),
    fetchAllUserAttempts(payload, user),
  ])
  return buildBankSummaries(banks, questions, attempts)
}

export async function getBankDetailData(
  payload: Payload,
  user: User,
  bankId: string,
): Promise<BankDetailData | null> {
  let bank: QuestionBank
  try {
    bank = await payload.findByID({
      collection: 'question-banks',
      id: bankId,
      user,
      overrideAccess: false,
      depth: 0,
    })
  } catch {
    return null
  }

  const [questions, attempts] = await Promise.all([
    fetchAllQuestions(payload, user, { bank: { equals: bankId } }),
    fetchAllUserAttempts(payload, user, { bank: { equals: bankId } }),
  ])

  const attemptsByQuestion = new Map<string, QuestionAttempt[]>()
  for (const attempt of attempts) {
    const qId = extractRelId(attempt.question)
    const list = attemptsByQuestion.get(qId)
    if (list) {
      list.push(attempt)
    } else {
      attemptsByQuestion.set(qId, [attempt])
    }
  }

  let previouslyAnsweredCount = 0
  let totalAttemptsAcrossBank = 0
  let totalCorrectAcrossBank = 0

  const rows: BankQuestionRow[] = questions.map((q) => {
    const qAttempts = attemptsByQuestion.get(q.id) ?? []
    const attemptCount = qAttempts.length
    const correctCount = qAttempts.filter((a) => a.isCorrect).length
    if (attemptCount > 0) {
      previouslyAnsweredCount++
      totalAttemptsAcrossBank += attemptCount
      totalCorrectAcrossBank += correctCount
    }
    const latest = qAttempts[0]
    const lastResult: 'new' | 'correct' | 'incorrect' = !latest
      ? 'new'
      : latest.isCorrect
        ? 'correct'
        : 'incorrect'

    return {
      id: q.id,
      question: q.question,
      questionText: q.questionTitle || lexicalToPlainText(q.question),
      source: q.source ?? '',
      lastResult,
      correctCount,
      attemptCount,
    }
  })

  const totalQuestions = questions.length
  const newCount = totalQuestions - previouslyAnsweredCount
  const allTimeAccuracy =
    totalAttemptsAcrossBank > 0
      ? Math.round((totalCorrectAcrossBank / totalAttemptsAcrossBank) * 100)
      : null

  return {
    bank: {
      id: bank.id,
      name: bank.name,
      description: bank.description ?? '',
    },
    metrics: {
      totalQuestions,
      newCount,
      previouslyAnsweredCount,
      allTimeAccuracy,
    },
    questions: rows,
  }
}

export async function getQuestionHistoryData(
  payload: Payload,
  user: User,
  questionId: string,
): Promise<QuestionHistoryData | null> {
  let question: Question
  try {
    question = await payload.findByID({
      collection: 'questions',
      id: questionId,
      user,
      overrideAccess: false,
      depth: 0,
    })
  } catch {
    return null
  }

  const bankId = extractRelId(question.bank)
  let bank: QuestionBank | null = null
  if (bankId) {
    try {
      bank = await payload.findByID({
        collection: 'question-banks',
        id: bankId,
        user,
        overrideAccess: false,
        depth: 0,
      })
    } catch {
      bank = null
    }
  }

  const attempts = await fetchAllUserAttempts(payload, user, {
    question: { equals: questionId },
  })

  const total = attempts.length
  const correct = attempts.filter((a) => a.isCorrect).length
  const incorrect = total - correct
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : null

  return {
    question: {
      id: question.id,
      question: question.question,
      questionText: question.questionTitle || lexicalToPlainText(question.question),
      answerA: question.answerA,
      answerB: question.answerB,
      answerC: question.answerC,
      answerD: question.answerD,
      answerE: question.answerE && question.answerE.trim() ? question.answerE : null,
      correctAnswer: question.correctAnswer as AnswerLetter,
      source: question.source ?? '',
    },
    bank: {
      id: bank?.id ?? bankId,
      name: bank?.name ?? 'Question bank',
    },
    metrics: {
      attempts: total,
      correct,
      incorrect,
      accuracy,
    },
    attempts: attempts.map((a) => ({
      id: a.id,
      selectedAnswer: a.selectedAnswer as AnswerLetter,
      isCorrect: Boolean(a.isCorrect),
      answeredAt: a.answeredAt,
    })),
  }
}

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export async function buildQuizSession(
  payload: Payload,
  user: User,
  bankId: string,
  mode: QuizMode,
  limit = 5,
): Promise<{
  bank: { id: string; name: string }
  questions: QuizSessionQuestion[]
} | null> {
  let bank: QuestionBank
  try {
    bank = await payload.findByID({
      collection: 'question-banks',
      id: bankId,
      user,
      overrideAccess: false,
      depth: 0,
    })
  } catch {
    return null
  }

  const [questions, attempts] = await Promise.all([
    fetchAllQuestions(payload, user, { bank: { equals: bankId } }),
    fetchAllUserAttempts(payload, user, { bank: { equals: bankId } }),
  ])

  const attemptedIds = new Set(attempts.map((a) => extractRelId(a.question)))

  const filtered = questions.filter((q) => {
    const isAttempted = attemptedIds.has(q.id)
    if (mode === 'new') return !isAttempted
    if (mode === 'review') return isAttempted
    return true
  })

  const selected = shuffleArray(filtered).slice(0, Math.max(1, limit))

  return {
    bank: {
      id: bank.id,
      name: bank.name,
    },
    questions: selected.map((q) => ({
      id: q.id,
      question: q.question,
      questionText: q.questionTitle || lexicalToPlainText(q.question),
      source: q.source ?? '',
      isNew: !attemptedIds.has(q.id),
      options: [
        { letter: 'A' as const, text: q.answerA },
        { letter: 'B' as const, text: q.answerB },
        { letter: 'C' as const, text: q.answerC },
        { letter: 'D' as const, text: q.answerD },
        ...(q.answerE && q.answerE.trim()
          ? [{ letter: 'E' as const, text: q.answerE }]
          : []),
      ],
    })),
  }
}
