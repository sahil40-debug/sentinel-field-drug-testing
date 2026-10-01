'use client'

import { useEffect, useState } from 'react'
import { LogoMark } from '@/components/drug-test/ui-bits'

/**
 * Branded loading splash shown for ~1.2s on first app load (after hydration).
 * Mirrors the login's brand-panel aesthetic so the install/open experience
 * feels cohesive: purple gradient + flask icon + wordmark + tagline.
 *
 * Only shows once per session (sessionStorage) so it doesn't nag returning
 * users within the same browser session.
 */
const SESSION_KEY = 'sentinel_splash_shown'
const SPLASH_MS = 1200

export function SplashScreen() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // One-time show-then-hide splash; the setState calls are the canonical
    // mount-time pattern. The lint rule is overly strict for this case.
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const seen = window.sessionStorage.getItem(SESSION_KEY)
      if (seen) return
      setShow(true)
      const t = setTimeout(() => {
        setShow(false)
        window.sessionStorage.setItem(SESSION_KEY, '1')
      }, SPLASH_MS)
      return () => clearTimeout(t)
    } catch {
      /* ignore */
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  if (!show) return null

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-primary text-primary-foreground animate-in fade-in duration-200"
      style={{
        backgroundImage:
          'radial-gradient(at 20% 20%, oklch(0.55 0.1 295) 0px, transparent 50%), radial-gradient(at 80% 60%, oklch(0.5 0.1 320) 0px, transparent 50%), radial-gradient(at 50% 95%, oklch(0.6 0.08 175) 0px, transparent 55%)',
      }}
    >
      <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-500">
        <LogoMark size={72} />
        <div className="text-center">
          <div className="font-serif-display text-2xl font-semibold">Sentinel</div>
          <div className="text-xs opacity-70 tracking-wide mt-1">Field Drug Testing Companion</div>
        </div>
        <div className="mt-2 h-1 w-16 rounded-full bg-primary-foreground/30 overflow-hidden">
          <div className="h-full w-1/2 bg-primary-foreground animate-pulse" />
        </div>
      </div>
    </div>
  )
}
