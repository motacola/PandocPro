import React, { useState, useMemo, useEffect } from 'react'


import type { SystemInfo, SettingsData, TelemetryEntry, Persona } from '../../type/pandoc-pro'
import { Plus, X, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react'
import { AiSetup } from '../AiSetup'

import { ToggleButton } from '../ui/ToggleButton'

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
    let largeDocs = 0
    const conversionDurations: number[] = []
    const analysisDurations: number[] = []

    const getDuration = (entry: TelemetryEntry) => {
      if (!entry.metadata || typeof entry.metadata !== 'object') {
        return null
      }
      const value = (entry.metadata as Record<string, unknown>).durationMs
      return typeof value === 'number' ? value : null
    }

    telemetry.forEach((t) => {
      if (t.event === 'conversion_success') success++
      if (t.event === 'conversion_error') error++
      if (t.event === 'large_document_processed') largeDocs++
      if (t.event === 'conversion_duration_ms') {
        const duration = getDuration(t)
        if (duration !== null) conversionDurations.push(duration)
      }
      if (t.event === 'analysis_duration_ms') {
        const duration = getDuration(t)
        if (duration !== null) analysisDurations.push(duration)
      }
    })

    const avgConversionMs = conversionDurations.length > 0
      ? Math.round(conversionDurations.reduce((sum, duration) => sum + duration, 0) / conversionDurations.length)
      : 0
    const avgAnalysisMs = analysisDurations.length > 0
      ? Math.round(analysisDurations.reduce((sum, duration) => sum + duration, 0) / analysisDurations.length)
      : 0

    return {
      success,
      error,
      total: success + error,
      largeDocs,
      avgConversionMs,
      avgAnalysisMs,
    }
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
              <ToggleButton
                label="Dark Mode"
                checked={theme === 'dark'}
                onChange={(checked) => onThemeChange(checked ? 'dark' : 'light')}
              />
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>System Health</h3>
                <button className='secondary small' onClick={() => window.location.reload()}>
                  <RefreshCw size={14} style={{ marginRight: '6px' }} /> Re-scan
                </button>
              </div>
              
              <div className='setting-row'>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {systemInfo.pandocVersion ? <CheckCircle size={18} className='text-success' /> : <XCircle size={18} className='text-error' />}
                  <span>Pandoc</span>
                </div>
                {systemInfo.pandocVersion ? (
                  <span className='badge badge-success' title={systemInfo.pandocVersion}>Installed ({systemInfo.pandocVersion.split(' ')[1] || 'Detected'})</span>
                ) : (
                  <span className='badge badge-error'>Not Found</span>
                )}
              </div>
              <div className='setting-row'>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <CheckCircle size={18} className='text-success' />
                   <span>Node.js</span>
                </div>
                <span className='badge badge-success'>{systemInfo.nodeVersion}</span>
              </div>
               <div className='setting-row'>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {systemInfo.ollamaVersion ? <CheckCircle size={18} className='text-success' /> : <AlertTriangle size={18} className='text-warning' />}
                  <span>Ollama (Optional)</span>
                </div>
                {systemInfo.ollamaVersion ? (
                  <span className='badge badge-success'>{systemInfo.ollamaVersion}</span>
                ) : (
                  <span className='badge badge-neutral'>Not Installed</span>
                )}
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
               <ToggleButton
                 label="Desktop Notifications"
                 checked={settings.notificationsEnabled}
                 onChange={async (checked) => {
                   try {
                     await onUpdateSettings({
                       notificationsEnabled: checked,
                     })
                   } catch (err) {
                     console.error('Failed to update settings:', err)
                     // Ideally we would show a toast here, but we don't have addToast prop in this component yet.
                     // For now, console error is better than crash.
                   }
                 }}
               />
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
                 <div className='stat-row'>
                   <span>Avg Conversion Time</span>
                   <span>{stats.avgConversionMs} ms</span>
                 </div>
                 <div className='stat-row'>
                   <span>Avg Analysis Time</span>
                   <span>{stats.avgAnalysisMs} ms</span>
                 </div>
                 <div className='stat-row'>
                   <span>Large Documents Processed</span>
                   <strong>{stats.largeDocs}</strong>
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
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveTab('general') }}
            >
              General
            </div>
            <div 
              className={`settings-nav-item ${activeTab === 'ai' ? 'active' : ''}`}
              onClick={() => setActiveTab('ai')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveTab('ai') }}
            >
              AI Models
            </div>
            <div 
              className={`settings-nav-item ${activeTab === 'personas' ? 'active' : ''}`}
              onClick={() => setActiveTab('personas')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveTab('personas') }}
            >
              Editorial Board
            </div>
             <div 
              className={`settings-nav-item ${activeTab === 'advanced' ? 'active' : ''}`}
              onClick={() => setActiveTab('advanced')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveTab('advanced') }}
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
