'use client'

import { useApp, type View } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { LogoMark } from './ui-bits'
import {
  LayoutDashboard,
  FlaskRound,
  History,
  ShieldCheck,
  LogOut,
  type LucideIcon,
} from 'lucide-react'

interface NavItem {
  view: View
  label: string
  icon: LucideIcon
}

const NAV: NavItem[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'new-test', label: 'New Test', icon: FlaskRound },
  { view: 'history', label: 'History', icon: History },
  { view: 'verification', label: 'Verify', icon: ShieldCheck },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const { view, setView, logout, operatorId, analysis, resetFlow } = useApp()

  const handleNewTest = () => {
    // If a result is showing from a previous test, start a fresh flow.
    if (analysis) resetFlow()
    setView('new-test')
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex h-16 items-center gap-3 px-4">
          <div className="flex items-center gap-2.5">
            <LogoMark size={34} />
            <div className="leading-tight">
              <div className="font-serif-display text-base font-semibold">Sentinel</div>
              <div className="text-[10px] text-muted-foreground tracking-wide">Field Drug Testing · SIH 2026</div>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 mx-auto">
            {NAV.map((item) => {
              const Icon = item.icon
              const active = view === item.view
              const onClick = item.view === 'new-test' ? handleNewTest : () => setView(item.view)
              return (
                <Button
                  key={item.view}
                  variant={active ? 'default' : 'ghost'}
                  size="sm"
                  onClick={onClick}
                  className={cn('btn-pill gap-1.5 font-medium', active && 'shadow-sm')}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              )
            })}
          </nav>

          <div className="ml-auto md:ml-0 flex items-center gap-2">
            <span className="hidden sm:inline pill bg-secondary/60 text-secondary-foreground">{operatorId}</span>
            <Button variant="ghost" size="sm" onClick={logout} className="gap-1.5 rounded-xl">
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="md:hidden flex gap-1 overflow-x-auto px-3 pb-2.5 scroll-soft">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = view === item.view
            const onClick = item.view === 'new-test' ? handleNewTest : () => setView(item.view)
            return (
              <Button
                key={item.view}
                variant={active ? 'default' : 'ghost'}
                size="sm"
                onClick={onClick}
                className={cn('btn-pill gap-1.5 shrink-0', active && 'shadow-sm')}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Button>
            )
          })}
        </nav>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">{children}</main>

      <footer className="border-t border-border/60 bg-background/60 backdrop-blur-sm mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-4 text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-serif-display font-medium text-foreground/80">Sentinel</span>
          <span className="opacity-40">·</span>
          <span>Digital Companion for Field Drug Testing</span>
          <span className="opacity-40 hidden sm:inline">·</span>
          <span className="hidden sm:inline">Presumptive results only — not laboratory confirmation.</span>
        </div>
      </footer>
    </div>
  )
}
