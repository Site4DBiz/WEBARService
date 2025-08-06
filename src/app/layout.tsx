import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'WebAR Service - Interactive AR Experience',
  description:
    'Create and experience augmented reality content directly in your web browser using MindAR technology',
  keywords: 'AR, WebAR, MindAR, Augmented Reality, 3D, Interactive',
  authors: [{ name: 'WebAR Service Team' }],
  robots: 'index, follow',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className={inter.className}>
      <body className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        {children}
      </body>
    </html>
  )
}
