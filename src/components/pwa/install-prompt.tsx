'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
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
 * - User can dismiss; stays dismissed for 7 days.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOSHint, setShowIOSHint] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
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

    // iOS Safari doesn't fire beforeinstallprompt — show the hint after 3s.
    if (isIOS) {
      const t = setTimeout(() => {
        setShowIOSHint(true)
        setVisible(true)
      }, 3000)
      return () => {
        window.removeEventListener('beforeinstallprompt', handler)
        clearTimeout(t)
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

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

  return (
    <div className="fixed bottom-20 inset-x-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="card-soft p-4 flex items-start gap-3 shadow-lg">
        <div className="grid place-items-center h-10 w-10 rounded-xl bg-primary text-primary-foreground shrink-0">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="font-medium text-sm">Install Sentinel</div>
          {showIOSHint ? (
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Tap <Share className="inline h-3 w-3 -mt-0.5" /> Share below, then &ldquo;Add to Home Screen&rdquo;.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">Add to your home screen for quick access.</p>
          )}
          <div className="flex gap-2 mt-2.5">
            {!showIOSHint && (
              <Button size="sm" onClick={handleInstall} className="btn-pill h-9 px-4 text-xs">
                Install
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={handleDismiss} className="h-9 text-xs">
              Not now
            </Button>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground -mt-1 -mr-1 p-1" aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
