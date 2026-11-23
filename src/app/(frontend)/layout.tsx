import { Inter } from 'next/font/google'
import React from 'react'

import './styles.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata = {
  title: 'recall — Multiple-choice quiz app',
  description: 'Organize question banks, import CSVs, practice quizzes, and track recall accuracy.',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
