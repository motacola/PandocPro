import { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral'
  size?: 'sm' | 'md'
  className?: string
}

export const Badge = ({ children, variant = 'neutral', size = 'md', className = '' }: BadgeProps) => {
  const variantClasses = {
    success: 'bg-success-500/20 text-success-500 border-success-500/30',
    warning: 'bg-warning-500/20 text-warning-500 border-warning-500/30',
    error: 'bg-error-500/20 text-error-500 border-error-500/30',
    info: 'bg-primary-500/20 text-primary-400 border-primary-500/30',
    neutral: 'bg-neutral-700/40 text-neutral-300 border-neutral-600/30',
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  }

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </span>
  )
}