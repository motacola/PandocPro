import React from 'react'
import { motion } from 'framer-motion'
import './ProgressBar.css'

interface ProgressBarProps {
  progress: number // 0-100
  status?: 'active' | 'success' | 'error'
  label?: string
  showPercentage?: boolean
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  status = 'active',
  label,
  showPercentage = true,
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress))

  return (
    <div className='progress-bar-container'>
      {label && <div className='progress-label'>{label}</div>}
      <div className={`progress-bar ${status}`}>
        <motion.div
          className='progress-fill'
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
        {showPercentage && (
          <span className='progress-text'>{Math.round(clampedProgress)}%</span>
        )}
      </div>
    </div>
  )
}
