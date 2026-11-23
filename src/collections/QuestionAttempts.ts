import type { Access, CollectionConfig } from 'payload'
import { ANSWER_OPTIONS } from './Questions'

const ownAttemptAccess: Access = ({ req }) => {
  if (!req.user) return false
  return {
    user: {
      equals: req.user.id,
    },
  }
}

export const QuestionAttempts: CollectionConfig = {
  slug: 'question-attempts',
  admin: {
    useAsTitle: 'selectedAnswer',
    defaultColumns: ['question', 'user', 'selectedAnswer', 'isCorrect', 'answeredAt'],
  },
  access: {
    read: ownAttemptAccess,
    create: ({ req }) => Boolean(req.user),
    update: ownAttemptAccess,
    delete: ownAttemptAccess,
  },
  versions: false,
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      admin: {
        position: 'sidebar',
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
      type: 'relationship',
      relationTo: 'questions',
      required: true,
      index: true,
    },
    {
      name: 'selectedAnswer',
      type: 'select',
      required: true,
      options: ANSWER_OPTIONS,
    },
    {
      name: 'isCorrect',
      type: 'checkbox',
      required: true,
      defaultValue: false,
    },
    {
      name: 'answeredAt',
      type: 'date',
      required: true,
      index: true,
    },
  ],
  timestamps: true,
}
