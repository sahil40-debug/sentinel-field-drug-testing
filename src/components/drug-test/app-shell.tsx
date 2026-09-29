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
  { view: 'history', label: 'Test History', icon: History },
  { view: 'verification', label: 'Verification', icon: ShieldCheck },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const { view, setView, logout, operatorId } = useApp()
  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* top bar (mobile + desktop) */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-4">
          <div className="flex items-center gap-2">
            <LogoMark size={28} />
            <div className="leading-tight">
              <div className="text-sm font-semibold">Field Drug Testing</div>
              <div className="text-[10px] text-muted-foreground">Digital Companion · SIH 2026</div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:inline text-xs text-muted-foreground">{operatorId}</span>
            <Button variant="ghost" size="sm" onClick={logout} className="gap-1.5">
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </div>
        </div>
        {/* horizontal nav (mobile-first) */}
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = view === item.view
            return (
              <Button
                key={item.view}
                variant={active ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView(item.view)}
                className={cn('gap-1.5 shrink-0', active && 'shadow-sm')}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Button>
            )
          })}
        </nav>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6">{children}</main>

      <footer className="border-t bg-background mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-3 text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>Digital Companion for Field Drug Testing</span>
          <span className="opacity-60">·</span>
          <span>Presumptive results only — not laboratory confirmation.</span>
        </div>
      </footer>
    </div>
  )
}
