import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
}) => {
  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  }

  return (
    <div className={`bg-white rounded-2xl shadow-card ${paddingStyles[padding]} ${className}`}>
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: React.ReactNode
  className?: string
  gradient?: string
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  className = '',
  gradient = 'from-primary-400 to-primary-500',
}) => {
  return (
    <div className={`px-4 py-3 rounded-t-2xl bg-gradient-to-r ${gradient} text-white font-semibold text-center ${className}`}>
      {children}
    </div>
  )
}

interface CardContentProps {
  children: React.ReactNode
  className?: string
}

export const CardContent: React.FC<CardContentProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`p-4 ${className}`}>
      {children}
    </div>
  )
}

