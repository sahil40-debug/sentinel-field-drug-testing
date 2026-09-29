'use client'

import { useState } from 'react'
import { useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LogoMark } from '../ui-bits'
import { FlaskConical, ShieldCheck } from 'lucide-react'

export function LoginView() {
  const login = useApp((s) => s.login)
  const [officer, setOfficer] = useState('OFFICER-01')

  return (
    <div className="min-h-screen grid place-items-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <LogoMark size={48} />
          </div>
          <CardTitle className="text-2xl">Digital Companion for Field Drug Testing</CardTitle>
          <CardDescription>Smart India Hackathon 2026 — PS-231</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="officer">Operator ID</Label>
            <Input
              id="officer"
              value={officer}
              onChange={(e) => setOfficer(e.target.value)}
              placeholder="e.g. OFFICER-01"
              onKeyDown={(e) => e.key === 'Enter' && login(officer)}
            />
          </div>
          <Button className="w-full" size="lg" onClick={() => login(officer)}>
            Sign in
          </Button>
          <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              Presumptive analysis
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Tamper-evident records
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground pt-1">
            Results are presumptive and do not replace laboratory confirmation.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
