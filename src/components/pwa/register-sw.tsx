'use client'

import { useEffect } from 'react'

/**
 * Registers the service worker for PWA offline support.
 * Only runs in production builds to avoid caching issues during dev.
 */
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* swallow — SW registration failure is non-fatal */
      })
    }
    window.addEventListener('load', onLoad)
    return () => window.removeEventListener('load', onLoad)
  }, [])
  return null
}
