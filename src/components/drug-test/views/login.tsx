'use client'

import { useState } from 'react'
import { useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LogoMark } from '../ui-bits'
import { ShieldCheck, MapPin, Sparkles, ArrowRight } from 'lucide-react'

export function LoginView() {
  const login = useApp((s) => s.login)
  const [officer, setOfficer] = useState('OFFICER-01')

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left — brand / editorial panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden bg-primary text-primary-foreground">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(at 20% 20%, oklch(0.55 0.1 295) 0px, transparent 50%), radial-gradient(at 80% 60%, oklch(0.5 0.1 320) 0px, transparent 50%), radial-gradient(at 50% 95%, oklch(0.6 0.08 175) 0px, transparent 55%)',
          }}
          aria-hidden
        />
        <div className="relative flex items-center gap-3">
          <LogoMark size={44} />
          <div className="leading-tight">
            <div className="font-serif-display text-xl font-semibold">Sentinel</div>
            <div className="text-xs opacity-70 tracking-wide">Field Drug Testing Companion</div>
          </div>
        </div>

        <div className="relative space-y-6 max-w-md">
          <div className="display-eyebrow text-primary-foreground/70">SIH 2026 · PS-231</div>
          <h1 className="font-serif-display text-5xl font-semibold leading-[1.05] tracking-tight">
            Presumptive field
            <br />
            <span className="italic font-medium opacity-90">drug testing,</span>
            <br />
            digitised & verifiable.
          </h1>
          <p className="text-sm opacity-80 leading-relaxed">
            Capture a colour-change test, let a vision model compare the reaction against the
            expected reference, and produce a GPS-stamped, tamper-evident record — all in the field.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs opacity-80 pt-2">
            <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> AI colour analysis</span>
            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> GPS-stamped records</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Tamper-evident hashes</span>
          </div>
        </div>

        <div className="relative text-xs opacity-60">Presumptive results only — not laboratory confirmation.</div>
      </div>

      {/* Right — sign-in */}
      <div className="grid place-items-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex items-center gap-3">
            <LogoMark size={40} />
            <div className="leading-tight">
              <div className="font-serif-display text-lg font-semibold">Sentinel</div>
              <div className="text-xs text-muted-foreground">Field Drug Testing Companion</div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="display-eyebrow">Sign in</div>
            <h2 className="display-heading text-3xl">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Enter your operator ID to continue.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="officer">Operator ID</Label>
              <Input
                id="officer"
                value={officer}
                onChange={(e) => setOfficer(e.target.value)}
                placeholder="e.g. OFFICER-01"
                onKeyDown={(e) => e.key === 'Enter' && login(officer)}
                className="rounded-xl"
              />
            </div>
            <Button className="btn-pill w-full h-11 text-sm" size="lg" onClick={() => login(officer)}>
              Sign in <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Results are presumptive and do not replace laboratory confirmation.
          </p>
        </div>
      </div>
    </div>
  )
}
