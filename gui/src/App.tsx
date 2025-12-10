import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { marked } from 'marked'
import TurndownService from 'turndown'
import {
  Home, FileText, Settings as SettingsIcon, HelpCircle
} from 'lucide-react'
import './App.css'
import { OnboardingChecklist } from './components/OnboardingChecklist'
import { OnboardingTour } from './components/OnboardingTour'
import { Button, Badge, ToastContainer, EmptyState as EmptyStateComponent } from './components/ui'
import { CollapsibleSection } from './components/ui/CollapsibleSection'
import { EditorToolbar } from './components/EditorToolbar'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ErrorDialog } from './components/ErrorDialog'
import { Modal } from './components/ui/Modal'
import { GlobalDragDrop } from './components/GlobalDragDrop'
import { Maximize, Minimize } from 'lucide-react'

import { DashboardView } from './components/views/DashboardView'
import { DocumentsView } from './components/views/DocumentsView'
import { SettingsView } from './components/views/SettingsView'
import { FaqView } from './components/views/FaqView'

import type { DocsListEntry, HistoryEntry, WatchStatus, SettingsData, SystemInfo, TelemetryEntry, LogRun, LogEntry, ConversionPreset } from './type/pandoc-pro'

type ConversionMode = 'to-md' | 'to-docx' | 'to-pptx' | 'auto'

interface Toast {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
}

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
  if (normalizedPath.indexOf('\0') !== -1) {
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

const BUILT_IN_PRESETS: ConversionPreset[] = [
  {
    id: 'built-in-academic',
    name: '📚 Academic Paper',
    description: 'For research papers with citations and numbered sections',
    mode: 'to-md',
    options: {
      includeMetadata: true,
      textOnly: false,
    },
  },
  {
    id: 'built-in-business',
    name: '💼 Business Report',
    description: 'Professional formatting for business documents',
    mode: 'to-docx',
    options: {
      includeMetadata: true,
      textOnly: false,
    },
  },
  {
    id: 'built-in-blog',
    name: '✍️ Blog Post',
    description: 'Simple, web-friendly markdown',
    mode: 'to-md',
    options: {
      includeMetadata: false,
      textOnly: true,
    },
  },
  {
    id: 'built-in-auto',
    name: '🎯 Auto-Detect',
    description: 'Automatically determines best conversion direction',
    mode: 'auto',
    options: {},
  },
]

const Skeleton = ({ count = 1, height = '1em' }) => {
  return (
    <div className='skeleton-container'>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className='skeleton-item' style={{ height }} />
      ))}
    </div>
  )
}

const ShortcutsModal = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className='modal-backdrop' onClick={onClose}>
      <div className='modal-card' onClick={(e) => e.stopPropagation()}>
        <h3>Keyboard Shortcuts</h3>
        <div className='shortcuts-grid'>
          <div className='shortcut-row'>
            <span className='shortcut-desc'>Save Markdown</span>
            <span className='shortcut-keys'><kbd>Cmd</kbd> + <kbd>S</kbd></span>
          </div>
          <div className='shortcut-row'>
            <span className='shortcut-desc'>Save & Convert to Word</span>
            <span className='shortcut-keys'><kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd></span>
          </div>
          <div className='shortcut-row'>
            <span className='shortcut-desc'>Run Conversion</span>
            <span className='shortcut-keys'><kbd>Cmd</kbd> + <kbd>E</kbd></span>
          </div>
          <div className='shortcut-row'>
            <span className='shortcut-desc'>Toggle Preview</span>
            <span className='shortcut-keys'><kbd>Cmd</kbd> + <kbd>P</kbd></span>
          </div>
          <div className='shortcut-row'>
            <span className='shortcut-desc'>Focus Search</span>
            <span className='shortcut-keys'><kbd>Cmd</kbd> + <kbd>F</kbd></span>
          </div>
          <div className='shortcut-row'>
            <span className='shortcut-desc'>Switch Mode</span>
            <span className='shortcut-keys'><kbd>Cmd</kbd> + <kbd>1-4</kbd></span>
          </div>
          <div className='shortcut-row'>
            <span className='shortcut-desc'>Show Shortcuts</span>
            <span className='shortcut-keys'><kbd>Cmd</kbd> + <kbd>/</kbd></span>
          </div>
          <div className='shortcut-row'>
            <span className='shortcut-desc'>Toggle Sidebar</span>
            <span className='shortcut-keys'><kbd>Cmd</kbd> + <kbd>B</kbd></span>
          </div>
        </div>
        <button className='primary full-width' onClick={onClose}>Close</button>
      </div>
    </div>
  )
}

