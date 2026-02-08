import React, { useEffect, useRef } from 'react'

const ShortcutsModal = ({ onClose }: { onClose: () => void }) => {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    dialogRef.current?.focus()
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [onClose])

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className='modal-backdrop'
      onClick={handleBackdropClick}
    >
      <div
        className='modal-card'
        role='dialog'
        aria-modal='true'
        aria-labelledby='shortcuts-modal-title'
        tabIndex={-1}
        ref={dialogRef}
      >
        <h3 id='shortcuts-modal-title'>Keyboard Shortcuts</h3>
        <div className='shortcuts-grid'>
          <div className='shortcut-row'>
            <span className='shortcut-desc'>Save Markdown</span>
            <span className='shortcut-keys'><kbd>Cmd</kbd> + <kbd>S</kbd></span>
          </div>
          <div className='shortcut-row'>
            <span className='shortcut-desc'>Save & Convert to Word</span>
            <span className='shortcut-keys'><kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd></span>
          </div>
          <div className='shortcut-row'>
            <span className='shortcut-desc'>Run Conversion</span>
            <span className='shortcut-keys'><kbd>Cmd</kbd> + <kbd>E</kbd></span>
          </div>
          <div className='shortcut-row'>
            <span className='shortcut-desc'>Toggle Preview</span>
            <span className='shortcut-keys'><kbd>Cmd</kbd> + <kbd>P</kbd></span>
          </div>
          <div className='shortcut-row'>
            <span className='shortcut-desc'>Focus Search</span>
            <span className='shortcut-keys'><kbd>Cmd</kbd> + <kbd>F</kbd></span>
          </div>
          <div className='shortcut-row'>
            <span className='shortcut-desc'>Switch Mode</span>
            <span className='shortcut-keys'><kbd>Cmd</kbd> + <kbd>1-4</kbd></span>
          </div>
          <div className='shortcut-row'>
            <span className='shortcut-desc'>Show Shortcuts</span>
            <span className='shortcut-keys'><kbd>Cmd</kbd> + <kbd>/</kbd></span>
          </div>
          <div className='shortcut-row'>
            <span className='shortcut-desc'>Toggle Sidebar</span>
            <span className='shortcut-keys'><kbd>Cmd</kbd> + <kbd>B</kbd></span>
          </div>
        </div>
        <button className='primary full-width' onClick={onClose} type='button'>Close</button>
      </div>
    </div>
  )
}

export default ShortcutsModal
