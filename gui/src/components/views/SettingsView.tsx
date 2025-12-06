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
  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'personas' | 'advanced'>('general')
  const [dirtySettings, setDirtySettings] = useState<boolean>(false)
  const [personas, setPersonas] = useState<Persona[]>([])
  
  // Personas State
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

  const renderContent = () => {
    if (!systemInfo || !settings) return null

    switch (activeTab) {
      case 'general':
        return (
          <div className="fade-in">
            <h2>General Settings</h2>
            
            <div className='settings-section-card'>
              <h3>Appearance</h3>
              <label className='toggle-row' style={{marginTop: '1rem'}}>
                <span>Dark Mode</span>
                <input
                  type='checkbox'
                  checked={theme === 'dark'}
                  onChange={(e) => onThemeChange(e.target.checked ? 'dark' : 'light')}
                />
              </label>
            </div>

            <div className='settings-section-card'>
               <h3>Workspace</h3>
               <p className="description">Where your documents are synced.</p>
               <div className="setting-row" style={{ marginTop: '1rem' }}>
                 <code className='path-display'>{settings.docsPath}</code>
                 <button className='secondary' onClick={onChooseDocsPath}>Change Folder</button>
               </div>
            </div>

            <div className='settings-section-card'>
              <h3>Reference Template</h3>
              <p className="description">Custom Word styling template.</p>
              <div style={{ marginTop: '1rem' }}>
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
              </div>
            </div>
            
             <div className='settings-section-card'>
              <h3>System Info</h3>
              <div className='setting-row' style={{marginTop: '1rem'}}>
                <span>Pandoc Version</span>
                <span className='badge badge-neutral'>{systemInfo.pandocVersion || 'Not Installed'}</span>
              </div>
              <div className='setting-row'>
                <span>Node.js Version</span>
                <span className='badge badge-neutral'>{systemInfo.nodeVersion}</span>
              </div>
            </div>
          </div>
        )

      case 'ai':
        return (
          <div className="fade-in">
            <h2>Artificial Intelligence</h2>
            <div className='settings-section-card' style={{ padding: 0, overflow: 'hidden' }}>
              <AiSetup onConfigured={onReloadLlmStatus} />
            </div>
          </div>
        )

      case 'personas':
        return (
           <div className="fade-in">
             <h2>Editorial Board</h2>
             <p className="description" style={{ marginBottom: '1.5rem' }}>Create custom personas to appear in your editor's AI menu.</p>

             <div className="personas-list">
               {personas.map(p => (
                 <div key={p.id} className="persona-item card" style={{ padding: '1rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                     <div style={{ fontSize: '1.5rem', background: 'var(--bg-tertiary)', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
                       {p.icon}
                     </div>
                     <div>
                       <div style={{ fontWeight: 600 }}>{p.name}</div>
                       <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{p.instruction}</div>
                     </div>
                   </div>
                   <button className="icon-only danger" onClick={() => handleDeletePersona(p.id)} title="Delete">
                     <X size={18} />
                   </button>
                 </div>
               ))}
             </div>

             <div className='settings-section-card' style={{ marginTop: '2rem', background: 'var(--bg-tertiary)' }}>
               <h4>Add New Persona</h4>
               <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                 <input 
                   type="text" 
                   placeholder="Name (e.g. The SEO Expert)" 
                   value={newPersonaName}
                   onChange={(e) => setNewPersonaName(e.target.value)}
                   className="input"
                 />
                 <textarea 
                   placeholder="System Instruction (e.g. You are an expert SEO copywriter. Rewrite this text to...)" 
                   value={newPersonaInstruction}
                   onChange={(e) => setNewPersonaInstruction(e.target.value)}
                   className="input"
                   rows={3}
                 />
                 <div style={{ display: 'flex', justifySelf: 'end' }}>
                     <button className="primary" onClick={handleAddPersona} disabled={!newPersonaName || !newPersonaInstruction}>
                       <Plus size={16} /> Add Persona
                     </button>
                 </div>
               </div>
             </div>
           </div>
        )

      case 'advanced':
         return (
           <div className="fade-in">
             <h2>Advanced</h2>
             
             <div className='settings-section-card'>
               <h3>Notifications</h3>
               <label className='toggle-row' style={{marginTop: '1rem'}}>
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
             </div>

             <div className='settings-section-card'>
               <h3>Telemetry Stats</h3>
                 <div className='stats-summary' style={{ marginTop: '1rem' }}>
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
               </div>
             </div>
           </div>
         )
    }
  }

  return (
    <div className='settings-layout view-settings'>
       {/* Sidebar */}
       <div className='settings-sidebar'>
          <div className='settings-sidebar-nav'>
            <div 
              className={`settings-nav-item ${activeTab === 'general' ? 'active' : ''}`}
              onClick={() => setActiveTab('general')}
            >
              General
            </div>
            <div 
              className={`settings-nav-item ${activeTab === 'ai' ? 'active' : ''}`}
              onClick={() => setActiveTab('ai')}
            >
              AI Models
            </div>
            <div 
              className={`settings-nav-item ${activeTab === 'personas' ? 'active' : ''}`}
              onClick={() => setActiveTab('personas')}
            >
              Editorial Board
            </div>
             <div 
              className={`settings-nav-item ${activeTab === 'advanced' ? 'active' : ''}`}
              onClick={() => setActiveTab('advanced')}
            >
              Advanced
            </div>
          </div>
       </div>

       {/* Content Area */}
       <div className='settings-content'>
         {renderContent()}
       </div>
    </div>
  )
}
