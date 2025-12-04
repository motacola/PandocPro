import React from 'react'
import DOMPurify from 'dompurify'
import { EmptyState as EmptyStateComponent } from '../ui'

interface FaqEntry {
  question: string
  answer: string
  section: string
}

interface FaqViewProps {
  entries: FaqEntry[]
  filter: string
  onFilterChange: (value: string) => void
  selected: FaqEntry | null
  onSelect: (entry: FaqEntry) => void
  aiStatus: { configured: boolean; displayName?: string }
  onAskAi: () => void
  aiResponse: string
  aiLoading: boolean
  renderMarkdown: (markdown: string) => string
}

export const FaqView: React.FC<FaqViewProps> = ({
  entries,
  filter,
  onFilterChange,
  selected,
  onSelect,
  aiStatus,
  onAskAi,
  aiResponse,
  aiLoading,
  renderMarkdown,
}) => {
  const faqAnswerHtml = selected ? renderMarkdown(selected.answer) : ''

  return (
    <div className='view-faq fade-in'>
      <header className='view-header'>
        <h2>FAQ</h2>
        <span className={`badge ${aiStatus.configured ? 'badge-success' : 'badge-warning'}`}>
          {aiStatus.configured ? 'AI Active' : 'AI Inactive'}
        </span>
      </header>
      <div className='faq-container faq-layout'>
        <div className='faq-sidebar'>
          <input
            className='faq-search'
            type='search'
            placeholder='Search questions...'
            value={filter}
            onChange={(event) => onFilterChange(event.target.value)}
          />
          <div className='faq-list'>
            {entries.map((entry) => (
              <button
                key={entry.question}
                className={`faq-item ${selected?.question === entry.question ? 'active' : ''}`}
                onClick={() => onSelect(entry)}
              >
                <span className='faq-section-label'>{entry.section}</span>
                <span className='faq-question-text'>
                  {entry.question.replace('**Q: ', '').replace('**', '')}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className='faq-content'>
          {selected ? (
            <div className='fade-in'>
              <h3>{selected.question.replace('**', '')}</h3>
              <div
                className='markdown-body'
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(faqAnswerHtml) }}
              />
              <div className='faq-actions'>
                <button
                  className='secondary'
                  onClick={() => navigator.clipboard.writeText(selected.answer)}
                >
                  Copy Answer
                </button>
                {aiStatus.configured && (
                  <button className='secondary' onClick={onAskAi} disabled={aiLoading}>
                    {aiLoading ? 'Thinking…' : 'Ask AI Follow-up'}
                  </button>
                )}
              </div>
              {aiResponse && <div className='faq-ai-response'>{aiResponse}</div>}
            </div>
          ) : (
            <div className='empty-selection fade-in'>
              <EmptyStateComponent icon='❓' title='Select a question' />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
