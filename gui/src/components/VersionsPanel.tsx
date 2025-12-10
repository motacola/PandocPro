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
  const [versions, setVersions] = useState<any[]>([])
  const [isLoadingVersions, setIsLoadingVersions] = useState(false)

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

  const handleRestoreVersion = async (version: any) => {
    if (!confirm(`Are you sure you want to restore version ${version.version} from ${new Date(version.timestamp).toLocaleString()}?`)) {
      return
    }
    try {
      await window.pandocPro.restoreSnapshot({
        snapshotPath: version.snapshotPath,
        targetPath: version.filePath
      })
      alert(`Version ${version.version} restored successfully. Please refresh the document.`)
      fetchVersions() // Refresh list
    } catch (err) {
      alert(`Failed to restore version ${version.version}`)
    }
  }

  const fetchVersions = async () => {
    setIsLoadingVersions(true)
    try {
      // Try to get document versions if available
      // For now, we'll simulate this since the backend doesn't have versionList yet
      const mdVersions = doc.mdExists ? [] : []
      setVersions(mdVersions || [])
    } catch (err) {
      console.error('Failed to load versions', err)
      setVersions([])
    } finally {
      setIsLoadingVersions(false)
    }
  }

  // Fetch when doc changes or panel opens?
  // We'll fetch on mount if doc changes.
  useEffect(() => {
    fetchSnapshots()
    fetchVersions()
  }, [doc.md]) // Refetch if MD path changes

  return (
    <CollapsibleSection title="Version History (Time Machine)" defaultOpen={false}>
      <div className="versions-panel-content">
        {isLoading && <p className="versions-loading">Loading versions...</p>}
        {!isLoading && snapshots.length === 0 && versions.length === 0 && (
          <div className="versions-empty">
            <p>No version history available. Snapshots are automatically created before every conversion.</p>
          </div>
        )}

        {snapshots.length > 0 && (
          <div className="versions-section">
            <h4 className="versions-section-title">Automatic Snapshots</h4>
            <div className="versions-grid">
              {snapshots.map((snap) => (
                <div key={snap.snapshotPath} className="version-card">
                  <div className="version-meta">
                    <History size={16} className="version-icon" />
                    <div className="version-info">
                      <div className="version-timestamp">{new Date(snap.timestamp).toLocaleString()}</div>
                      <div className="version-size">Size: {(snap.size / 1024).toFixed(1)} KB</div>
                      {snap.notes && <div className="version-notes">Notes: {snap.notes}</div>}
                      {snap.tags && snap.tags.length > 0 && (
                        <div className="version-tags">
                          {snap.tags.map((tag, i) => (
                            <span key={i} className="tag-badge">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    className="version-restore-btn"
                    onClick={() => handleRestore(snap)}
                    title="Restore this version"
                    aria-label={`Restore snapshot from ${new Date(snap.timestamp).toLocaleString()}`}
                  >
                    <RotateCcw size={16} /> Restore
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {versions.length > 0 && (
          <div className="versions-section">
            <h4 className="versions-section-title">Document Versions</h4>
            <div className="versions-grid">
              {versions.map((version) => (
                <div key={version.timestamp} className="version-card">
                  <div className="version-meta">
                    <span className="version-badge">{version.version}</span>
                    <div className="version-info">
                      <div className="version-timestamp">{new Date(version.timestamp).toLocaleString()}</div>
                      {version.notes && <div className="version-notes">Notes: {version.notes}</div>}
                      {version.tags && version.tags.length > 0 && (
                        <div className="version-tags">
                          {version.tags.map((tag, i) => (
                            <span key={i} className="tag-badge">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    className="version-restore-btn"
                    onClick={() => handleRestoreVersion(version)}
                    title={`Restore version ${version.version}`}
                    aria-label={`Restore version ${version.version}`}
                  >
                    <RotateCcw size={16} /> Restore
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="versions-footer">
          <p>Snapshots are automatically created before every conversion to preserve your work.</p>
          {versions.length > 0 && <p>Document versions provide named milestones for tracking progress.</p>}
        </div>
      </div>
    </CollapsibleSection>
  )
}
