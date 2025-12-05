import React, { useState, useEffect } from 'react'
import { CollapsibleSection } from './ui/CollapsibleSection'
import type { DocsListEntry, SnapshotEntry } from '../type/pandoc-pro'
import { History, RotateCcw } from 'lucide-react'

interface VersionsPanelProps {
  doc: DocsListEntry
}

export const VersionsPanel: React.FC<VersionsPanelProps> = ({ doc }) => {
  const [snapshots, setSnapshots] = useState<SnapshotEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchSnapshots = async () => {
    setIsLoading(true)
    try {
      // Check for snapshots of MD fil
      // Ideally we check both? Or just the one we're interested in. 
      // The requirement "Time Machine" implies reverting the SOURCE. 
      // Usually users edit the MD. But if they convert TO MD, the source was docx.
      // Let's show snapshots for the MD file primarily as that's what is editable in the app.
      // BUT if we are doing docx->md, we might want to revert the docx.
      // Let's just list MD snapshots for now as "Editor Versions".
      
      const mdSnaps = doc.mdExists ? await window.pandocPro.listSnapshots(doc.md) : []
      setSnapshots(mdSnaps)
    } catch (err) {
      console.error('Failed to load versions', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRestore = async (snap: SnapshotEntry) => {
    if (!confirm(`Are you sure you want to restore this version from ${new Date(snap.timestamp).toLocaleString()}? Current content will be backed up.`)) {
      return
    }
    try {
      await window.pandocPro.restoreSnapshot({
        snapshotPath: snap.snapshotPath,
        targetPath: snap.originalPath
      })
      alert('Version restored successfully. Please refresh the document.')
      fetchSnapshots() // Refresh list (new backup created)
    } catch (err) {
      alert('Failed to restore version')
    }
  }

  // Fetch when doc changes or panel opens? 
  // We'll fetch on mount if doc changes.
  useEffect(() => {
    fetchSnapshots()
  }, [doc.md]) // Refetch if MD path changes

  return (
    <CollapsibleSection title="Version History (Time Machine)" defaultOpen={false}>
      <div className="versions-list" style={{ padding: '1rem', maxHeight: '200px', overflowY: 'auto' }}>
        {isLoading && <p className="muted">Loading versions...</p>}
        {!isLoading && snapshots.length === 0 && <p className="muted">No backups found.</p>}
        
        {snapshots.map((snap) => (
          <div key={snap.snapshotPath} style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '0.5rem',
            borderBottom: '1px solid var(--border-color)',
            fontSize: '0.9rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <History size={14} className="text-secondary" />
              <span>{new Date(snap.timestamp).toLocaleString()}</span>
              <span className="muted" style={{ fontSize: '0.8rem' }}>({(snap.size / 1024).toFixed(1)} KB)</span>
            </div>
            <button 
              className="secondary small" 
              onClick={() => handleRestore(snap)}
              title="Restore this version"
            >
              <RotateCcw size={14} /> Restore
            </button>
          </div>
        ))}
        
         <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
           <p>Snapshots are automatically created before every conversion.</p>
         </div>
      </div>
    </CollapsibleSection>
  )
}
