import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
}

export const Card = ({ children, className = '', hover = false, onClick }: CardProps) => {
  const Component = onClick ? motion.button : motion.div

  return (
    <Component
      className={`
        bg-card-bg/80 backdrop-blur-xl border border-card-border rounded-2xl
        transition-all duration-300 relative overflow-hidden
        ${hover ? 'hover:shadow-xl hover:-translate-y-2 hover:border-primary-500/40 hover:bg-card-hover' : ''}
        ${onClick ? 'cursor-pointer text-left w-full' : ''}
        ${className}
      `}
      onClick={onClick}
      whileHover={hover ? { scale: 1.01 } : undefined}
      whileTap={onClick ? { scale: 0.99 } : undefined}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-accent-500/5 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </Component>
  )
}