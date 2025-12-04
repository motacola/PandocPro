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
      className={`bg-card-bg border border-card-border rounded-lg backdrop-blur-md transition-all duration-300 ${
        hover ? 'hover:shadow-medium hover:-translate-y-1 hover:border-primary-500/30' : ''
      } ${onClick ? 'cursor-pointer text-left w-full' : ''} ${className}`}
      onClick={onClick}
      whileHover={hover ? { scale: 1.01 } : undefined}
      whileTap={onClick ? { scale: 0.99 } : undefined}
    >
      {children}
    </Component>
  )
}