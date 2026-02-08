import React from 'react'
import { motion } from 'framer-motion'

interface ToggleButtonProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}

export const ToggleButton: React.FC<ToggleButtonProps> = ({ checked, onChange, label }) => {
  return (
    <label className='toggle-row'>
      <span>{label}</span>
      <div
        className={`toggle-switch ${checked ? 'checked' : ''}`}
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onChange(!checked)
          }
        }}
      >
        <motion.div className="toggle-handle" layout transition={{ type: 'spring', stiffness: 700, damping: 30 }} />
      </div>
    </label>
  )
}
