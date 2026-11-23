import type { CollectionConfig } from 'payload'
import { lexicalToPlainText } from '../lib/richtext'

export const ANSWER_OPTIONS = [
  { label: 'A', value: 'A' },
  { label: 'B', value: 'B' },
  { label: 'C', value: 'C' },
  { label: 'D', value: 'D' },
  { label: 'E', value: 'E' },
]

export const Questions: CollectionConfig = {
  slug: 'questions',
  admin: {
    useAsTitle: 'questionTitle',
    defaultColumns: ['questionTitle', 'bank', 'correctAnswer', 'source', 'createdAt'],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  versions: false,
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (data && data.question) {
          const extracted = lexicalToPlainText(data.question)
          if (extracted) {
            data.questionTitle = extracted.slice(0, 240)
          }
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'questionTitle',
      type: 'text',
      label: 'Question summary',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Auto-extracted plain text summary from the rich text question.',
      },
    },
    {
      name: 'bank',
      type: 'relationship',
      relationTo: 'question-banks',
      required: true,
      index: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'question',
      type: 'richText',
      required: true,
    },
    {
      name: 'answerA',
      type: 'text',
      label: 'Answer A',
      required: true,
    },
    {
      name: 'answerB',
      type: 'text',
      label: 'Answer B',
      required: true,
    },
    {
      name: 'answerC',
      type: 'text',
      label: 'Answer C',
      required: true,
    },
    {
      name: 'answerD',
      type: 'text',
      label: 'Answer D',
      required: true,
    },
    {
      name: 'answerE',
      type: 'text',
      label: 'Answer E (optional)',
      required: false,
    },
    {
      name: 'correctAnswer',
      type: 'select',
      required: true,
      options: ANSWER_OPTIONS,
      validate: (
        value: string | string[] | null | undefined,
        { siblingData }: { siblingData: Partial<Record<string, unknown>> },
      ) => {
        if (value === 'E') {
          const answerE = siblingData?.answerE
          if (typeof answerE !== 'string' || answerE.trim().length === 0) {
            return 'Cannot set Correct Answer to E when Answer E is empty.'
          }
        }
        return true
      },
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'source',
      type: 'text',
      label: 'Topic or Source',
      admin: {
        position: 'sidebar',
        description: 'Optional topic name or imported CSV filename.',
      },
    },
  ],
  timestamps: true,
}
