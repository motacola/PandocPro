import { motion, HTMLMotionProps } from 'framer-motion'
import { forwardRef } from 'react'

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading, children, className = '', disabled, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden'
    
    const variantClasses = {
      primary: 'bg-gradient-to-br from-primary-600 via-primary-500 to-accent-600 text-white hover:shadow-glow hover:shadow-primary-500/50 hover:-translate-y-0.5 active:translate-y-0 shadow-lg border border-primary-400/30 hover:border-primary-400/50',
      secondary: 'bg-gradient-to-br from-neutral-700/60 to-neutral-800/50 backdrop-blur-md text-white hover:from-neutral-600/70 hover:to-neutral-700/60 border border-neutral-500/30 hover:border-neutral-400/40 shadow-md',
      ghost: 'text-neutral-300 hover:bg-neutral-800/60 hover:text-white backdrop-blur-sm border border-transparent hover:border-neutral-700/50',
      danger: 'bg-gradient-to-br from-error-600 via-error-500 to-error-700 text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] hover:-translate-y-0.5 shadow-lg border border-error-400/30 hover:border-error-400/50',
    }
    
    const sizeClasses = {
      sm: 'px-4 py-2 text-sm gap-1.5',
      md: 'px-5 py-2.5 text-base gap-2',
      lg: 'px-8 py-3.5 text-lg gap-2.5',
    }

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {/* Shine effect on hover */}
        {variant === 'primary' && !disabled && !isLoading && (
          <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        )}
        
        {isLoading ? (
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : null}
        {children}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'
