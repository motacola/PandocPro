import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Search, FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { EmptyState as EmptyStateComponent } from '../ui'
import { SegmentedControl } from '../ui/SegmentedControl'
import type { DocsListEntry, ConversionMode, LogRun, LogEntry } from '../../type/pandoc-pro'
import type { Editor } from '@tiptap/react'
import './DocumentsView.css'
import DOMPurify from 'dompurify'
import { EditorContent } from '@tiptap/react'
import { CollapsibleSection } from '../ui/CollapsibleSection'
import { EditorToolbar } from '../EditorToolbar'
import { VersionsPanel } from '../VersionsPanel'


interface DocumentsViewProps {
  docs: DocsListEntry[]
  isLoadingDocs: boolean
  onRefresh: () => void
  selectedDoc: DocsListEntry | null
  onSelectDoc: (doc: DocsListEntry) => void
  docFilter: string
  onDocFilterChange: (value: string) => void
  docSort: 'alpha' | 'recent'
  onDocSortChange: (value: 'alpha' | 'recent') => void
  dropActive: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void
  onPickDocument: () => void
  formatDocLabel: (entry: DocsListEntry) => string
  LARGE_DOC_THRESHOLD: number
  dirty: boolean
  selectedMode: ConversionMode
  onSelectMode: (mode: ConversionMode) => void
  disableActions: boolean
  activeRequest: string | null
  onTriggerConversion: () => void
  isPreviewVisible: boolean
  onTogglePreview: () => void
  onSaveMarkdown: () => void
  editor: Editor | null
  previewHtml: string
  logs: LogRun[]
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  docs,
  isLoadingDocs,
  onRefresh,
  selectedDoc,
  onSelectDoc,
  docFilter,
  onDocFilterChange,
  docSort,
  onDocSortChange,
  dropActive,
  onDragOver,
  onDragLeave,
  onDrop,
  onPickDocument,
  formatDocLabel,
  LARGE_DOC_THRESHOLD,
  dirty,
  selectedMode,
  onSelectMode,
  disableActions,
  activeRequest,
  onTriggerConversion,
  isPreviewVisible,
  onTogglePreview,
  onSaveMarkdown,
  editor,
  previewHtml,
  logs,
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(true)
    onDragOver(e)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set to false if leaving the documents section entirely
    if (e.currentTarget === e.target) {
      setIsDraggingOver(false)
      onDragLeave()
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    setIsDraggingOver(false)
    onDrop(e)
  }

  const getDocIcon = (doc: DocsListEntry) => {
    // Show status icon
    if (!doc.mdExists) {
      return (
        <div className='doc-status-icon' title='MD file missing'>
          <AlertCircle className='w-4 h-4 text-yellow-500' />
          <span className='status-tooltip'>Missing Markdown</span>
        </div>
      )
    }

    const docxTime = doc.docxMtime ?? 0
    const mdTime = doc.mdMtime ?? 0

    if (docxTime > mdTime) {
      return (
        <div className='doc-status-icon' title='DOCX is newer'>
          <Clock className='w-4 h-4 text-blue-500' />
          <span className='status-tooltip'>DOCX newer</span>
        </div>
      )
    } else if (mdTime > docxTime) {
      return (
        <div className='doc-status-icon' title='MD is newer'>
          <Clock className='w-4 h-4 text-purple-500' />
          <span className='status-tooltip'>Markdown newer</span>
        </div>
      )
    }

    return (
      <div className='doc-status-icon' title='In sync'>
        <CheckCircle2 className='w-4 h-4 text-green-500' />
        <span className='status-tooltip'>In sync</span>
      </div>
    )
  }

