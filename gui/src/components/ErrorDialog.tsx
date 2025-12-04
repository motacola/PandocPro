import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, CheckCircle, XCircle, ExternalLink } from 'lucide-react'
import { Button } from './ui'
import './ErrorDialog.css'

interface ErrorAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
  external?: boolean
}

interface ErrorDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  problem: string
  solution: string
  actions?: ErrorAction[]
  severity?: 'error' | 'warning' | 'info'
}

export const ErrorDialog: React.FC<ErrorDialogProps> = ({
  isOpen,
  onClose,
  title,
  problem,
  solution,
  actions = [],
  severity = 'error',
}) => {
  const icons = {
    error: <XCircle className='w-12 h-12 text-red-500' />,
    warning: <AlertCircle className='w-12 h-12 text-yellow-500' />,
    info: <CheckCircle className='w-12 h-12 text-blue-500' />,
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className='error-dialog-overlay'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className='error-dialog'
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className={`error-dialog-icon ${severity}`}>
              {icons[severity]}
            </div>
            
            <h2 className='error-dialog-title'>{title}</h2>
            
            <div className='error-dialog-content'>
              <div className='error-section'>
                <h4 className='error-section-title'>❌ What went wrong:</h4>
                <p className='error-section-text'>{problem}</p>
              </div>

              <div className='error-section'>
                <h4 className='error-section-title'>✅ How to fix it:</h4>
                <p className='error-section-text'>{solution}</p>
              </div>
            </div>

            <div className='error-dialog-actions'>
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'secondary'}
                  onClick={action.onClick}
                >
                  {action.label}
                  {action.external && <ExternalLink className='w-4 h-4 ml-2' />}
                </Button>
              ))}
              <Button variant='secondary' onClick={onClose}>
                Close
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
