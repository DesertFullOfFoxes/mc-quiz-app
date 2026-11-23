'use client'

import React, { useEffect, useState } from 'react'

interface LoginCardProps {
  redirectPath: string
  hasAuthError: boolean
}

export function LoginCard({ redirectPath, hasAuthError }: LoginCardProps) {
  const [authorizeUrl, setAuthorizeUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(
    hasAuthError ? 'Sign-in could not be completed. Please try again.' : null,
  )

  const safePath = redirectPath.startsWith('/') && !redirectPath.startsWith('//') ? redirectPath : '/'

  useEffect(() => {
    let active = true
    const loadAuthUrl = async () => {
      try {
        const origin = window.location.origin
        const targetRedirect = `${origin}${safePath}`
        const failedRedirect = `${origin}/login?error=auth`
        const params = new URLSearchParams({
          serverURL: origin,
          redirect: targetRedirect,
          failedRedirect,
        })
        const res = await fetch(`/api/users/sso/meta?${params.toString()}`, {
          credentials: 'include',
        })
        if (!res.ok) {
          throw new Error('Could not initialize Figma sign-in.')
        }
        const data = (await res.json()) as { authorizeURL?: string }
        if (active) {
          if (data.authorizeURL) {
            setAuthorizeUrl(data.authorizeURL)
          } else {
            setError('Sign-in is not configured yet. Try signing in via Payload Admin.')
          }
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to reach sign-in endpoint.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadAuthUrl()
    return () => {
      active = false
    }
  }, [safePath])

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-brand">recall</h1>
        <p className="login-subtitle">
          Sign in with your Payload admin account to access your question banks and practice
          history.
        </p>

        {error && <div className="banner-error">{error}</div>}

        {authorizeUrl ? (
          <a href={authorizeUrl} className="btn btn-primary login-btn-full">
            Sign in with Figma
          </a>
        ) : (
          <button type="button" className="btn btn-primary login-btn-full" disabled>
            {loading ? 'Preparing sign-in…' : 'Sign in with Figma'}
          </button>
        )}

        <a
          href={`/admin/login?redirect=${encodeURIComponent(safePath)}`}
          className="login-secondary-link"
        >
          Or sign in through Payload Admin →
        </a>
      </div>
    </div>
  )
}
