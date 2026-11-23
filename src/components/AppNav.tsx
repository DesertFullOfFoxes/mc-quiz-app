'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import React, { useState } from 'react'

interface AppNavProps {
  userLabel: string
}

export function AppNav({ userLabel }: AppNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  const isHome = pathname === '/'
  const isBanks =
    pathname.startsWith('/banks') ||
    pathname.startsWith('/import') ||
    pathname.startsWith('/questions')
  const isPractice = pathname.startsWith('/practice')

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await fetch('/api/users/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } finally {
      router.push('/login')
      router.refresh()
    }
  }

  return (
    <header className="app-nav">
      <div className="app-nav-inner">
        <Link href="/" className="app-brand">
          recall
        </Link>

        <nav className="app-nav-tabs" aria-label="Main navigation">
          <Link href="/" className={`app-nav-tab ${isHome ? 'is-active' : ''}`}>
            Home
          </Link>
          <Link href="/banks" className={`app-nav-tab ${isBanks ? 'is-active' : ''}`}>
            Banks
          </Link>
          <Link href="/practice" className={`app-nav-tab ${isPractice ? 'is-active' : ''}`}>
            Practice
          </Link>
        </nav>

        <div className="app-nav-user">
          <span className="app-nav-user-name" title={userLabel}>
            {userLabel}
          </span>
          <a href="/admin" className="app-nav-link">
            Admin
          </a>
          <button
            type="button"
            className="app-nav-link"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </div>
    </header>
  )
}
