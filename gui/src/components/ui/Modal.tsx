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

  // Close on Escape and keep keyboard focus in the dialog while open.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusableElements.length === 0) {
          e.preventDefault()
          return
        }
        const first = focusableElements[0]
        const last = focusableElements[focusableElements.length - 1]
        const active = document.activeElement

        if (e.shiftKey && active === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return
    modalRef.current?.focus()
  }, [isOpen])

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return ReactDOM.createPortal(
    <div className='modal-backdrop' onClick={handleBackdropClick}>
      <div 
        className={`modal-card modal-${size} ${className}`} 
        role='dialog'
        aria-modal='true'
        tabIndex={-1}
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