  const getDocStatusBadge = (doc: DocsListEntry) => {
    if (!doc.mdExists) {
      return <span className='badge badge-warning'>Unsynced</span>
    }

    const docxTime = doc.docxMtime ?? 0
    const mdTime = doc.mdMtime ?? 0

    if (docxTime > mdTime) {
      return <span className='badge badge-info'>Needs Conversion</span>
    } else if (mdTime > docxTime) {
      return <span className='badge badge-success'>Up to date</span>
    }

    return <span className='badge badge-success'>Synced</span>
  }

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  return (
    <section
      className={`view-documents fade-in panel ${isDraggingOver ? 'drag-active' : ''}`}
      onDragEnter={handleDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <header className='view-header'>
        <h2>Documents</h2>
        <div className='header-actions'>
          <button className='secondary small' onClick={onRefresh} disabled={isLoadingDocs}>
            Refresh
          </button>
        </div>
      </header>

      <div className='doc-browser'>
        <div className='doc-list-pane'>
          <div className='doc-controls'>
            <div className='search-container'>
              <input
                type='search'
                className='doc-search'
                placeholder='Search documents'
                value={docFilter}
                onChange={(event) => onDocFilterChange(event.target.value)}
              />
              <Search className='search-icon' size={16} />
            </div>
            <div className='filter-controls'>
              <select
                className='doc-sort-select'
                value={docSort}
                onChange={(event) => onDocSortChange(event.target.value as 'alpha' | 'recent')}
              >
                <option value='alpha'>A → Z</option>
                <option value='recent'>Recent</option>
                <option value='size'>File Size</option>
                <option value='status'>Status</option>
              </select>
              <select
                className='doc-filter-select'
                onChange={(event) => {
                  // Additional filter logic would go here
                  console.log('Filter selected:', event.target.value)
                }}
              >
                <option value='all'>All Files</option>
                <option value='synced'>Synced</option>
                <option value='unsynced'>Unsynced</option>
                <option value='large'>Large Files</option>
              </select>
            </div>
          </div>

          <div
            className={`drop-zone ${dropActive ? 'active' : ''}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}

            onClick={onPickDocument}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onPickDocument()
              }
            }}
          >
            <span className='icon'>📂</span>
            <span>Drop or Click to Open</span>
          </div>

          <div className='doc-list'>
            {isLoadingDocs ? (
              <div className='skeleton-container'>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className='skeleton-item' style={{ height: '2.5rem' }} />
                ))}
              </div>
            ) : docs.length === 0 ? (
              <div className='empty-state-container'>
                <EmptyStateComponent
                  icon='🔍'
                  title='No documents found'
                  description='Try adjusting your search or drop a file.'
                />
              </div>
            ) : (
              docs.map((doc) => (
                <motion.div
                  key={doc.docx}
                  className={`doc-item ${selectedDoc?.docx === doc.docx ? 'selected' : ''}`}
                  onClick={() => onSelectDoc(doc)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelectDoc(doc)
                    }
                  }}
                >
                  <div className='doc-item-icon'>
                    {getDocIcon(doc)}
                  </div>
                  <div className='doc-item-content'>
                    <div className='doc-item-header'>
                      <div className='doc-item-name'>{formatDocLabel(doc)}</div>
                      <div className='doc-item-badge'>
                        {getDocStatusBadge(doc)}
                      </div>
                    </div>
                    <div className='doc-item-meta'>
                      <span className='doc-size'>{formatFileSize(doc.docxSize)}</span>
                      <span className='doc-status'>
                        {!doc.mdExists ? '⚠️ No MD' : doc.docxMtime > (doc.mdMtime ?? 0) ? '📄 → 📝' : '📝 → 📄'}
                      </span>
                      {doc.docxSize && doc.docxSize > 5 * 1024 * 1024 && (
                        <span className='badge badge-warning badge-sm'>Large</span>
                      )}
                    </div>
                    <div className='doc-item-preview'>
                      {doc.previewText && (
                        <span className='doc-preview-text' title={doc.previewText}>
                          {doc.previewText.substring(0, 50)}{doc.previewText.length > 50 ? '...' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        <div className='doc-detail-pane'>
          {selectedDoc ? (
            <div className='fade-in'>
              <CollapsibleSection
                title={
                  <div className='doc-info-header'>
                    <h3>{formatDocLabel(selectedDoc)}</h3>
                    <div className='doc-badges'>
                      {(selectedDoc.docxSize ?? 0) > LARGE_DOC_THRESHOLD && (
                        <span className='badge badge-warning'>Large File</span>
                      )}
                      {selectedDoc.mdExists ? (
                        <span className='badge badge-success'>Synced</span>
                      ) : (
                        <span className='badge badge-neutral'>Unsynced</span>
                      )}
                      {dirty && <span className='badge badge-warning'>Unsaved Changes</span>}
                    </div>
                  </div>
                }
                defaultOpen={true}
                className='doc-info-card'
              >
                <div className='doc-paths'>
                  <div className='path-row'>
                    <span className='label'>DOCX:</span>
                    <code>{selectedDoc.docx}</code>
                  </div>
                  <div className='path-row'>
                    <span className='label'>MD:</span>
                    <code>{selectedDoc.md}</code>
                  </div>
                </div>
              </CollapsibleSection>

              <div className='action-bar'>
                <div className='mode-selector-container'>
                  <SegmentedControl
                    options={[
                      { label: 'To Markdown', value: 'to-md', icon: <FileText className='w-4 h-4' /> },
                      { label: 'To Word', value: 'to-docx', icon: <FileText className='w-4 h-4' /> },
                      { label: 'To PPTX', value: 'to-pptx', icon: <FileText className='w-4 h-4' /> },
                      { label: 'Auto Sync', value: 'auto', icon: <RefreshCw className='w-4 h-4' /> },
                    ]}
                    value={selectedMode}
                    onChange={onSelectMode}
                  />
                </div>
                <button
                  className={`primary-action ${activeRequest ? 'loading' : ''}`}
                  disabled={disableActions}
                  onClick={onTriggerConversion}
                >
                  {activeRequest ? (
                    <>
                      <span className='spinner'></span>
                      Processing…
                    </>
                  ) : (
                    'Run Conversion'
                  )}
                </button>
              </div>

              {activeRequest && (
                <div className='status-banner'>
                  <span className='spinner-sm'></span>
                  <span>Conversion in progress... check logs for details.</span>
                </div>
              )}

              <div className='editor-section'>
                <div className='editor-header'>
                  <div className='editor-title'>
                    <h4>Markdown Editor</h4>
                    <span className='dirty-indicator'>{dirty ? '●' : ''}</span>
                  </div>
                  <div className='editor-actions'>
                    <button
                      className='secondary small'
                      onClick={onTogglePreview}
                    >
                      {isPreviewVisible ? 'Hide Preview' : 'Show Preview'}
                    </button>
                    <button className='primary small' onClick={onSaveMarkdown}>
                      Save Changes
                    </button>
                  </div>
                </div>

                <div className={`editor-container ${isPreviewVisible ? 'split-view' : ''}`}>
                  <div className='editor-pane'>
                    <EditorToolbar
                      editor={editor}
                      onAiAction={async (instruction) => {
                        if (!selectedDoc?.md) return

                        // Optimistic UI for editor would be hard, so just loading toast
                        // Ideally we set loading state

                        try {
                          // Simple toast or overlay? 
                          // DocumentsView doesn't have addToast prop... wait.
                          // It seems DocumentsView doesn't receive addToast.
                          // But App.tsx handles it? NO, DocumentsView doesn't seem to emit toasts.
                          // We'll trust the user sees global spinner if we set activeRequest?
                          // But aiEdit is not a conversion request.
                          // We should probably show a small overlay on the editor or something.

                          // Quick hack: Use window.alert or console for now?
                          // No, use a local loading state.

                          // We need to trigger the edit.
                          // const toast = (msg: string) => console.debug(msg) // Placeholder if we can't toast

                          await window.pandocPro.aiEdit({
                            filePath: selectedDoc.md,
                            instruction
                          })

                          // Refresh content
                          onPickDocument() // This effectively re-selects/refreshes the current doc content

                        } catch (err) {
                          console.error('AI Edit failed', err)
                          // alert('AI Edit failed: ' + err)
                        }
                      }}
                    />
                    <EditorContent editor={editor} />
                  </div>
                  {isPreviewVisible && (
                    <div className='preview-pane'>
                      <div
                        className='markdown-body'
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewHtml) }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <CollapsibleSection title='Logs' defaultOpen={false} className='logs-section'>
                <div className='logs-container'>
                  {logs.slice(-1).map((run) => (
                    <div key={run.requestId} className='latest-log'>
                      {run.messages.map((msg: LogEntry, i: number) => (
                        <div key={i} className={`log-line log-${msg.type}`}>
                          {msg.text}
                        </div>
                      ))}
                    </div>
                  ))}
                  {logs.length === 0 && <p className='muted'>No logs yet.</p>}
                </div>
              </CollapsibleSection>

              <VersionsPanel doc={selectedDoc} />

            </div>
          ) : (
            <div className='empty-selection fade-in'>
              <EmptyStateComponent
                icon='👈'
                title='Select a document'
                description='Choose a file from the list to view details.'
              />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
