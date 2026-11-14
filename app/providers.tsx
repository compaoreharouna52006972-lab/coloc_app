'use client'

import type { ReactNode } from 'react'
import ErrorBoundary from '@/components/ErrorBoundary'
import { ToastProvider } from '@/contexts/ToastContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { ApartmentProvider } from '@/contexts/ApartmentContext'
import RegisterSW from '@/components/RegisterSW'

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <ApartmentProvider>
            <RegisterSW />
            {children}
          </ApartmentProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}
