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
      <main className="p-6">
        {children}
      </main>
      <ToastContainer />
    </div>
  )
}

