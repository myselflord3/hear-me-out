import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Here Me Out — Movie or Experience?',
  description: "Here Me Out: Movie or Experience? Join Ahmedabad's community debate on what matters more — a great movie or a great experience.",
  generator: 'v0.app',
  openGraph: {
    title: 'Here Me Out — Movie or Experience?',
    description: "What matters more, a great movie or a great experience? Live at Monkey Cafe, Drive-in Cinema on 10 October 2026.",
    type: 'website',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f4c430',
  userScalable: false,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
