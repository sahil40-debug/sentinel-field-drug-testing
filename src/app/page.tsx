'use client'

import { useApp } from '@/lib/store'
import { AppShell } from '@/components/drug-test/app-shell'
import { LoginView } from '@/components/drug-test/views/login'
import { DashboardView } from '@/components/drug-test/views/dashboard'
import { NewTestView } from '@/components/drug-test/views/new-test'
import { HistoryView } from '@/components/drug-test/views/history'
import { RecordDetailView } from '@/components/drug-test/views/record-detail'
import { VerificationView } from '@/components/drug-test/views/verification'

export default function Home() {
  const { authed, view } = useApp()

  if (!authed) return <LoginView />

  let body: React.ReactNode
  switch (view) {
    case 'dashboard':
      body = <DashboardView />
      break
    case 'new-test':
      body = <NewTestView />
      break
    case 'history':
      body = <HistoryView />
      break
    case 'record-detail':
      body = <RecordDetailView />
      break
    case 'verification':
      body = <VerificationView />
      break
    default:
      body = <DashboardView />
  }

  return <AppShell>{body}</AppShell>
}
