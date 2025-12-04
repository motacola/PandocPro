import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import type { SystemInfo, SettingsData, TelemetryEntry } from '../../type/pandoc-pro'
import { FileText } from 'lucide-react'
import { Button } from '../ui'
import { AiSetup } from '../AiSetup'

// We need to duplicate CollapsibleSection or export it. 
// For now, I will duplicate it to avoid circular dependencies or complex refactors. 
// Ideally, this should be in components/ui/CollapsibleSection.tsx.
// I'll create a local version here for now.

const CollapsibleSection = ({
  title,
  children,
  defaultOpen = false,
  className = '',
}: {
  title: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
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

interface SettingsViewProps {
  systemInfo: SystemInfo | null
  settings: SettingsData | null
  theme: 'light' | 'dark'
  onThemeChange: (theme: 'light' | 'dark') => void
  onUpdateSettings: (payload: Partial<SettingsData>) => Promise<SettingsData>
  onChooseDocsPath: () => Promise<SettingsData | null>
  telemetry: TelemetryEntry[]
  onReloadLlmStatus: () => void
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  systemInfo,
  settings,
  theme,
  onThemeChange,
  onUpdateSettings,
  onChooseDocsPath,
  telemetry,
  onReloadLlmStatus,
}) => {
  const stats = useMemo(() => {
    let success = 0
    let error = 0
    telemetry.forEach((t) => {
      if (t.event === 'conversion_success') success++
      if (t.event === 'conversion_error') error++
    })
    return { success, error, total: success + error }
  }, [telemetry])

  return (
    <motion.div className='view-settings fade-in'>
      <header className='view-header'>
        <h2>Settings</h2>
      </header>
      <div className='settings-grid'>
        {systemInfo && settings && (
          <>
            <CollapsibleSection title='Appearance' defaultOpen={true} className='settings-card'>
              <label className='toggle-row'>
                <span>Dark Mode</span>
                <input
                  type='checkbox'
                  checked={theme === 'dark'}
                  onChange={(e) => onThemeChange(e.target.checked ? 'dark' : 'light')}
                />
              </label>
            </CollapsibleSection>

            <CollapsibleSection title='Environment' defaultOpen={true} className='settings-card'>
              <div className='setting-row'>
                <span>Pandoc Version</span>
                <span className='badge badge-neutral'>{systemInfo.pandocVersion || 'Not Installed'}</span>
              </div>
              <div className='setting-row'>
                <span>Node.js Version</span>
                <span className='badge badge-neutral'>{systemInfo.nodeVersion}</span>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title='Documents Location' defaultOpen={true} className='settings-card'>
              <code className='path-display'>{settings.docsPath}</code>
              <div className='card-actions'>
                <button className='secondary' onClick={onChooseDocsPath}>
                  Change Folder
                </button>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title='AI Configuration' defaultOpen={false} className='settings-card'>
              <AiSetup onConfigured={onReloadLlmStatus} />
            </CollapsibleSection>

            <CollapsibleSection title='Advanced' defaultOpen={false} className='settings-card'>
              <label className='toggle-row'>
                <span>Desktop Notifications</span>
                <input
                  type='checkbox'
                  checked={settings.notificationsEnabled}
                  onChange={async (event) => {
                    await onUpdateSettings({
                      notificationsEnabled: event.target.checked,
                    })
                  }}
                />
              </label>
            </CollapsibleSection>

            <CollapsibleSection title='Telemetry & Stats' defaultOpen={false} className='settings-card'>
              <div className='stats-summary'>
                <div className='stat-row'>
                  <span>Total Conversions</span>
                  <strong>{stats.total}</strong>
                </div>
                <div className='stat-row'>
                  <span>Success Rate</span>
                  <span className={stats.total > 0 && stats.error === 0 ? 'text-success' : ''}>
                    {stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0}%
                  </span>
                </div>
                <div className='stat-row'>
                  <span>Errors</span>
                  <span className={stats.error > 0 ? 'text-warning' : ''}>{stats.error}</span>
                </div>
              </div>
            </CollapsibleSection>
          </>
        )}
      </div>
    </motion.div>
  )
}
