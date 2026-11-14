import type { Metadata, Viewport } from 'next'
import './globals.css'
import Providers from './providers'

export const metadata: Metadata = {
  title: 'Appart 4B',
  description: 'Gestion de l\'appartement : dettes, factures, tâches, inventaire, messagerie.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
  appleWebApp: { capable: true, title: 'Appart 4B', statusBarStyle: 'black-translucent' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#182521',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
