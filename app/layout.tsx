import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

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
      <body>
        {children}
        <Toaster
          position="top-center"
          containerStyle={{
            top: 80,
            zIndex: 9999,
          }}
          toastOptions={{
            style: {
              background: '#1A1D29',
              color: '#fff',
              border: '1px solid #2A2D3A',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
              borderRadius: '8px',
              padding: '16px',
              maxWidth: '500px',
            },
            success: {
              iconTheme: {
                primary: '#00FF9C',
                secondary: '#1A1D29',
              },
              duration: 3000,
            },
            error: {
              iconTheme: {
                primary: '#FF4655',
                secondary: '#1A1D29',
              },
              duration: 4000,
            },
          }}
        />
      </body>
    </html>
  )
}