import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Search, FileText, FileCode, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { Button, EmptyState as EmptyStateComponent } from '../ui'
import { SegmentedControl } from '../ui/SegmentedControl'
import type { DocsListEntry, ConversionMode } from '../../type/pandoc-pro'
import type { Editor } from '@tiptap/react'
import './DocumentsView.css'
import DOMPurify from 'dompurify'
import { EditorContent } from '@tiptap/react'
import type { LogRun } from '../../type/pandoc-pro'

// Duplicate CollapsibleSection again (or better, I should have extracted it first, but sticking to plan)
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

// Duplicate EditorToolbar or import if I can find it. It's in App.tsx. I need to move it.
// I'll assume I will move EditorToolbar to a separate file in components/EditorToolbar.tsx
// But for now, to make this file compile, I will include a placeholder or duplicate it.
// Let's duplicate it for safety and then I can clean up later.
const EditorToolbar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) return null

  return (
    <div className='editor-toolbar'>
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'is-active' : ''}
        title="Bold (Cmd+B)"
      >
        B
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'is-active' : ''}
        title="Italic (Cmd+I)"
      >
        I
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={editor.isActive('strike') ? 'is-active' : ''}
        title="Strike"
      >
        S
      </button>
      <div className="divider" />
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
        title="H1"
      >
        H1
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
        title="H2"
      >
        H2
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
        title="H3"
      >
        H3
      </button>
      <div className="divider" />
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive('bulletList') ? 'is-active' : ''}
        title="Bullet List"
      >
        • List
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive('orderedList') ? 'is-active' : ''}
        title="Ordered List"
      >
        1. List
      </button>
      <div className="divider" />
      <button
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={editor.isActive('codeBlock') ? 'is-active' : ''}
        title="Code Block"
      >
        &lt;/&gt;
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={editor.isActive('blockquote') ? 'is-active' : ''}
        title="Quote"
      >
        ""
      </button>
    </div>
  )
}

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
        <div title='MD file missing'>
          <AlertCircle className='w-4 h-4 text-yellow-500' />
        </div>
      )
    }
    
    const docxTime = doc.docxMtime ?? 0
    const mdTime = doc.mdMtime ?? 0
    
    if (docxTime > mdTime) {
      return (
        <div title='DOCX is newer'>
          <Clock className='w-4 h-4 text-blue-500' />
        </div>
      )
    } else if (mdTime > docxTime) {
      return (
        <div title='MD is newer'>
          <Clock className='w-4 h-4 text-purple-500' />
        </div>
      )
    }
    
    return (
      <div title='In sync'>
        <CheckCircle2 className='w-4 h-4 text-green-500' />
      </div>
    )
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
            <input
              type='search'
              className='doc-search'
              placeholder='Search documents'
              value={docFilter}
              onChange={(event) => onDocFilterChange(event.target.value)}
            />
            <select
              className='doc-sort-select'
              value={docSort}
              onChange={(event) => onDocSortChange(event.target.value as 'alpha' | 'recent')}
            >
              <option value='alpha'>A → Z</option>
              <option value='recent'>Recent</option>
            </select>
          </div>

          <div
            className={`drop-zone ${dropActive ? 'active' : ''}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={onPickDocument}
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
                >
                  <div className='doc-item-icon'>
                    {getDocIcon(doc)}
                  </div>
                  <div className='doc-item-content'>
                    <div className='doc-item-name'>{formatDocLabel(doc)}</div>
                    <div className='doc-item-meta'>
                      <span className='doc-size'>{formatFileSize(doc.docxSize)}</span>
                      <span className='doc-status'>
                        {!doc.mdExists ? '⚠️ No MD' : doc.docxMtime > (doc.mdMtime ?? 0) ? '📄 → 📝' : '📝 → 📄'}
                      </span>
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
                    <EditorToolbar editor={editor} />
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
                      {run.messages.map((msg: any, i: number) => (
                        <div key={i} className={`log-line log-${msg.type}`}>
                          {msg.text}
                        </div>
                      ))}
                    </div>
                  ))}
                  {logs.length === 0 && <p className='muted'>No logs yet.</p>}
                </div>
              </CollapsibleSection>
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
