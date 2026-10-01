'use client'

import { useEffect } from 'react'

/**
 * Registers the service worker for PWA support.
 * Runs in both dev and production so the install prompt works for testing.
 */
export function RegisterSW() {
  useEffect(() => {
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
