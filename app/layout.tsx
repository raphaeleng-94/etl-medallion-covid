import type { Metadata } from 'next'
import './globals.css'
import { DashboardProvider } from '@/store/dashboard'

export const metadata: Metadata = {
  title: 'COVID-19 · Medallion ETL Dashboard',
  description: 'Interactive analytics powered by Bronze→Silver→Gold ETL pipeline on Supabase',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="h-full">
        <DashboardProvider>
          {children}
        </DashboardProvider>
      </body>
    </html>
  )
}
