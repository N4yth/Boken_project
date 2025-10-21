import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Boken App',
  description: '...',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="EN">
      <body>{children}</body>
    </html>
  )
}
