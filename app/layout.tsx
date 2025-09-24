import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Meva Panel & Muhasebe',
  description: 'Hac & Umre ERP Sistemi - Grup Yönetimi, Katılımcılar, Odalama, Finans',
  generator: 'Meva Panel',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body>{children}</body>
    </html>
  )
}
