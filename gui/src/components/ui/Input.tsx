import { forwardRef, InputHTMLAttributes } from 'react'
import { Search, AlertCircle } from 'lucide-react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', type = 'text', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-sm font-semibold text-text-secondary">
            {label}
            {props.required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              {leftIcon}
            </div>
          )}
          
          <input
            ref={ref}
            type={type}
            className={`
              w-full px-4 py-2.5 rounded-xl
              bg-bg-secondary/80 backdrop-blur-sm border border-border-primary
              text-text-primary placeholder:text-text-muted
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500
              focus:bg-bg-secondary focus:shadow-lg focus:shadow-primary-500/10
              hover:border-border-primary/60
              disabled:opacity-50 disabled:cursor-not-allowed
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon ? 'pr-10' : ''}
              ${error ? 'border-error-500 focus:ring-error-500/50 focus:border-error-500' : ''}
              ${className}
            `}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
              {rightIcon}
            </div>
          )}
          
          {error && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-error-500">
              <AlertCircle size={18} />
            </div>
          )}
        </div>
        
        {error && (
          <p className="text-xs text-error-500 flex items-center gap-1">
            {error}
          </p>
        )}
        
        {helperText && !error && (
          <p className="text-xs text-text-tertiary">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

// Search Input variant
export const SearchInput = forwardRef<HTMLInputElement, Omit<InputProps, 'leftIcon'>>(
  (props, ref) => {
    return <Input ref={ref} leftIcon={<Search size={18} />} {...props} />
  }
)

SearchInput.displayName = 'SearchInput'