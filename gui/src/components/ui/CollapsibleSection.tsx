import React, { useState } from 'react'

export interface CollapsibleSectionProps {
  title: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultOpen = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={`collapsible-section ${isOpen ? 'open' : 'closed'} ${className}`}>
      <button className='collapsible-header' onClick={() => setIsOpen(!isOpen)}>
        <span className='chevron'>▶</span>
        <span className='title'>{title}</span>
      </button>
      <div className='collapsible-content'>
        <div className='collapsible-inner'>{children}</div>
      </div>
    </div>
  )
}
