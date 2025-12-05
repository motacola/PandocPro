import React, { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { SegmentedControl } from '../ui/SegmentedControl'
import type { SystemInfo, SettingsData, TelemetryEntry, Persona } from '../../type/pandoc-pro'
import { CollapsibleSection } from '../ui/CollapsibleSection'
import { Plus, X, Save } from 'lucide-react'
import { Button } from '../ui'
import { AiSetup } from '../AiSetup'

interface SettingsViewProps {
  systemInfo: SystemInfo | null
  settings: SettingsData | null
  theme: 'light' | 'dark'
  onThemeChange: (theme: 'light' | 'dark') => void
  onUpdateSettings: (payload: Partial<SettingsData>) => Promise<SettingsData>
  onChooseDocsPath: () => Promise<SettingsData | null>
  onChooseReferenceDoc: () => Promise<SettingsData | null>
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
  onChooseReferenceDoc,
  telemetry,
  onReloadLlmStatus,
}) => {
  const [dirtySettings, setDirtySettings] = useState<boolean>(false)
  const [personas, setPersonas] = useState<Persona[]>([])
  const [newPersonaName, setNewPersonaName] = useState('')
  const [newPersonaInstruction, setNewPersonaInstruction] = useState('')

  useEffect(() => {
    window.pandocPro.getPersonas().then(setPersonas).catch(console.error)
  }, [])

  const handleAddPersona = async () => {
    if (!newPersonaName || !newPersonaInstruction) return
    const newPersona: Persona = {
      id: crypto.randomUUID(),
      name: newPersonaName,
      instruction: newPersonaInstruction,
      icon: '🤖'
    }
    const updated = [...personas, newPersona]
    setPersonas(updated)
    await window.pandocPro.savePersonas(updated)
    setNewPersonaName('')
    setNewPersonaInstruction('')
  }

  const handleDeletePersona = async (id: string) => {
    if (!confirm('Delete this persona?')) return
    const updated = personas.filter(p => p.id !== id)
    setPersonas(updated)
    await window.pandocPro.savePersonas(updated)
  }

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

            <CollapsibleSection title='Reference Template (Word)' defaultOpen={true} className='settings-card'>
              <p className='text-sm text-dimmed mb-2'>
                Use a custom Word document as a style template for exports.
              </p>
              {settings.referenceDoc ? (
                <div className='setting-row'>
                  <code className='path-display compact'>{settings.referenceDoc}</code>
                  <button className='secondary small' onClick={onChooseReferenceDoc}>Change</button>
                </div>
              ) : (
                <div className='empty-setting'>
                  <span className='text-sm italic'>Using Default Template</span>
                  <button className='secondary small' onClick={onChooseReferenceDoc}>Select File...</button>
                </div>
              )}
            </CollapsibleSection>

            <CollapsibleSection title='AI Configuration' defaultOpen={false} className='settings-card'>
              <AiSetup onConfigured={onReloadLlmStatus} />
            </CollapsibleSection>

            <CollapsibleSection title="Editorial Board (AI Personas)">
        <p className="description">Define custom AI agents to appear in your editor toolbar.</p>
        
        <div className="personas-list">
          {personas.map(p => (
            <div key={p.id} className="persona-item card" style={{ padding: '0.75rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{p.icon} {p.name}</strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>{p.instruction}</p>
              </div>
              <button className="icon-only danger" onClick={() => handleDeletePersona(p.id)} title="Delete">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>

        <div className="add-persona-form card" style={{ padding: '1rem', marginTop: '1rem', background: 'var(--bg-tertiary)' }}>
          <h4 style={{ margin: '0 0 0.5rem 0' }}>Add New Persona</h4>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <input 
              type="text" 
              placeholder="Name (e.g. The SEO Expert)" 
              value={newPersonaName}
              onChange={(e) => setNewPersonaName(e.target.value)}
              className="input"
            />
            <textarea 
              placeholder="System Instruction (e.g. Optimize this text for search engines using keywords...)" 
              value={newPersonaInstruction}
              onChange={(e) => setNewPersonaInstruction(e.target.value)}
              className="input"
              rows={2}
            />
            <button className="primary small" onClick={handleAddPersona} disabled={!newPersonaName || !newPersonaInstruction}>
              <Plus size={16} /> Add Persona
            </button>
          </div>
        </div>
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
