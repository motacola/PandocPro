import { useEffect, useMemo, useState } from 'react'
import './App.css'

import type { DocsListEntry, HistoryEntry } from './type/pandoc-pro'

type LogEntry =
  | { type: 'stdout'; text: string }
  | { type: 'stderr'; text: string }
  | { type: 'status'; text: string }

function App() {
  const [docs, setDocs] = useState<DocsListEntry[]>([])
  const [selectedDoc, setSelectedDoc] = useState<DocsListEntry | null>(null)
  const [activeRequest, setActiveRequest] = useState<string | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false)

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
        setLogs((prev) => [
          ...prev,
          { type: 'stderr', text: `Failed to list documents: ${err.message ?? String(err)}` },
        ])
      })
      .finally(() => setIsLoadingDocs(false))
  }

  const fetchHistory = () => {
    setIsLoadingHistory(true)
    window.pandocPro
      .listHistory(6)
      .then((entries) => setHistory(entries))
      .catch((err) =>
        setLogs((prev) => [
          ...prev,
          { type: 'stderr', text: `Failed to load history: ${err.message ?? String(err)}` },
        ]),
      )
      .finally(() => setIsLoadingHistory(false))
  }

  useEffect(() => {
    fetchDocs()
    fetchHistory()

    const cleanups = [
      window.pandocPro.onStdout(({ chunk }) => setLogs((prev) => [...prev, { type: 'stdout', text: chunk }])),
      window.pandocPro.onStderr(({ chunk }) => setLogs((prev) => [...prev, { type: 'stderr', text: chunk }])),
      window.pandocPro.onExit(({ code, requestId }) => {
        setActiveRequest((prev) => (prev === requestId ? null : prev))
        setLogs((prev) => [
          ...prev,
          code === 0
            ? { type: 'status', text: '✅ Conversion finished successfully.' }
            : { type: 'stderr', text: `Conversion exited with code ${code}.` },
        ])
        fetchHistory()
        setBanner(
          code === 0
            ? { type: 'success', message: 'Conversion finished successfully.' }
            : { type: 'error', message: `Conversion exited with code ${code}.` },
        )
      }),
      window.pandocPro.onError(({ message, requestId }) => {
        setActiveRequest((prev) => (prev === requestId ? null : prev))
        setLogs((prev) => [...prev, { type: 'stderr', text: `Error: ${message}` }])
        setBanner({ type: 'error', message })
      }),
    ]

    return () => {
      cleanups.forEach((cleanup) => cleanup())
    }
  }, [])

  const startConversion = () => {
    if (!selectedDoc) return
    const requestId = crypto.randomUUID()
    setActiveRequest(requestId)
    setBanner({ type: 'info', message: `Running ${selectedMode}…` })
    setLogs([{ type: 'status', text: `▶️ Starting conversion (${selectedMode})...` }])
    window.pandocPro.startConversion({
      docxPath: selectedDoc.docx,
      mdPath: selectedDoc.md,
      mode: selectedMode,
      requestId,
    })
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
          <button disabled={disableActions} onClick={startConversion}>
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
        <h2>Activity</h2>
        <pre className='log'>
          {logs.map((entry, index) => (
            <span
              key={`${entry.type}-${index}`}
              className={entry.type === 'stderr' ? 'log-error' : entry.type === 'status' ? 'log-status' : ''}
            >
              {entry.text}
            </span>
          ))}
        </pre>
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
