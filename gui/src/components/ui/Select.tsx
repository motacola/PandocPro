import { forwardRef, SelectHTMLAttributes } from 'react'
import { ChevronDown, AlertCircle } from 'lucide-react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
  options: Array<{ value: string; label: string }>
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-sm font-semibold text-text-secondary">
            {label}
            {props.required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          <select
            ref={ref}
            className={`
              w-full px-4 py-2.5 pr-10 rounded-xl appearance-none
              bg-bg-secondary border border-border-primary
              text-text-primary
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? 'border-error-500 focus:ring-error-500/50 focus:border-error-500' : ''}
              ${className}
            `}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
            {error ? <AlertCircle size={18} className="text-error-500" /> : <ChevronDown size={18} />}
          </div>
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

Select.displayName = 'Select'