import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CS2 LootHub - Ultimate Gaming Platform',
  description: 'Play CS2-inspired mini-games, open cases, and compete!',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1A1D29',
              color: '#fff',
              border: '1px solid #2A2D3A',
            },
            success: {
              iconTheme: {
                primary: '#00FF9C',
                secondary: '#1A1D29',
              },
            },
            error: {
              iconTheme: {
                primary: '#FF4655',
                secondary: '#1A1D29',
              },
            },
          }}
        />
      </body>
    </html>
  )
}