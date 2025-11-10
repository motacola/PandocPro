import { useEffect, useMemo, useState } from 'react'
import './App.css'

interface DocEntry {
  docx: string
  md: string
}

type LogEntry =
  | { type: 'stdout'; text: string }
  | { type: 'stderr'; text: string }
  | { type: 'status'; text: string }

function App() {
  const [docs, setDocs] = useState<DocEntry[]>([])
  const [selectedDoc, setSelectedDoc] = useState<DocEntry | null>(null)
  const [activeRequest, setActiveRequest] = useState<string | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])

  useEffect(() => {
    window.pandocPro
      .listDocuments()
      .then((files) => {
        setDocs(files)
        if (files.length > 0) {
          setSelectedDoc(files[0])
        }
      })
      .catch((err) => {
        setLogs((prev) => [
          ...prev,
          { type: 'stderr', text: `Failed to list documents: ${err.message ?? String(err)}` },
        ])
      })

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
      }),
      window.pandocPro.onError(({ message, requestId }) => {
        setActiveRequest((prev) => (prev === requestId ? null : prev))
        setLogs((prev) => [...prev, { type: 'stderr', text: `Error: ${message}` }])
      }),
    ]

    return () => {
      cleanups.forEach((cleanup) => cleanup())
    }
  }, [])

  const startConversion = (mode: 'to-md' | 'to-docx' | 'auto') => {
    if (!selectedDoc) return
    const requestId = crypto.randomUUID()
    setActiveRequest(requestId)
    setLogs([{ type: 'status', text: `▶️ Starting conversion (${mode})...` }])
    window.pandocPro.startConversion({
      docxPath: selectedDoc.docx,
      mdPath: selectedDoc.md,
      mode,
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
        {docs.length === 0 && <p>No .docx files found in your docs folder.</p>}
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
      </section>

      <section className='panel'>
        <h2>Actions</h2>
        <div className='actions'>
          <button disabled={disableActions} onClick={() => startConversion('to-md')}>
            Convert to Markdown
          </button>
          <button disabled={disableActions} onClick={() => startConversion('to-docx')}>
            Export to Word
          </button>
          <button disabled={disableActions} onClick={() => startConversion('auto')}>
            Auto Sync
          </button>
          {activeRequest && (
            <button
              className='secondary'
              onClick={() => {
                window.pandocPro.cancelConversion(activeRequest)
                setActiveRequest(null)
              }}
            >
              Cancel
            </button>
          )}
        </div>
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
    </div>
  )
}

export default App
