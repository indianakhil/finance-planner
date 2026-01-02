import React from 'react'
import { Header } from './Header'
import { ToastContainer } from '../ui/Toast'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="p-3 md:p-6 pb-6 md:pb-6">
        {children}
      </main>
      <ToastContainer />
    </div>
  )
}

