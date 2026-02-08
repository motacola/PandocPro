import React from 'react'

const ShortcutsModal = ({ onClose }: { onClose: () => void }) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      onClose()
    }
  }

  return (
    <div
      className='modal-backdrop'
      onClick={onClose}
      role='button'
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className='modal-card' onClick={(e) => e.stopPropagation()}>
        <h3>Keyboard Shortcuts</h3>
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
        <button className='primary full-width' onClick={onClose}>Close</button>
      </div>
    </div>
  )
}

export default ShortcutsModal
