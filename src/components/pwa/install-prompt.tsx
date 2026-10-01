'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useApp } from '@/lib/store'
import { Download, X, Share, MonitorSmartphone } from 'lucide-react'
import { toast } from 'sonner'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'sentinel_install_dismissed'

function detectPlatform(): 'ios' | 'android' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream
  if (isIOS) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

/**
 * PWA install prompt — robust across all browsers.
 *
 * - Chrome/Edge (Android + desktop): captures `beforeinstallprompt` and the
 *   Install button triggers the native install dialog.
 * - iOS Safari (no beforeinstallprompt): shows Share → Add to Home Screen.
 * - Any browser where beforeinstallprompt didn't fire: the Install button
 *   opens a modal with platform-specific instructions (not a dead button).
 *
 * Only shows when authed (not on the login page).
 */
export function InstallPrompt() {
  const { authed, installRequested, clearInstallRequest } = useApp()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const platform = typeof window !== 'undefined' ? detectPlatform() : 'desktop'

  // handleInstall — defined first so the installRequested effect can call it.
  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted' || choice.outcome === 'dismissed') {
        setDeferredPrompt(null)
        setVisible(false)
      }
      return
    }
    setShowInstructions(true)
  }, [deferredPrompt])

  // Respond to the header "Install" button
  useEffect(() => {
    if (!installRequested) return
    // handleInstall may call setShowInstructions (setState) — this is the
    // intended "user clicked install" reaction, not a cascading render.
    /* eslint-disable react-hooks/set-state-in-effect */
    handleInstall()
    clearInstallRequest()
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [installRequested, clearInstallRequest, handleInstall])

  useEffect(() => {
    if (!authed) return
    try {
      const dismissedAt = window.localStorage.getItem(DISMISS_KEY)
      if (dismissedAt && Date.now() - Number(dismissedAt) < 7 * 24 * 60 * 60 * 1000) return
    } catch { /* ignore */ }

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    if (isStandalone) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Fallback: show the prompt after 4s even if beforeinstallprompt didn't fire.
    const t = setTimeout(() => setVisible(true), 4000)
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      clearTimeout(t)
    }
  }, [authed])

  const handleDismiss = () => {
    setVisible(false)
    setShowInstructions(false)
    try { window.localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* ignore */ }
  }

  if (!visible && !showInstructions) return null

  return (
    <>
      {/* Install prompt bar */}
      {visible && !showInstructions && (
        <div className="fixed bottom-[4.5rem] sm:bottom-6 inset-x-0 sm:inset-x-auto z-50 px-3 sm:px-0 sm:right-6 sm:max-w-sm animate-in slide-in-from-bottom-4 duration-300">
          <div className="card-soft p-3 sm:p-4 flex items-center gap-3 shadow-lg">
            <div className="grid place-items-center h-10 w-10 rounded-xl bg-primary text-primary-foreground shrink-0">
              <Download className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">Install Sentinel</div>
              <p className="text-xs text-muted-foreground mt-0.5">Add to your home screen for quick access.</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button size="sm" onClick={handleInstall} className="btn-pill h-9 px-4 text-xs">
                Install
              </Button>
              <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted" aria-label="Dismiss">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions modal — shown when there's no native install prompt */}
      {showInstructions && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowInstructions(false)}>
          <div className="card-soft p-6 max-w-sm w-full animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="grid place-items-center h-10 w-10 rounded-xl bg-primary text-primary-foreground">
                  <Download className="h-5 w-5" />
                </div>
                <div className="font-serif-display text-lg font-semibold">Install Sentinel</div>
              </div>
              <button onClick={() => setShowInstructions(false)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            {platform === 'ios' && (
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">On iPhone/iPad:</p>
                <ol className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="grid place-items-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">1</span>
                    <span>Tap the <Share className="inline h-4 w-4 -mt-0.5 mx-1" /> <strong>Share</strong> button in Safari&apos;s toolbar</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="grid place-items-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">2</span>
                    <span>Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="grid place-items-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">3</span>
                    <span>Tap <strong>&ldquo;Add&rdquo;</strong> — Sentinel will appear on your home screen</span>
                  </li>
                </ol>
              </div>
            )}

            {platform === 'android' && (
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">On Android:</p>
                <ol className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="grid place-items-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">1</span>
                    <span>Tap the <strong>three-dot menu</strong> (⋮) in Chrome</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="grid place-items-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">2</span>
                    <span>Tap <strong>&ldquo;Install app&rdquo;</strong> or <strong>&ldquo;Add to Home screen&rdquo;</strong></span>
                  </li>
                </ol>
              </div>
            )}

            {platform === 'desktop' && (
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">On desktop:</p>
                <ol className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="grid place-items-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">1</span>
                    <span>Look for the <MonitorSmartphone className="inline h-4 w-4 -mt-0.5 mx-1" /> <strong>install icon</strong> in the address bar</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="grid place-items-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">2</span>
                    <span>Click it, then click <strong>&ldquo;Install&rdquo;</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="grid place-items-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">3</span>
                    <span>Or use the browser menu → <strong>Install Sentinel</strong></span>
                  </li>
                </ol>
              </div>
            )}

            <Button onClick={() => setShowInstructions(false)} className="btn-pill w-full h-10 mt-5">
              Got it
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
