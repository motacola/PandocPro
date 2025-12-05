import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import ReactDOM from 'react-dom'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  className = '',
}) => {
  const modalRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Focus trap could go here, but kept simple for now

  if (!isOpen) return null

  return ReactDOM.createPortal(
    <div className='modal-backdrop' onClick={onClose} role='dialog' aria-modal='true'>
      <div 
        className={`modal-card modal-${size} ${className}`} 
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
      >
        <div className='modal-header'>
          {title && <h3 className='modal-title'>{title}</h3>}
          <button 
            className='modal-close-btn' 
            onClick={onClose}
            aria-label='Close modal'
          >
            <X size={20} />
          </button>
        </div>
        <div className='modal-body'>{children}</div>
        {footer && <div className='modal-footer'>{footer}</div>}
      </div>
    </div>,
    document.body
  )
}
