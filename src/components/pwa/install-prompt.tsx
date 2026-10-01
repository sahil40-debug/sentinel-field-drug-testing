'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useApp } from '@/lib/store'
import { Download, X, Share } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'sentinel_install_dismissed'

/**
 * PWA install prompt.
 * - On Android Chrome / desktop Chrome: captures `beforeinstallprompt` and
 *   shows an "Install app" button.
 * - On iOS Safari (no beforeinstallprompt event): shows a hint to use
 *   Share → Add to Home Screen.
 * - Positioned to never cover the sign-in form: on the login screen (not
 *   authed) it sits at the very bottom edge; when authed it sits above the
 *   bottom nav.
 * - User can dismiss; stays dismissed for 7 days.
 */
export function InstallPrompt() {
  const { authed } = useApp()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOSHint, setShowIOSHint] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Don't show on the login page — only once the user is in the app.
    // Showing it on login covers the sign-in form on mobile.
    if (!authed) return
    // Respect the 7-day dismissal.
    try {
      const dismissedAt = typeof window !== 'undefined' ? window.localStorage.getItem(DISMISS_KEY) : null
      if (dismissedAt && Date.now() - Number(dismissedAt) < 7 * 24 * 60 * 60 * 1000) return
    } catch {
      /* ignore */
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true

    // Already installed — don't prompt.
    if (isStandalone) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // On iOS, beforeinstallprompt never fires — show the Share hint after 3s.
    // On other browsers, ALSO show after 4s as a fallback (in case the event
    // doesn't fire, e.g. the app meets install criteria but the browser
    // hasn't fired it yet). The user can always dismiss.
    const delay = isIOS ? 3000 : 4000
    const t = setTimeout(() => {
      if (isIOS) setShowIOSHint(true)
      setVisible(true)
    }, delay)
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      clearTimeout(t)
    }
  }, [authed])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted' || choice.outcome === 'dismissed') {
      setDeferredPrompt(null)
      setVisible(false)
    }
  }

  const handleDismiss = () => {
    setVisible(false)
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      /* ignore */
    }
  }

  if (!visible) return null

  // Authed only — always sit above the bottom nav.
  return (
    <div className="fixed bottom-[4.5rem] sm:bottom-6 inset-x-0 sm:inset-x-auto z-50 px-3 sm:px-0 sm:right-6 sm:max-w-sm animate-in slide-in-from-bottom-4 duration-300">
      <div className="card-soft p-3 sm:p-4 flex items-center gap-3 shadow-lg">
        <div className="grid place-items-center h-10 w-10 rounded-xl bg-primary text-primary-foreground shrink-0">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">Install Sentinel</div>
          {showIOSHint ? (
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Tap <Share className="inline h-3 w-3 -mt-0.5" /> Share, then &ldquo;Add to Home Screen&rdquo;.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">Add to your home screen for quick access.</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!showIOSHint && (
            <Button size="sm" onClick={handleInstall} className="btn-pill h-9 px-4 text-xs">
              Install
            </Button>
          )}
          <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