const LegacyFaqAnchor = () => <div className='faq-layout' style={{ display: 'none' }} aria-hidden />

function App() {
  const [view, setView] = useState<'dashboard' | 'documents' | 'settings' | 'faq'>('documents')
  const [docs, setDocs] = useState<DocsListEntry[]>([])
  const [selectedDoc, setSelectedDoc] = useState<DocsListEntry | null>(null)
  const [docFilter, setDocFilter] = useState<string>('')
  const [docSort, setDocSort] = useState<'alpha' | 'recent'>('alpha')
  const [activeRequest, setActiveRequest] = useState<string | null>(null)
  const [logs, setLogs] = useState<LogRun[]>([])
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(true)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false)
  const [selectedMode, setSelectedMode] = useState<ConversionMode>('to-md')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [isEditorLoading, setIsEditorLoading] = useState<boolean>(false)
  const [isPreviewVisible, setIsPreviewVisible] = useState<boolean>(true)
  const [isSavingMarkdown, setIsSavingMarkdown] = useState<boolean>(false)
  const [dirty, setDirty] = useState<boolean>(false)
  const [liveMarkdown, setLiveMarkdown] = useState<string>('')
  const [previewHtml, setPreviewHtml] = useState<string>('')
  const [watchStatus, setWatchStatus] = useState<WatchStatus | null>(null)
  const [isStartingWatch, setIsStartingWatch] = useState<boolean>(false)
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false)
  const [faqEntries, setFaqEntries] = useState<FaqEntry[]>([])
  const [selectedFaq, setSelectedFaq] = useState<FaqEntry | null>(null)
  const [faqFilter, setFaqFilter] = useState<string>('')
  const [faqAiStatus, setFaqAiStatus] = useState<{ configured: boolean; displayName?: string }>({ configured: false })
  const [faqAiLoading, setFaqAiLoading] = useState<boolean>(false)
  const [faqAiResponse, setFaqAiResponse] = useState<string>('')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('pandocpro-theme')
    return (saved === 'light' || saved === 'dark') ? saved : 'dark'
  })
  const [showShortcuts, setShowShortcuts] = useState<boolean>(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false)
  const LARGE_DOC_THRESHOLD = 50 * 1024 * 1024 // 50MB
  const [dropActive, setDropActive] = useState<boolean>(false)
  const [telemetry, setTelemetry] = useState<TelemetryEntry[]>([])
  const [conversionProgress, setConversionProgress] = useState<number>(0)
  const [bulkConversionActive, setBulkConversionActive] = useState<boolean>(false)
  const [errorDialog, setErrorDialog] = useState<{
    isOpen: boolean
    title: string
    problem: string
    solution: string
    actions?: Array<{ label: string; onClick: () => void; variant?: 'primary' | 'secondary'; external?: boolean }>
    severity?: 'error' | 'warning' | 'info'
  }>({ isOpen: false, title: '', problem: '', solution: '' })
  const [presets, setPresets] = useState<ConversionPreset[]>(BUILT_IN_PRESETS)
  const [selectedPresetId, setSelectedPresetId] = useState<string>('built-in-auto')

  const [lastUsedModes, setLastUsedModes] = useState<Record<string, ConversionMode>>({})
  const [isZenMode, setIsZenMode] = useState<boolean>(false)
  const [aiPrompt, setAiPrompt] = useState<{ isOpen: boolean; question: string; followUp: string }>({
    isOpen: false,
    question: '',
    followUp: '',
  })
  // Zen Mode toast ref to prevent multiple toasts
  const zenToastShown = useRef<boolean>(false)

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

  const toastTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const addToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, type, message }])
    const timeoutId = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
      toastTimeouts.current.delete(id)
    }, 5000)
    toastTimeouts.current.set(id, timeoutId)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timeoutId = toastTimeouts.current.get(id)
    if (timeoutId) {
      clearTimeout(timeoutId)
      toastTimeouts.current.delete(id)
    }
  }, [])

  const handleSmartError = useCallback((error: Error | string, context?: string) => {
    const errorMessage = typeof error === 'string' ? error : error.message
    const errorLower = errorMessage.toLowerCase()

    // Detect Pandoc missing
    if (errorLower.includes('pandoc') && (errorLower.includes('not found') || errorLower.includes('command not found'))) {
      setErrorDialog({
        isOpen: true,
        title: 'Pandoc Not Installed',
        problem: 'PandocPro requires Pandoc to convert documents, but it\'s not installed on your system.',
        solution: 'Install Pandoc using Homebrew (recommended) or download it from the official website.',
        severity: 'error',
        actions: [
          {
            label: 'Install with Homebrew',
            onClick: () => {
              // Copy command to clipboard
              navigator.clipboard.writeText('brew install pandoc')
              addToast('info', 'Command copied! Paste it in Terminal')
              setErrorDialog({ ...errorDialog, isOpen: false })
            },
            variant: 'primary',
          },
          {
            label: 'Download Pandoc',
            onClick: () => {
              window.open('https://pandoc.org/installing.html', '_blank')
            },
            external: true,
          },
        ],
      })
      return
    }

    // Detect file permission errors
    if (errorLower.includes('permission') || errorLower.includes('eacces')) {
      setErrorDialog({
        isOpen: true,
        title: 'Permission Denied',
        problem: `You don't have permission to ${context || 'access this file'}.`,
        solution: 'Make sure the file or folder has the correct permissions. You may need to change ownership or move the file to a different location.',
        severity: 'error',
        actions: [
          {
            label: 'Choose Different Folder',
            onClick: async () => {
              setErrorDialog({ ...errorDialog, isOpen: false })
              await window.pandocPro.chooseDocsPath()
              // Docs will be refreshed on next nav or manual refresh
            },
            variant: 'primary',
          },
        ],
      })
      return
    }

    // Generic error
    setErrorDialog({
      isOpen: true,
      title: 'An Error Occurred',
      problem: errorMessage,
      solution: 'Try the operation again. If the problem persists, check the logs for more details.',
      severity: 'error',
    })
  }, [addToast, errorDialog])

  // Cleanup toast timeouts on unmount
  useEffect(() => {
    return () => {
      toastTimeouts.current.forEach((timeoutId) => clearTimeout(timeoutId))
      toastTimeouts.current.clear()
    }
  }, [])

  const normalizedDocsRoot = useMemo(() => settings?.docsPath?.replace(/\\/g, '/') ?? '', [settings])
  const isLargeDoc = selectedDoc?.docxSize ? selectedDoc.docxSize > LARGE_DOC_THRESHOLD : false

  // Auto-detect conversion mode based on file timestamps
  const autoDetectMode = useCallback((doc: DocsListEntry): ConversionMode => {
    if (!doc.mdExists) return 'to-md' // No MD file, convert to MD
    if (!doc.docxMtime || !doc.mdMtime) return 'to-md' // Missing timestamps, default to MD

    // If DOCX is newer, convert to MD; if MD is newer, convert to DOCX
    return doc.docxMtime > doc.mdMtime ? 'to-md' : 'to-docx'
  }, [])

  // Get effective mode (handles auto-detect)
  const getEffectiveMode = useCallback((mode: ConversionMode, doc?: DocsListEntry | null): ConversionMode => {
    if (mode !== 'auto') return mode
    if (!doc) return 'to-md'

    // Check last-used mode for this document
    const lastMode = lastUsedModes[doc.docx]
    if (lastMode && lastMode !== 'auto') return lastMode

    // Auto-detect based on timestamps
    return autoDetectMode(doc)
  }, [lastUsedModes, autoDetectMode])

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
      addToast('error', 'No file detected.')
      return
    }
    const normalizedPath = file.path.replace(/\\/g, '/')
    const docsRoot = normalizedDocsRoot || '/docs/'
    if (!normalizedPath.startsWith(docsRoot)) {
      addToast('error', 'Please drop files from your docs folder.')
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
        addToast('success', 'File selected. Running conversion…')
        const mode: ConversionMode =
          found.docx.toLowerCase().endsWith('.docx') && (!found.mdExists || found.docxMtime > (found.mdMtime ?? 0))
            ? 'to-md'
            : 'to-docx'
        triggerConversion(mode)
      } else {
        addToast('error', 'File is not a supported docx/md in docs/.')
      }
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to process dropped file.')
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

  const triggerConversion = useCallback((modeOverride?: ConversionMode, forceTextOnly?: boolean) => {
    if (!selectedDoc) return

    const docxValidation = validateFilePath(selectedDoc.docx)
    const mdValidation = validateFilePath(selectedDoc.md)

    if (!docxValidation.valid) {
      addToast('error', `Invalid .docx path: ${docxValidation.error}`)
      return
    }
    if (!mdValidation.valid) {
      addToast('error', `Invalid .md path: ${mdValidation.error}`)
      return
    }

    const rawMode = modeOverride ?? selectedMode
    const mode = getEffectiveMode(rawMode, selectedDoc)

    // Save last-used mode for this document
    if (rawMode !== 'auto') {
      setLastUsedModes(prev => ({ ...prev, [selectedDoc.docx]: rawMode }))
    }

    const requestId = crypto.randomUUID()
    setActiveRequest(requestId)
    addToast('info', `Running ${mode}…`)
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
  }, [selectedDoc, selectedMode, addToast, getEffectiveMode, LARGE_DOC_THRESHOLD])

  const handleSaveMarkdown = useCallback(async (modeAfterSave?: ConversionMode, forceTextOnly?: boolean) => {
    if (!selectedDoc || !editor) return
    setIsSavingMarkdown(true)
    try {
      const html = editor.getHTML()
      const markdown = turndown.turndown(html)

      const contentValidation = validateMarkdownContent(markdown)
      if (!contentValidation.valid) {
        addToast('error', contentValidation.error || 'Content validation failed')
        return
      }

      const pathValidation = validateFilePath(selectedDoc.md)
      if (!pathValidation.valid) {
        addToast('error', `Cannot save: ${pathValidation.error}`)
        return
      }

      await window.pandocPro.writeFile(selectedDoc.md, markdown)
      setDirty(false)
      setLiveMarkdown(markdown)
      setPreviewHtml(renderMarkdown(markdown))
      addToast('success', 'Markdown saved.')
      if (modeAfterSave) {
        triggerConversion(modeAfterSave, forceTextOnly)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save Markdown file.'
      addToast('error', message)
    } finally {
      setIsSavingMarkdown(false)
    }
  }, [selectedDoc, editor, turndown, addToast, triggerConversion])

  const handleQuickConvertAll = useCallback(async () => {
    const pendingDocs = docs.filter(d => !d.mdExists || (d.docxMtime > (d.mdMtime ?? 0)))
    if (pendingDocs.length === 0) {
      addToast('info', 'No pending documents to convert')
      return
    }

    setBulkConversionActive(true)
    setConversionProgress(0)
    addToast('info', `Converting ${pendingDocs.length} documents...`)

    for (let i = 0; i < pendingDocs.length; i++) {
      const doc = pendingDocs[i]
      const requestId = crypto.randomUUID()
      setActiveRequest(requestId)

      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          cleanup()
          reject(new Error('Conversion timed out'))
        }, 30000) // 30s timeout per doc

        const cleanup = window.pandocPro.onExit(({ code, requestId: exitRequestId }) => {
          if (exitRequestId === requestId) {
            clearTimeout(timeoutId)
            cleanup()
            setConversionProgress(((i + 1) / pendingDocs.length) * 100)
            resolve()
          }
        })

        window.pandocPro.startConversion({
          docxPath: doc.docx,
          mdPath: doc.md,
          mode: 'to-md',
          requestId,
          textOnly: (doc.docxSize ?? 0) > LARGE_DOC_THRESHOLD,
        })
      }).catch(err => {
        console.error(`Skipping doc due to error: ${err.message}`)
        // Don't crash the whole batch, just move to next
        addToast('error', `Skipped ${formatDocLabel(doc)}: ${err.message}`)
      })
    }

    setActiveRequest(null)
    setBulkConversionActive(false)
    setConversionProgress(0)
    addToast('success', `Converted ${pendingDocs.length} documents`)

    // Desktop notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('PandocPro - Conversion Complete', {
        body: `Successfully converted ${pendingDocs.length} ${pendingDocs.length === 1 ? 'document' : 'documents'}`,
        icon: '/favicon.ico',
        tag: 'bulk-conversion',
      })
    }

    fetchDocs()
    fetchHistory()
  }, [docs, addToast, LARGE_DOC_THRESHOLD, fetchDocs, fetchHistory])

  const handleSyncRecent = useCallback(async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTimestamp = today.getTime()

    const recentDocs = docs.filter(d => {
      const docxTime = d.docxMtime ?? 0
      const mdTime = d.mdMtime ?? 0
      return Math.max(docxTime, mdTime) >= todayTimestamp
    })

    if (recentDocs.length === 0) {
      addToast('info', 'No files modified today')
      return
    }

    addToast('info', `Syncing ${recentDocs.length} recent files...`)

    for (const doc of recentDocs) {
      const mode: ConversionMode = doc.docxMtime > (doc.mdMtime ?? 0) ? 'to-md' : 'to-docx'
      const requestId = crypto.randomUUID()

      window.pandocPro.startConversion({
        docxPath: doc.docx,
        mdPath: doc.md,
        mode,
        requestId,
        textOnly: (doc.docxSize ?? 0) > LARGE_DOC_THRESHOLD,
      })
    }

    addToast('success', `Syncing ${recentDocs.length} files`)
  }, [docs, addToast, LARGE_DOC_THRESHOLD])

  const recentFilesCount = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTimestamp = today.getTime()

    return docs.filter(d => {
      const docxTime = d.docxMtime ?? 0
      const mdTime = d.mdMtime ?? 0
      return Math.max(docxTime, mdTime) >= todayTimestamp
    }).length
  }, [docs])

  const handleChooseReferenceDoc = useCallback(async () => {
    try {
      const updated = await window.pandocPro.chooseReferenceDoc()
      if (updated) {
        setSettings(updated)
        if (updated.referenceDoc) {
          addToast('success', 'Reference template updated.')
        }
      }
      return updated
    } catch (err) {
      addToast('error', 'Failed to update reference doc setting.')
      return null
    }
  }, [addToast])

  useEffect(() => {
    fetchDocs()
    fetchHistory()

    // Request notification permissions
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    window.pandocPro.getSystemInfo().then((info) => {
      setSystemInfo(info)
      if (!info.pandocVersion) setShowOnboarding(true)
    })
    window.pandocPro.getSettings().then((s) => {
      setSettings(s)
      // If no docs path, definitely show onboarding. 
      // Ideally we'd also check a 'tourCompleted' flag, but 'docsPath' is a good proxy for new users for now.
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
        if (code === 0) {
          addToast('success', 'Conversion finished successfully.')
          appendLogEntry(requestId, { type: 'notify', text: 'Conversion complete.' })
        } else {
          addToast('error', `Conversion exited with code ${code}.`)
          appendLogEntry(requestId, { type: 'notify', text: 'Conversion failed.' })
        }
      }),
      window.pandocPro.onError(({ message, requestId }) => {
        setActiveRequest((prev) => (prev === requestId ? null : prev))
        appendLogEntry(requestId, { type: 'stderr', text: `Error: ${message}` })
        addToast('error', message)
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
  }, [appendLogEntry, addToast])

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
        event.preventDefault()
        if (event.shiftKey) {
          // Zen Mode
          setIsZenMode(prev => {
            const next = !prev
            if (next && !zenToastShown.current) {
              addToast('info', 'Zen Mode: Press Cmd+Shift+F to exit')
              zenToastShown.current = true
            }
            return next
          })
        } else {
          // Focus search
          const searchInput = document.querySelector('.search-input') as HTMLInputElement
          if (searchInput) searchInput.focus()
        }
      }
      if (isMod && key === 'b') {
        event.preventDefault()
        setSidebarCollapsed(prev => !prev)
        addToast('info', sidebarCollapsed ? 'Sidebar expanded' : 'Sidebar collapsed')
      }
      if (isMod && key === 'p') {
        event.preventDefault()
        setIsPreviewVisible((prev) => !prev)
      }
      if (isMod && key === '/') {
        event.preventDefault()
        setShowShortcuts(true)
      }
      if (key === 'escape') {
        setShowShortcuts(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSaveMarkdown, triggerConversion, addToast])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('pandocpro-theme', theme)
  }, [theme])

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
    // Open custom modal instead of window.prompt
    setAiPrompt({
      isOpen: true,
      question: selectedFaq.question,
      followUp: ''
    })
  }

  const submitAiQuestion = async () => {
    if (!selectedFaq) return
    const { followUp } = aiPrompt
    if (!followUp || followUp.trim() === '') return

    setAiPrompt(prev => ({ ...prev, isOpen: false }))
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

  // Helper to parse FAQ content (simple regex-based parser for the demo)
  function parseFaq(content: string): FaqEntry[] {
    try {
      const sections = content.split(/^## /gm).slice(1)
      const entries: FaqEntry[] = []
      for (const sectionBlock of sections) {
        const [sectionTitle, ...rest] = sectionBlock.split('\n')
        const sectionBody = rest.join('\n')
        const questions = sectionBody.split(/\*\*Q: /g).slice(1)
        for (const qBlock of questions) {
          const [questionLine, ...answerLines] = qBlock.split('\n')
          entries.push({
            section: sectionTitle.trim(),
            question: `**Q: ${questionLine.trim()}`,
            answer: answerLines.join('\n').trim(),
          })
        }
      }
      return entries
    } catch (err) {
      addToast('error', 'Failed to load FAQ content')
      return []
    }
  }

  const stats = useMemo(() => {
    const total = docs.length
    const synced = docs.filter(d => d.mdExists).length
    const pending = total - synced
    const totalSize = docs.reduce((acc, d) => acc + (d.docxSize || 0), 0)
    return { total, synced, pending, totalSize }
  }, [docs])

  return (
    <ErrorBoundary>
      <GlobalDragDrop onDrop={async (files) => {
        const file = files[0]
        if (!file?.path) {
          addToast('error', 'No file detected.')
          return
        }
        const normalizedPath = file.path.replace(/\\/g, '/')
        const docsRoot = normalizedDocsRoot || '/docs/'
        if (!normalizedPath.startsWith(docsRoot)) {
          addToast('error', 'Please drop files from your docs folder.')
          return
        }
        try {
          const refreshed = await window.pandocPro.listDocuments()
          setDocs(refreshed)
          const found = refreshed.find((d) => d.md.replace(/\\/g, '/') === normalizedPath)
          if (found) {
            setSelectedDoc(found)
            addToast('success', 'File selected. Running conversion…')
            const mode: ConversionMode =
              found.docx.toLowerCase().endsWith('.docx') && (!found.mdExists || found.docxMtime > (found.mdMtime ?? 0))
                ? 'to-md'
                : 'to-docx'
            triggerConversion(mode)
          } else {
            addToast('error', 'File is not a supported docx/md in docs/.')
          }
        } catch (err) {
          addToast('error', err instanceof Error ? err.message : 'Failed to process dropped file.')
        }
      }}>
        <div
          className={`App ${theme} ${isZenMode ? 'zen-mode' : ''} glass-effect`}
          onDragOver={(e) => {
            e.preventDefault()
            setDropActive(true)
          }}
          onDragLeave={() => setDropActive(false)}
          onDrop={handleFileDrop}
        >
          <LegacyFaqAnchor />
          <AnimatePresence>
            {showOnboarding && (
              <OnboardingChecklist
                systemInfo={systemInfo}
                settings={settings}
                onClose={() => setShowOnboarding(false)}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
          </AnimatePresence>

          <ToastContainer toasts={toasts} onDismiss={dismissToast} />

          <ErrorDialog
            isOpen={errorDialog.isOpen}
            onClose={() => setErrorDialog({ ...errorDialog, isOpen: false })}
            title={errorDialog.title}
            problem={errorDialog.problem}
            solution={errorDialog.solution}
            actions={errorDialog.actions}
            severity={errorDialog.severity}
          />

          <motion.aside
            className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className='sidebar-header'>
              {!sidebarCollapsed && (
                <>
                  <h1>PandocPro (Preview)</h1>
                  <Badge variant="info" size="sm">Preview</Badge>
                </>
              )}
              <button
                className='sidebar-toggle'
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-expanded={!sidebarCollapsed}
              >
                {sidebarCollapsed ? <Maximize className="w-5 h-5" /> : <Minimize className="w-5 h-5" />}
              </button>
            </div>
            <nav className='sidebar-nav' role="navigation" aria-label="Main navigation">
              <motion.button
                className={view === 'dashboard' ? 'active' : ''}
                onClick={() => setView('dashboard')}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                title="Dashboard"
                aria-current={view === 'dashboard'}
              >
                <Home className="w-5 h-5" /> {!sidebarCollapsed && <span className="nav-label">Dashboard</span>}
              </motion.button>
              <motion.button
                className={view === 'documents' ? 'active' : ''}
                onClick={() => setView('documents')}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                title="Documents"
                aria-current={view === 'documents'}
              >
                <FileText className="w-5 h-5" /> {!sidebarCollapsed && <span className="nav-label">Documents</span>}
              </motion.button>
              <motion.button
                className={view === 'settings' ? 'active' : ''}
                onClick={() => setView('settings')}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                title="Settings"
                aria-current={view === 'settings'}
              >
                <SettingsIcon className="w-5 h-5" /> {!sidebarCollapsed && <span className="nav-label">Settings</span>}
              </motion.button>
              <motion.button
                className={view === 'faq' ? 'active' : ''}
                onClick={() => setView('faq')}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                title="FAQ"
                aria-current={view === 'faq'}
              >
                <HelpCircle className="w-5 h-5" /> {!sidebarCollapsed && <span className="nav-label">FAQ</span>}
              </motion.button>
            </nav>
            <div className='sidebar-footer' role="contentinfo">
              {systemInfo && (
                <div className='status-indicator' title={`Pandoc ${systemInfo.pandocVersion || 'Missing'}`} aria-label={`Pandoc status: ${systemInfo.pandocVersion || 'Not installed'}`}>
                  <span className={`dot ${systemInfo.pandocVersion ? 'online' : 'offline'}`} aria-hidden="true" />
                  {!sidebarCollapsed && <span className="status-text">Pandoc {systemInfo.pandocVersion || 'Not installed'}</span>}
                </div>
              )}
            </div>
          </motion.aside>

          <main className='main-content' role="main">
            {view === 'dashboard' && (
              <DashboardView
                stats={stats}
                history={history}
                isLoadingHistory={isLoadingHistory}
                onScan={() => {
                  fetchDocs()
                  setView('documents')
                }}
                onSettings={() => setView('settings')}
                formatSize={formatSize}
                onQuickConvertAll={handleQuickConvertAll}
                onSyncRecent={handleSyncRecent}
                recentFilesCount={recentFilesCount}
                isProcessing={bulkConversionActive || !!activeRequest}
                conversionProgress={conversionProgress}
                bulkConversionActive={bulkConversionActive}
              />
            )}

            {view === 'documents' && (
              <DocumentsView
                docs={filteredDocs}
                isLoadingDocs={isLoadingDocs}
                onRefresh={fetchDocs}
                selectedDoc={selectedDoc}
                onSelectDoc={setSelectedDoc}
                docFilter={docFilter}
                onDocFilterChange={(val) => setDocFilter(sanitizeInput(val))}
                docSort={docSort}
                onDocSortChange={setDocSort}
                dropActive={dropActive}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDropActive(true)
                }}
                onDragLeave={() => setDropActive(false)}
                onDrop={handleFileDrop}
                onPickDocument={async () => {
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
                      addToast('success', 'File selected.')
                    } else {
                      addToast('error', 'Selected file is not in docs/ or not a docx/md.')
                    }
                  } catch (err) {
                    addToast('error', err instanceof Error ? err.message : 'Failed to pick document.')
                  }
                }}
                formatDocLabel={formatDocLabel}
                LARGE_DOC_THRESHOLD={LARGE_DOC_THRESHOLD}
                dirty={dirty}
                selectedMode={selectedMode}
                onSelectMode={setSelectedMode}
                disableActions={disableActions}
                activeRequest={activeRequest}
                onTriggerConversion={() => triggerConversion()}
                isPreviewVisible={isPreviewVisible}
                onTogglePreview={() => setIsPreviewVisible(!isPreviewVisible)}
                onSaveMarkdown={() => handleSaveMarkdown()}
                editor={editor}
                previewHtml={previewHtml}
                logs={logs}
              />
            )}

            {view === 'settings' && (
              <SettingsView
                systemInfo={systemInfo}
                settings={settings}
                theme={theme}
                onThemeChange={setTheme}
                onUpdateSettings={async (payload) => {
                  const updated = await window.pandocPro.updateSettings(payload)
                  setSettings(updated)
                  return updated
                }}
                onChooseDocsPath={async () => {
                  const updated = await window.pandocPro.chooseDocsPath()
                  if (updated) {
                    setSettings(updated)
                    fetchDocs()
                  }
                  return updated
                }}
                onChooseReferenceDoc={handleChooseReferenceDoc}
                telemetry={telemetry}
                onReloadLlmStatus={async () => {
                  const status = await window.pandocPro.getLlmStatus()
                  setFaqAiStatus(status)
                }}
              />
            )}

            {view === 'faq' && (
              <FaqView
                entries={filteredFaqEntries}
                filter={faqFilter}
                onFilterChange={(val) => setFaqFilter(sanitizeInput(val))}
                selected={selectedFaq}
                onSelect={(entry) => {
                  setSelectedFaq(entry)
                  setFaqAiResponse('')
                }}
                aiStatus={faqAiStatus}
                onAskAi={handleFaqAi}
                aiResponse={faqAiResponse}
                aiLoading={faqAiLoading}
                renderMarkdown={renderMarkdown}
              />
            )}
          </main>
          <Modal
            isOpen={aiPrompt.isOpen}
            onClose={() => setAiPrompt(prev => ({ ...prev, isOpen: false }))}
            title='Ask AI'
            footer={
              <>
                <button className='secondary' onClick={() => setAiPrompt(prev => ({ ...prev, isOpen: false }))}>Cancel</button>
                <button className='primary' onClick={submitAiQuestion}>Ask Question</button>
              </>
            }
          >
            <div className='form-group'>
              <label>Your Question</label>
              <input
                type='text'
                className='form-input'
                value={aiPrompt.followUp}
                onChange={e => setAiPrompt(prev => ({ ...prev, followUp: e.target.value }))}
                placeholder={aiPrompt.question}
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') submitAiQuestion()
                }}
              />
              <p className='help-text'>Ask a follow-up or clarification about this FAQ.</p>
            </div>
          </Modal>

          {/* Global Drag Drop wrapper end */}
        </div>
      </GlobalDragDrop>
    </ErrorBoundary>
  )
}

export default App

