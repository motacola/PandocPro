import { useCallback, useEffect, useMemo, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { marked } from 'marked'
import TurndownService from 'turndown'
import './App.css'

import type { DocsListEntry, HistoryEntry, WatchStatus, SettingsData, SystemInfo } from './type/pandoc-pro'

type LogEntry =
  | { type: 'stdout'; text: string }
  | { type: 'stderr'; text: string }
  | { type: 'status'; text: string }

interface LogRun {
  requestId: string
  messages: LogEntry[]
}

type ConversionMode = 'to-md' | 'to-docx' | 'auto'
type BannerState = { type: 'info' | 'success' | 'error'; message: string } | null

const renderMarkdown = (markdown: string) => marked.parse(markdown ?? '') as string

function App() {
  const [docs, setDocs] = useState<DocsListEntry[]>([])
  const [selectedDoc, setSelectedDoc] = useState<DocsListEntry | null>(null)
  const [activeRequest, setActiveRequest] = useState<string | null>(null)
  const [logs, setLogs] = useState<LogRun[]>([])
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false)
  const [selectedMode, setSelectedMode] = useState<ConversionMode>('to-md')
  const [banner, setBanner] = useState<BannerState>(null)
  const [isEditorLoading, setIsEditorLoading] = useState<boolean>(false)
  const [isPreviewVisible, setIsPreviewVisible] = useState<boolean>(true)
  const [isSavingMarkdown, setIsSavingMarkdown] = useState<boolean>(false)
  const [dirty, setDirty] = useState<boolean>(false)
  const [liveMarkdown, setLiveMarkdown] = useState<string>('')
  const [previewHtml, setPreviewHtml] = useState<string>('')
  const [watchStatus, setWatchStatus] = useState<WatchStatus | null>(null)
  const [isStartingWatch, setIsStartingWatch] = useState<boolean>(false)
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false)
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [settings, setSettings] = useState<SettingsData | null>(null)

  const turndown = useMemo(() => new TurndownService(), [])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start editing your Markdown…',
      }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      setDirty(true)
      const html = editor.getHTML()
      const markdown = turndown.turndown(html)
      setLiveMarkdown(markdown)
      setPreviewHtml(renderMarkdown(markdown))
    },
  })

  const appendLogEntry = useCallback((requestId: string, entry: LogEntry) => {
    setLogs((prev) => {
      const next = [...prev]
      let run = next.find((item) => item.requestId === requestId)
      if (!run) {
        run = { requestId, messages: [] }
        next.push(run)
      }
      run.messages.push(entry)
      return next
    })
  }, [])

  const fetchDocs = () => {
    setIsLoadingDocs(true)
    window.pandocPro
      .listDocuments()
      .then((files) => {
        setDocs(files)
        if (files.length > 0) {
          setSelectedDoc((current) => {
            if (current) {
              const stillExists = files.find((entry) => entry.docx === current.docx)
              return stillExists ?? files[0]
            }
            return files[0]
          })
        } else {
          setSelectedDoc(null)
        }
      })
      .catch((err) => {
        appendLogEntry('system', { type: 'stderr', text: `Failed to list documents: ${err.message ?? String(err)}` })
      })
      .finally(() => setIsLoadingDocs(false))
  }

  const fetchHistory = () => {
    setIsLoadingHistory(true)
    window.pandocPro
      .listHistory(6)
      .then((entries) => setHistory(entries))
      .catch((err) =>
        appendLogEntry('system', { type: 'stderr', text: `Failed to load history: ${err.message ?? String(err)}` }),
      )
      .finally(() => setIsLoadingHistory(false))
  }

  useEffect(() => {
    fetchDocs()
    fetchHistory()
    window.pandocPro.getSystemInfo().then(setSystemInfo)
    window.pandocPro.getSettings().then(setSettings)

    const cleanups = [
      window.pandocPro.onStdout(({ chunk, requestId }) => appendLogEntry(requestId, { type: 'stdout', text: chunk })),
      window.pandocPro.onStderr(({ chunk, requestId }) => appendLogEntry(requestId, { type: 'stderr', text: chunk })),
      window.pandocPro.onExit(({ code, requestId }) => {
        setActiveRequest((prev) => (prev === requestId ? null : prev))
        appendLogEntry(
          requestId,
          code === 0
            ? { type: 'status', text: '✅ Conversion finished successfully.' }
            : { type: 'stderr', text: `Conversion exited with code ${code}.` },
        )
        fetchHistory()
        setBanner(
          code === 0
            ? { type: 'success', message: 'Conversion finished successfully.' }
            : { type: 'error', message: `Conversion exited with code ${code}.` },
        )
      }),
      window.pandocPro.onError(({ message, requestId }) => {
        setActiveRequest((prev) => (prev === requestId ? null : prev))
        appendLogEntry(requestId, { type: 'stderr', text: `Error: ${message}` })
        setBanner({ type: 'error', message })
      }),
      window.pandocPro.onWatchUpdate((status) => {
        setWatchStatus({
          docxPath: status.docxPath,
          mdPath: status.mdPath,
          running: status.running,
          lastSync: status.lastSync,
          mode: status.mode,
          message: status.message,
        })
      }),
    ]

    return () => {
      cleanups.forEach((cleanup) => cleanup())
    }
  }, [appendLogEntry])

  useEffect(() => {
    if (!selectedDoc || !editor) return
    setIsEditorLoading(true)
    window.pandocPro
      .readFile(selectedDoc.md)
      .then((markdown) => {
        const normalized = markdown ?? ''
        const html = renderMarkdown(normalized)
        editor.commands.setContent(html, { emitUpdate: false })
        setLiveMarkdown(normalized)
        setPreviewHtml(html)
        setDirty(false)
      })
      .catch(() => {
        const placeholder = '<p><em>No Markdown file yet. Click “Save Markdown” to create one.</em></p>'
        editor.commands.setContent(placeholder, { emitUpdate: false })
        setLiveMarkdown('')
        setPreviewHtml(renderMarkdown(''))
        setDirty(false)
      })
      .finally(() => setIsEditorLoading(false))
  }, [selectedDoc, editor])

  const triggerConversion = (modeOverride?: ConversionMode) => {
    if (!selectedDoc) return
    const mode = modeOverride ?? selectedMode
    const requestId = crypto.randomUUID()
    setActiveRequest(requestId)
    setBanner({ type: 'info', message: `Running ${mode}…` })
    setLogs((prev) => [
      ...prev,
      { requestId, messages: [{ type: 'status', text: `▶️ Starting conversion (${mode})...` }] },
    ])
    window.pandocPro.startConversion({
      docxPath: selectedDoc.docx,
      mdPath: selectedDoc.md,
      mode,
      requestId,
    })
  }

  const handleSaveMarkdown = async (modeAfterSave?: ConversionMode) => {
    if (!selectedDoc || !editor) return
    setIsSavingMarkdown(true)
    try {
      const html = editor.getHTML()
      const markdown = turndown.turndown(html)
      await window.pandocPro.writeFile(selectedDoc.md, markdown)
      setDirty(false)
      setLiveMarkdown(markdown)
      setPreviewHtml(renderMarkdown(markdown))
      setBanner({ type: 'success', message: 'Markdown saved.' })
      if (modeAfterSave) {
        triggerConversion(modeAfterSave)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save Markdown file.'
      setBanner({ type: 'error', message })
    } finally {
      setIsSavingMarkdown(false)
    }
  }

  const toggleWatch = async () => {
    if (!selectedDoc) return
    if (watchStatus?.running) {
      await window.pandocPro.stopWatch()
      setWatchStatus((prev) => (prev ? { ...prev, running: false, mode: 'paused' } : prev))
      return
    }
    setIsStartingWatch(true)
    try {
      await window.pandocPro.startWatch({ docxPath: selectedDoc.docx, mdPath: selectedDoc.md })
    } finally {
      setIsStartingWatch(false)
    }
  }

  const disableActions = useMemo(() => !selectedDoc || !!activeRequest, [selectedDoc, activeRequest])

  return (
    <div className='App'>
      <header>
        <h1>PandocPro (Preview)</h1>
        <p>Pick a document and run a conversion without touching the terminal.</p>
      </header>

      <section className='panel'>
        <h2>Documents</h2>
        <div className='doc-header'>
          <p>{docs.length} document{docs.length === 1 ? '' : 's'} found</p>
          <button className='secondary' onClick={fetchDocs} disabled={isLoadingDocs}>
            {isLoadingDocs ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {docs.length === 0 && <p className='muted'>No .docx files found in your docs folder.</p>}
        {docs.length > 0 && (
          <>
            <select
              value={selectedDoc?.docx ?? ''}
              onChange={(event) => {
                const doc = docs.find((entry) => entry.docx === event.target.value)
                setSelectedDoc(doc ?? null)
              }}
            >
              {docs.map((entry) => {
                const label = entry.docx.includes('/docs/')
                  ? entry.docx.split('/docs/')[1]
                  : entry.docx.split('\\docs\\')[1] ?? entry.docx
                return (
                  <option key={entry.docx} value={entry.docx}>
                    {label}
                  </option>
                )
              })}
            </select>
            {selectedDoc && (
              <div className='doc-summary'>
                <div>
                  <span className='muted'>Word source</span>
                  <code>{selectedDoc.docx}</code>
                  <span className='muted'>Updated {new Date(selectedDoc.docxMtime).toLocaleString()}</span>
                </div>
                <div>
                  <span className='muted'>Markdown twin</span>
                  <code>{selectedDoc.md}</code>
                  <span className={selectedDoc.mdExists ? 'badge badge-success' : 'badge badge-warning'}>
                    {selectedDoc.mdExists ? 'Markdown exists' : 'Markdown missing'}
                  </span>
                  {selectedDoc.mdExists && selectedDoc.mdMtime && (
                    <span className='muted'>Updated {new Date(selectedDoc.mdMtime).toLocaleString()}</span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <section className='panel'>
        <div className='panel-header'>
          <h2>Quick settings</h2>
          <button className='secondary' onClick={() => setSettingsOpen((prev) => !prev)}>
            {settingsOpen ? 'Hide settings' : 'Show settings'}
          </button>
        </div>
        {settingsOpen && systemInfo && settings ? (
          <div className='settings-grid'>
            <div className='settings-card'>
              <h3>Environment</h3>
              <ul>
                <li>
                  Pandoc:{' '}
                  {systemInfo.pandocVersion ? (
                    <span className='badge badge-success'>{systemInfo.pandocVersion}</span>
                  ) : (
                    <span className='badge badge-error'>Not installed</span>
                  )}
                </li>
                <li>
                  Node.js: <span className='badge badge-success'>{systemInfo.nodeVersion}</span>
                </li>
              </ul>
            </div>
            <div className='settings-card'>
              <h3>Docs folder</h3>
              <code>{settings.docsPath}</code>
              <div className='settings-actions'>
                <button className='secondary' onClick={async () => {
                  const updated = await window.pandocPro.chooseDocsPath()
                  if (updated) {
                    setSettings(updated)
                    window.pandocPro.listDocuments().then(setDocs)
                  }
                }}>
                  Change…
                </button>
                <button className='secondary' onClick={() => window.pandocPro.listDocuments().then(setDocs)}>
                  Refresh list
                </button>
              </div>
            </div>
            <div className='settings-card'>
              <h3>Notifications</h3>
              <label className='toggle'>
                <input
                  type='checkbox'
                  checked={settings.notificationsEnabled}
                  onChange={async (event) => {
                    const updated = await window.pandocPro.updateSettings({
                      notificationsEnabled: event.target.checked,
                    })
                    setSettings(updated)
                  }}
                />
                <span>Desktop notifications</span>
              </label>
            </div>
          </div>
        ) : (
          !settingsOpen && <p className='muted'>Open settings to change docs folder and view dependency status.</p>
        )}
      </section>

      <section className='panel'>
        <h2>Actions</h2>
        <div className='mode-selector'>
          <button
            className={selectedMode === 'to-md' ? 'selected' : ''}
            onClick={() => setSelectedMode('to-md')}
            title='Convert Word → Markdown and open the .md file for editing.'
          >
            Convert to Markdown
          </button>
          <button
            className={selectedMode === 'to-docx' ? 'selected' : ''}
            onClick={() => setSelectedMode('to-docx')}
            title='Export Markdown → Word so you can polish it in Word.'
          >
            Export to Word
          </button>
          <button
            className={selectedMode === 'auto' ? 'selected' : ''}
            onClick={() => setSelectedMode('auto')}
            title='Let PandocPro pick the newer file and sync the older one.'
          >
            Auto Sync
          </button>
        </div>
        <div className='actions'>
          <button disabled={disableActions} onClick={() => triggerConversion()}>
            {activeRequest ? 'Running…' : 'Run Selected Action'}
          </button>
          {activeRequest && (
            <button
              className='secondary'
              onClick={() => {
                window.pandocPro.cancelConversion(activeRequest)
                setActiveRequest(null)
                setBanner(null)
              }}
            >
              Cancel
            </button>
          )}
        </div>
        {banner && <div className={`banner banner-${banner.type}`}>{banner.message}</div>}
      </section>

      <section className='panel'>
        <div className='panel-header'>
          <h2>Watch mode</h2>
          <button className='secondary' onClick={toggleWatch} disabled={!selectedDoc || isStartingWatch}>
            {watchStatus?.running ? 'Stop watching' : isStartingWatch ? 'Starting…' : 'Start watching'}
          </button>
        </div>
        {watchStatus?.running ? (
          <div className='watch-status running'>
            <span className='badge badge-success'>Watching</span>
            <p>
              Auto-exporting <code>{watchStatus.mdPath}</code> → <code>{watchStatus.docxPath}</code> on save.
            </p>
            {watchStatus.lastSync && (
              <p className='muted'>Last sync: {new Date(watchStatus.lastSync).toLocaleString()}</p>
            )}
            {watchStatus.message && <pre className='watch-log'>{watchStatus.message}</pre>}
          </div>
        ) : (
          <p className='muted'>Watch mode keeps Word in sync every time you save the Markdown file.</p>
        )}
      </section>

      <section className='panel'>
        <div className='panel-header'>
          <h2>Markdown editor</h2>
          <div className='editor-controls'>
            <span className={`dirty-dot ${dirty ? 'dirty' : ''}`}>
              {dirty ? 'Unsaved changes' : 'Saved'}
            </span>
            <button className='secondary' onClick={() => setIsPreviewVisible((prev) => !prev)}>
              {isPreviewVisible ? 'Hide preview' : 'Show preview'}
            </button>
            <button className='secondary' disabled={isSavingMarkdown || !dirty} onClick={() => handleSaveMarkdown()}>
              {isSavingMarkdown ? 'Saving…' : 'Save Markdown'}
            </button>
            <button
              className='secondary'
              disabled={isSavingMarkdown}
              onClick={() => handleSaveMarkdown('to-docx')}
            >
              {isSavingMarkdown ? 'Saving…' : 'Save & Export'}
            </button>
          </div>
        </div>
        {isEditorLoading || !editor ? (
          <p className='muted'>Loading editor…</p>
        ) : (
          <div className={`editor-layout ${isPreviewVisible ? 'with-preview' : ''}`}>
            <div className='editor-pane'>
              <EditorContent editor={editor} />
            </div>
            {isPreviewVisible && (
              <div className='preview-pane' dangerouslySetInnerHTML={{ __html: previewHtml }} />
            )}
          </div>
        )}
      </section>

      <section className='panel'>
        <h2>Activity</h2>
        <div className='log-runs'>
          {logs.length === 0 && <p className='muted'>No logs yet. Run an action to see details.</p>}
          {logs.map((run) => (
            <div key={run.requestId} className='log-run'>
              <div className='log-run-header'>
                <span className='muted'>Run {run.requestId.slice(0, 6)}</span>
                <button
                  className='secondary'
                  onClick={() => {
                    const text = run.messages.map((entry) => entry.text).join('\n')
                    navigator.clipboard.writeText(text)
                  }}
                >
                  Copy log
                </button>
              </div>
              <pre className='log'>
                {run.messages.map((entry, index) => (
                  <span
                    key={`${run.requestId}-${index}`}
                    className={entry.type === 'stderr' ? 'log-error' : entry.type === 'status' ? 'log-status' : ''}
                  >
                    {entry.text}
                  </span>
                ))}
              </pre>
            </div>
          ))}
        </div>
      </section>

      <section className='panel'>
        <div className='panel-header'>
          <h2>Recent activity</h2>
          <button className='secondary' onClick={fetchHistory} disabled={isLoadingHistory}>
            {isLoadingHistory ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {history.length === 0 ? (
          <p className='muted'>No conversions logged yet.</p>
        ) : (
          <ul className='history-list'>
            {history.map((entry) => (
              <li key={`${entry.timestamp}-${entry.mode}`} className='history-item'>
                <div className='history-row '>
                  <span className={`badge ${entry.status === 'success' ? 'badge-success' : 'badge-error'}`}>
                    {entry.status}
                  </span>
                  <strong>{entry.mode}</strong>
                  <span className='muted'>{new Date(entry.timestamp).toLocaleString()}</span>
                </div>
                <div className='history-files'>
                  <code>{entry.source}</code>
                  <span>→</span>
                  <code>{entry.target}</code>
                </div>
                {entry.note && entry.note !== 'completed' && <p className='muted'>{entry.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default App
