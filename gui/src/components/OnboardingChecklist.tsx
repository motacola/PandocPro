import { useState } from 'react'
import type { SettingsData, SystemInfo } from '../type/pandoc-pro'

interface Props {
  systemInfo: SystemInfo | null
  settings: SettingsData | null
  onClose: () => void
}

const steps = [
  { key: 'pandoc', label: 'Pandoc installed' },
  { key: 'node', label: 'Node.js detected' },
  { key: 'docs', label: 'Docs folder set' },
  { key: 'shortcuts', label: 'Learn shortcuts (S / Shift+S / E / 1-4)' },
]

export function OnboardingChecklist({ systemInfo, settings, onClose }: Props) {
  const [ackShortcuts, setAckShortcuts] = useState(false)

  const status = {
    pandoc: !!systemInfo?.pandocVersion,
    node: !!systemInfo?.nodeVersion,
    docs: !!settings?.docsPath,
    shortcuts: ackShortcuts,
  }

  const allDone = Object.values(status).every(Boolean)

  return (
    <div className='modal-backdrop'>
      <div className='modal'>
        <div className='modal-header'>
          <h3>Welcome to PandocPro</h3>
          <button className='secondary' onClick={onClose} aria-label='Close onboarding'>
            Close
          </button>
        </div>
        <p className='muted'>Quick checklist to ensure everything is ready.</p>
        <ul className='checklist'>
          {steps.map((step) => (
            <li key={step.key}>
              <span className={`badge ${status[step.key as keyof typeof status] ? 'badge-success' : 'badge-warning'}`}>
                {status[step.key as keyof typeof status] ? 'Done' : 'Pending'}
              </span>
              <span>{step.label}</span>
              {step.key === 'shortcuts' && (
                <button className='secondary' onClick={() => setAckShortcuts(true)}>
                  Acknowledge
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className='modal-footer'>
          <button className='secondary' onClick={onClose} disabled={!allDone}>
            {allDone ? 'All set!' : 'Skip for now'}
          </button>
        </div>
      </div>
    </div>
  )
}
