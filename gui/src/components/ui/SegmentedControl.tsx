import React from 'react'
import { motion } from 'framer-motion'
import './SegmentedControl.css'

interface Option<T> {
  label: string
  value: T
  icon?: React.ReactNode
}

interface SegmentedControlProps<T> {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <div className={`segmented-control ${className}`}>
      {options.map((option) => {
        const isSelected = option.value === value
        return (
          <button
            key={option.value}
            className={`segmented-option ${isSelected ? 'selected' : ''}`}
            onClick={() => onChange(option.value)}
          >
            {isSelected && (
              <motion.div
                layoutId='segmented-bg'
                className='segmented-bg'
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
            <span className='segmented-label'>
              {option.icon && <span className='segmented-icon'>{option.icon}</span>}
              {option.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
