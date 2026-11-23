import React from 'react'

import type { User } from '@/payload-types'
import { AppNav } from './AppNav'

interface AppShellProps {
  user: User
  children: React.ReactNode
}

export function AppShell({ user, children }: AppShellProps) {
  const userLabel = user.figmaHandle || user.email || 'Signed in'

  return (
    <div className="app-shell">
      <AppNav userLabel={userLabel} />
      <main className="page-body">{children}</main>
    </div>
  )
}
