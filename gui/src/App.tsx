import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { marked } from 'marked'
import TurndownService from 'turndown'
import './App.css'
import { OnboardingChecklist } from './components/OnboardingChecklist'

import type { DocsListEntry, HistoryEntry, WatchStatus, SettingsData, SystemInfo } from './type/pandoc-pro'

type LogEntry =
  | { type: 'stdout'; text: string }
  | { type: 'stderr'; text: string }
  | { type: 'status'; text: string }
  | { type: 'notify'; text: string }

interface LogRun {
  requestId: string
  messages: LogEntry[]
}

type ConversionMode = 'to-md' | 'to-docx' | 'to-pptx' | 'auto'
type BannerState = { type: 'info' | 'success' | 'error'; message: string } | null

interface FaqEntry {
  question: string
  answer: string
  section: string
}

// Validation helpers
const SUPPORTED_FORMATS = new Set(['.docx', '.md', '.pdf', '.html', '.pptx', '.txt', '.odt'])
const MAX_MARKDOWN_BYTES = 10 * 1024 * 1024 // 10MB limit

function validateFilePath(filePath: string): { valid: boolean; error?: string } {
  if (!filePath || typeof filePath !== 'string') {
    return { valid: false, error: 'Invalid file path' }
  }
  const normalizedPath = filePath.replace(/\\/g, '/')
  if (normalizedPath.includes('..')) {
    return { valid: false, error: 'Path traversal detected' }
  }
  if (normalizedPath.includes('\0')) {
    return { valid: false, error: 'Null byte in path' }
  }
  return { valid: true }
}

function validateMarkdownContent(markdown: string): { valid: boolean; error?: string } {
  if (typeof markdown !== 'string') {
    return { valid: false, error: 'Content must be text' }
  }
  const bytes = new TextEncoder().encode(markdown)
  if (bytes.length > MAX_MARKDOWN_BYTES) {
    return { valid: false, error: `Content exceeds ${MAX_MARKDOWN_BYTES / 1024 / 1024}MB limit` }
  }
  return { valid: true }
}

function sanitizeInput(input: string): string {
  return input.trim().slice(0, 500) // Limit to 500 chars and trim whitespace
}

const renderMarkdown = (markdown: string) => marked.parse(markdown ?? '') as string

