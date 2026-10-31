import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hear Me Out — We Are All Evil | Halloween Special M06',
  description:
    "Hear Me Out presents We Are All Evil 🎭 Halloween Special. One expert, one battle of morals, one game of deception on 31 October 2026 at Monkey Cafe, Ahmedabad.",
  generator: 'v0.app',
  openGraph: {
    title: 'Hear Me Out — We Are All Evil (M06 Halloween Special)',
    description:
      'How good are you when no one is watching? An expert exploration with Dr. Harshil Vyas, a live moral debate, and a psychological Mafia game on 31 October 2026 at Monkey Cafe, Ahmedabad.',
    type: 'website',
  },
  icons: {
    icon: [{ url: '/icon.svg?v=2', type: 'image/svg+xml' }],
    apple: '/icon.svg?v=2',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#e4472e',
  userScalable: false,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
