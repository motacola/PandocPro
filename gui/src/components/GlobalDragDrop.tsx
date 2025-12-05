import React, { useState, useEffect, useCallback } from 'react'
import { FileUp } from 'lucide-react'

interface GlobalDragDropProps {
  onDrop: (files: FileList) => void
  children: React.ReactNode
}

export const GlobalDragDrop: React.FC<GlobalDragDropProps> = ({ onDrop, children }) => {
  const [isDragging, setIsDragging] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter((prev) => prev + 1)
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter((prev) => prev - 1)
    if (dragCounter - 1 === 0) {
      setIsDragging(false)
    }
  }, [dragCounter])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      setDragCounter(0)
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onDrop(e.dataTransfer.files)
      }
    },
    [onDrop]
  )

  useEffect(() => {
    // Prevent default browser behavior for drag/drop globally
    const preventDefault = (e: DragEvent) => e.preventDefault()
    window.addEventListener('dragover', preventDefault)
    window.addEventListener('drop', preventDefault)
    return () => {
      window.removeEventListener('dragover', preventDefault)
      window.removeEventListener('drop', preventDefault)
    }
  }, [])

  return (
    <div
      className='global-drag-wrapper'
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className='global-drag-overlay fade-in'>
          <div className='drag-overlay-content'>
            <div className='drag-icon-circle'>
              <FileUp size={64} />
            </div>
            <h2>Drop file to convert</h2>
          </div>
        </div>
      )}
      {children}
    </div>
  )
}