function formatSize(bytes?: number | null) {
  if (bytes === undefined || bytes === null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function App() {
  const [docs, setDocs] = useState<DocsListEntry[]>([])
  const [selectedDoc, setSelectedDoc] = useState<DocsListEntry | null>(null)
  const [docFilter, setDocFilter] = useState<string>('')
  const [docSort, setDocSort] = useState<'alpha' | 'recent'>('alpha')
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
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false)
  const [faqEntries, setFaqEntries] = useState<FaqEntry[]>([])
  const [selectedFaq, setSelectedFaq] = useState<FaqEntry | null>(null)
  const [faqFilter, setFaqFilter] = useState<string>('')
  const [faqAiStatus, setFaqAiStatus] = useState<{ configured: boolean; displayName?: string }>({ configured: false })
  const [faqAiLoading, setFaqAiLoading] = useState<boolean>(false)
  const [faqAiResponse, setFaqAiResponse] = useState<string>('')
  const LARGE_DOC_THRESHOLD = 50 * 1024 * 1024 // 50MB
  const [dropActive, setDropActive] = useState<boolean>(false)
  const [telemetry, setTelemetry] = useState<any[]>([])

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

  const normalizedDocsRoot = useMemo(() => settings?.docsPath?.replace(/\\/g, '/') ?? '', [settings])
  const isLargeDoc = selectedDoc?.docxSize ? selectedDoc.docxSize > LARGE_DOC_THRESHOLD : false

  const filteredFaqEntries = useMemo(() => {
    if (!faqEntries.length) return []
    const needle = faqFilter.trim().toLowerCase()
    if (!needle) return faqEntries
    return faqEntries.filter((entry) =>
      entry.question.toLowerCase().includes(needle) || entry.section.toLowerCase().includes(needle),
    )
  }, [faqEntries, faqFilter])

  const formatDocLabel = useCallback(
    (entry: DocsListEntry) => {
      const normalizedPath = entry.docx.replace(/\\/g, '/').trim()
      if (normalizedDocsRoot) {
        const root = normalizedDocsRoot.endsWith('/') ? normalizedDocsRoot : `${normalizedDocsRoot}/`
        if (normalizedPath.startsWith(root)) {
          const relative = normalizedPath.slice(root.length)
          if (relative) return relative
        }
      }
      if (normalizedPath.includes('/docs/')) {
        return normalizedPath.split('/docs/')[1]
      }
      const windowsMarker = '\\docs\\'
      if (entry.docx.includes(windowsMarker)) {
        return entry.docx.split(windowsMarker)[1]
      }
      const segments = normalizedPath.split('/')
      return segments[segments.length - 1] ?? entry.docx
    },
    [normalizedDocsRoot],
  )

  const filteredDocs = useMemo(() => {
    const filter = docFilter.trim().toLowerCase()
    let list = [...docs]
    if (filter) {
      list = list.filter((entry) => formatDocLabel(entry).toLowerCase().includes(filter))
    }
    list.sort((a, b) => {
      if (docSort === 'recent') {
        return (b.docxMtime ?? 0) - (a.docxMtime ?? 0)
      }
      return formatDocLabel(a).localeCompare(formatDocLabel(b))
    })
    return list
  }, [docs, docFilter, docSort, formatDocLabel])

  useEffect(() => {
    if (filteredDocs.length === 0) {
      setSelectedDoc(null)
      return
    }
    if (!selectedDoc) {
      setSelectedDoc(filteredDocs[0])
      return
    }
    const stillVisible = filteredDocs.some((entry) => entry.docx === selectedDoc.docx)
    if (!stillVisible) {
      setSelectedDoc(filteredDocs[0] ?? null)
    }
  }, [filteredDocs, selectedDoc])

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
        if (files.length === 0) {
          setSelectedDoc(null)
        }
      })
      .catch((err) => {
        appendLogEntry('system', { type: 'stderr', text: `Failed to list documents: ${err.message ?? String(err)}` })
      })
      .finally(() => setIsLoadingDocs(false))
  }

  const handleFileDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDropActive(false)
    const file = event.dataTransfer.files?.[0]
    if (!file?.path) {
      setBanner({ type: 'error', message: 'No file detected.' })
      return
    }
    const normalizedPath = file.path.replace(/\\/g, '/')
    const docsRoot = normalizedDocsRoot || '/docs/'
    if (!normalizedPath.startsWith(docsRoot)) {
      setBanner({ type: 'error', message: 'Please drop files from your docs folder.' })
      return
    }
    try {
      const refreshed = await window.pandocPro.listDocuments()
      setDocs(refreshed)
      const found =
        refreshed.find((d) => d.docx.replace(/\\/g, '/') === normalizedPath) ||
        refreshed.find((d) => d.md.replace(/\\/g, '/') === normalizedPath)
      if (found) {
        setSelectedDoc(found)
        setBanner({ type: 'success', message: 'File selected. Running conversion…' })
        const mode: ConversionMode =
          found.docx.toLowerCase().endsWith('.docx') && (!found.mdExists || found.docxMtime > (found.mdMtime ?? 0))
            ? 'to-md'
            : 'to-docx'
        triggerConversion(mode)
      } else {
        setBanner({ type: 'error', message: 'File is not a supported docx/md in docs/.' })
      }
    } catch (err) {
      setBanner({ type: 'error', message: err instanceof Error ? err.message : 'Failed to process dropped file.' })
    }
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

  function triggerConversion(modeOverride?: ConversionMode, forceTextOnly?: boolean) {
    if (!selectedDoc) return

    const docxValidation = validateFilePath(selectedDoc.docx)
    const mdValidation = validateFilePath(selectedDoc.md)

    if (!docxValidation.valid) {
      setBanner({ type: 'error', message: `Invalid .docx path: ${docxValidation.error}` })
      return
    }
    if (!mdValidation.valid) {
      setBanner({ type: 'error', message: `Invalid .md path: ${mdValidation.error}` })
      return
    }

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
      textOnly: forceTextOnly || (selectedDoc.docxSize ?? 0) > LARGE_DOC_THRESHOLD,
    })
  }

  async function handleSaveMarkdown(modeAfterSave?: ConversionMode, forceTextOnly?: boolean) {
    if (!selectedDoc || !editor) return
    setIsSavingMarkdown(true)
    try {
      const html = editor.getHTML()
      const markdown = turndown.turndown(html)

      const contentValidation = validateMarkdownContent(markdown)
      if (!contentValidation.valid) {
        setBanner({ type: 'error', message: contentValidation.error || 'Content validation failed' })
        return
      }

      const pathValidation = validateFilePath(selectedDoc.md)
      if (!pathValidation.valid) {
        setBanner({ type: 'error', message: `Cannot save: ${pathValidation.error}` })
        return
      }

      await window.pandocPro.writeFile(selectedDoc.md, markdown)
      setDirty(false)
      setLiveMarkdown(markdown)
      setPreviewHtml(renderMarkdown(markdown))
      setBanner({ type: 'success', message: 'Markdown saved.' })
      if (modeAfterSave) {
        triggerConversion(modeAfterSave, forceTextOnly)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save Markdown file.'
      setBanner({ type: 'error', message })
    } finally {
      setIsSavingMarkdown(false)
    }
  }

  useEffect(() => {
    fetchDocs()
    fetchHistory()
    window.pandocPro.getSystemInfo().then((info) => {
      setSystemInfo(info)
      if (!info.pandocVersion) setShowOnboarding(true)
    })
    window.pandocPro.getSettings().then((s) => {
      setSettings(s)
      if (!s.docsPath) setShowOnboarding(true)
    })
    window.pandocPro.getTelemetry().then((stats) => setTelemetry(stats))
    window.pandocPro.getFaq().then((content) => {
      const parsed = parseFaq(content)
      setFaqEntries(parsed)
      setSelectedFaq(parsed[0] ?? null)
    })
    window.pandocPro.getLlmStatus().then((status) => setFaqAiStatus(status))

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
        if (code === 0) {
          appendLogEntry(requestId, { type: 'notify', text: 'Conversion complete.' })
        } else {
          appendLogEntry(requestId, { type: 'notify', text: 'Conversion failed.' })
        }
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

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isMod = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()
      if (isMod && key === 's') {
        event.preventDefault()
        if (event.shiftKey) {
          handleSaveMarkdown('to-docx')
        } else {
          handleSaveMarkdown()
        }
      }
      if (isMod && key === 'e') {
        event.preventDefault()
        triggerConversion()
      }
      if (isMod && key === '1') {
        setSelectedMode('to-md')
      }
      if (isMod && key === '2') {
        setSelectedMode('to-docx')
      }
      if (isMod && key === '3') {
        setSelectedMode('to-pptx')
      }
      if (isMod && key === '4') {
        setSelectedMode('auto')
      }
      if (isMod && key === 'f') {
        const search = document.querySelector<HTMLInputElement>('input.doc-search')
        search?.focus()
      }
      if (isMod && key === 'p') {
        event.preventDefault()
        setIsPreviewVisible((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSaveMarkdown, triggerConversion])

  // (moved earlier)

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

  const handleFaqAi = async () => {
    if (!selectedFaq || !faqAiStatus.configured) return
    const followUp = window.prompt('What would you like to ask the AI?', selectedFaq.question)
    if (followUp === null || followUp.trim() === '') {
      return
    }
    setFaqAiLoading(true)
    setFaqAiResponse('')
    try {
      const reply = await window.pandocPro.askFaqAi({
        question: selectedFaq.question,
        answer: selectedFaq.answer,
        followUp: followUp.trim(),
      })
      setFaqAiResponse(reply)
    } catch (err) {
      setFaqAiResponse(err instanceof Error ? `Error: ${err.message}` : 'AI request failed.')
    } finally {
      setFaqAiLoading(false)
    }
  }

  const faqAnswerHtml = selectedFaq ? renderMarkdown(selectedFaq.answer) : ''

  return (
    <div className='App'>
      <header>
        <h1>PandocPro (Preview)</h1>
        <p>Pick a document and run a conversion without touching the terminal.</p>
      </header>
      {showOnboarding && (
        <OnboardingChecklist
          systemInfo={systemInfo}
          settings={settings}
          onClose={() => setShowOnboarding(false)}
        />
      )}

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
            <div className='doc-controls'>
              <input
                type='search'
                className='doc-search'
                placeholder='Search documents'
                value={docFilter}
                onChange={(event) => setDocFilter(sanitizeInput(event.target.value))}
              />
              <label className='doc-sort'>
                Sort
                <select value={docSort} onChange={(event) => setDocSort(event.target.value as 'alpha' | 'recent')}>
                  <option value='alpha'>A → Z</option>
                  <option value='recent'>Recently updated</option>
                </select>
              </label>
            </div>
            <div
              className={`drop-zone ${dropActive ? 'active' : ''}`}
              onDragOver={(event) => {
                event.preventDefault()
                setDropActive(true)
              }}
              onDragLeave={() => setDropActive(false)}
              onDrop={handleFileDrop}
              onClick={async () => {
                try {
                  const picked = await window.pandocPro.pickDocument()
                  if (!picked) return
                  const normalized = picked.replace(/\\/g, '/')
                  const refreshed = await window.pandocPro.listDocuments()
                  setDocs(refreshed)
                  const found =
                    refreshed.find((d) => d.docx.replace(/\\/g, '/') === normalized) ||
                    refreshed.find((d) => d.md.replace(/\\/g, '/') === normalized)
                  if (found) {
                    setSelectedDoc(found)
                    setBanner({ type: 'success', message: 'File selected.' })
                  } else {
                    setBanner({ type: 'error', message: 'Selected file is not in docs/ or not a docx/md.' })
                  }
                } catch (err) {
                  setBanner({
                    type: 'error',
                    message: err instanceof Error ? err.message : 'Failed to pick document.',
                  })
                }
              }}
            >
              Drop a .docx or .md from your docs folder to select it quickly
            </div>
            {filteredDocs.length === 0 ? (
              <p className='muted'>No documents match “{docFilter}”. Try a different search.</p>
            ) : (
              <>
                <select
                  value={selectedDoc?.docx ?? ''}
                  onChange={(event) => {
                    const doc = filteredDocs.find((entry) => entry.docx === event.target.value)
                    setSelectedDoc(doc ?? null)
                  }}
                >
                  {filteredDocs.map((entry) => (
                    <option key={entry.docx} value={entry.docx}>
                      {formatDocLabel(entry)}
                    </option>
                  ))}
                </select>
                {selectedDoc && (
                  <div className='doc-summary'>
                    <div>
                      <span className='muted'>Word source</span>
                      <code>{selectedDoc.docx}</code>
                      <span className='muted'>Updated {new Date(selectedDoc.docxMtime).toLocaleString()}</span>
                      {selectedDoc.docxSize ? (
                        <span className='muted'>Size {formatSize(selectedDoc.docxSize)}</span>
                      ) : null}
      {(selectedDoc?.docxSize ?? 0) > LARGE_DOC_THRESHOLD && (
        <span className='badge badge-warning'>Large file (&gt;50MB)</span>
      )}
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
                      {selectedDoc.mdExists && selectedDoc.mdSize ? (
                        <span className='muted'>Size {formatSize(selectedDoc.mdSize)}</span>
                      ) : null}
                    </div>
                  </div>
                )}
              </>
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
        <div className='panel-header'>
          <h2>FAQ</h2>
          <span className={`badge ${faqAiStatus.configured ? 'badge-success' : 'badge-warning'}`}>
            {faqAiStatus.configured ? `AI ready${faqAiStatus.displayName ? ` · ${faqAiStatus.displayName}` : ''}` : 'AI optional'}
          </span>
        </div>
        {faqEntries.length === 0 ? (
          <p className='muted'>Loading FAQ…</p>
        ) : (
          <div className='faq-layout'>
            <div className='faq-sidebar'>
              <input
                className='faq-search'
                type='search'
                placeholder='Search FAQ'
                value={faqFilter}
                onChange={(event) => setFaqFilter(sanitizeInput(event.target.value))}
              />
              <ul>
                {filteredFaqEntries.length === 0 && <li className='muted'>No questions match that search.</li>}
                {filteredFaqEntries.map((entry) => (
                  <li key={entry.question}>
                    <button
                      className={selectedFaq?.question === entry.question ? 'faq-link active' : 'faq-link'}
                      onClick={() => {
                        setSelectedFaq(entry)
                        setFaqAiResponse('')
                      }}
                    >
                      <span className='faq-section'>{entry.section}</span>
                      <span>{entry.question.replace('**Q: ', '').replace('**', '')}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className='faq-answer'>
              {selectedFaq ? (
                <>
                  <h3>{selectedFaq.question.replace('**', '')}</h3>
                  <div dangerouslySetInnerHTML={{ __html: faqAnswerHtml }} />
                  <div className='faq-actions'>
                    <button className='secondary' onClick={() => navigator.clipboard.writeText(selectedFaq.answer)}>
                      Copy answer
                    </button>
                    {faqAiStatus.configured && (
                      <button className='secondary' onClick={handleFaqAi} disabled={faqAiLoading}>
                        {faqAiLoading ? 'Asking AI…' : 'Ask AI follow-up'}
                      </button>
                    )}
                  </div>
                  {faqAiResponse && <div className='faq-ai-response'>{faqAiResponse}</div>}
                </>
              ) : (
                <p className='muted'>Select a question to see the answer.</p>
              )}
            </div>
          </div>
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
            className={selectedMode === 'to-pptx' ? 'selected' : ''}
            onClick={() => setSelectedMode('to-pptx')}
            title='Export Markdown → PowerPoint deck.'
          >
            Export to PPTX
          </button>
          <button
            className={selectedMode === 'auto' ? 'selected' : ''}
            onClick={() => setSelectedMode('auto')}
            title='Let PandocPro pick the newer file and sync the older one.'
          >
            Auto Sync
          </button>
        </div>
        {isLargeDoc && (
          <p className='muted'>
            Large document detected (&gt;50MB). Conversions may take longer; consider splitting or exporting sections.
          </p>
        )}
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
        <h2>Telemetry</h2>
        {telemetry.length === 0 ? (
          <p className='muted'>No telemetry recorded yet.</p>
        ) : (
          <table className='telemetry'>
            <thead>
              <tr>
                <th>Date</th>
                <th>Conversions</th>
                <th>Errors</th>
                <th>Watch errors</th>
              </tr>
            </thead>
            <tbody>
              {telemetry.slice(-7).map((row) => (
                <tr key={row.date}>
                  <td>{row.date}</td>
                  <td>{row.events?.conversion_success ?? 0}</td>
                  <td>{row.events?.conversion_error ?? 0}</td>
                  <td>{row.events?.watch_error ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
              onClick={() =>
                handleSaveMarkdown('to-docx', (selectedDoc?.docxSize ?? 0) > LARGE_DOC_THRESHOLD)
              }
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
                  <div className='history-actions'>
                    <button
                      className='link-btn'
                      onClick={() => window.pandocPro.openFile(entry.source)}
                      title='Open source file'
                    >
                      Open
                    </button>
                    <button
                      className='link-btn'
                      onClick={() => window.pandocPro.openInFolder(entry.source)}
                      title='Reveal source in Finder/Explorer'
                    >
                      Reveal
                    </button>
                  </div>
                  <span>→</span>
                  <code>{entry.target}</code>
                  <div className='history-actions'>
                    <button
                      className='link-btn'
                      onClick={() => window.pandocPro.openFile(entry.target)}
                      title='Open target file'
                    >
                      Open
                    </button>
                    <button
                      className='link-btn'
                      onClick={() => window.pandocPro.openInFolder(entry.target)}
                      title='Reveal target in Finder/Explorer'
                    >
                      Reveal
                    </button>
                  </div>
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

function parseFaq(markdown: string): FaqEntry[] {
  const lines = markdown.split(/\r?\n/)
  const entries: FaqEntry[] = []
  let currentSection = ''
  let currentQuestion = ''
  let currentAnswer: string[] = []

  const flush = () => {
    if (currentQuestion) {
      entries.push({ question: currentQuestion, answer: currentAnswer.join('\n').trim(), section: currentSection })
      currentQuestion = ''
      currentAnswer = []
    }
  }

  for (const line of lines) {
    if (line.startsWith('## ')) {
      flush()
      currentSection = line.replace(/^##\s+/, '')
      continue
    }
    if (line.startsWith('**Q:')) {
      flush()
      currentQuestion = line.replace(/\*\*/g, '')
      continue
    }
    if (currentQuestion) {
      currentAnswer.push(line)
    }
  }
  flush()
  return entries
}
