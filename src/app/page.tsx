'use client'

import { useApp } from '@/lib/store'
import { AppShell } from '@/components/drug-test/app-shell'
import { LoginView } from '@/components/drug-test/views/login'
import { DashboardView } from '@/components/drug-test/views/dashboard'
import { NewTestView } from '@/components/drug-test/views/new-test'
import { HistoryView } from '@/components/drug-test/views/history'
import { RecordDetailView } from '@/components/drug-test/views/record-detail'
import { VerificationView } from '@/components/drug-test/views/verification'
import { AnimatePresence, motion } from 'framer-motion'

// Smooth, premium page transition (inspired by beblessed.io).
// The key is keyed on `view` so AnimatePresence can animate mount/unmount.
const transition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
}

export default function Home() {
  const { authed, view } = useApp()

  if (!authed) {
    return (
      <AnimatePresence mode="wait">
        <motion.div key="login" {...transition}>
          <LoginView />
        </motion.div>
      </AnimatePresence>
    )
  }

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

  return (
    <AppShell>
      <AnimatePresence mode="wait">
        <motion.div key={view} {...transition}>
          {body}
        </motion.div>
      </AnimatePresence>
    </AppShell>
  )
}
