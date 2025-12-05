import { Bold, Italic, Strikethrough, Heading1, Heading2, Heading3, List, ListOrdered, Code2, Quote, Sparkles, ChevronDown } from 'lucide-react'
import React, { useState, useRef, useEffect } from 'react'
import { Editor } from '@tiptap/react'
import type { Persona } from '../type/pandoc-pro'

export interface EditorToolbarProps {
  editor: Editor | null
  onAiAction: (instruction: string) => void
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor, onAiAction }) => {
  const [showAiMenu, setShowAiMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [personas, setPersonas] = useState<Persona[]>([])

  useEffect(() => {
    // Load personas
    if (window.pandocPro && window.pandocPro.getPersonas) {
      window.pandocPro.getPersonas().then(setPersonas).catch(console.error)
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowAiMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!editor) {
    return null
  }

  const handleAiAction = (instruction: string) => {
    onAiAction(instruction)
    setShowAiMenu(false)
  }

  const aiActions = [
    { label: 'Fix Grammar & Spelling', instruction: 'Fix grammar and spelling errors. Maintain tone.' },
    { label: 'Make Professional', instruction: 'Rewrite to be more professional, concise, and corporate.' },
    { label: 'Simplify Language', instruction: 'Simplify the language for a general audience. Use Flesch-Kincaid Grade 8 level.' },
    { label: 'Summarize (TL;DR)', instruction: 'Add a TL;DR summary at the top of the content.' },
    { label: 'Format Clean Up', instruction: 'Ensure consistent markdown formatting, fixing any spacing or structural inconsistencies.' }
  ]

  const personaActions = personas.map(p => ({
    label: `Rewrite as ${p.name}`,
    instruction: `Rewrite the content in the persona of ${p.name}: ${p.instruction}`
  }))

  const allAiActions = [...aiActions, ...personaActions]

  return (
    <div className='editor-toolbar'>
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'is-active' : ''}
        title="Bold (Cmd+B)"
      >
        <Bold size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'is-active' : ''}
        title="Italic (Cmd+I)"
      >
        <Italic size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={editor.isActive('strike') ? 'is-active' : ''}
        title="Strike"
      >
        <Strikethrough size={16} />
      </button>
      <div className="divider" />
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
        title="H1"
      >
        <Heading1 size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
        title="H2"
      >
        <Heading2 size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
        title="H3"
      >
        <Heading3 size={16} />
      </button>
      <div className="divider" />
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive('bulletList') ? 'is-active' : ''}
        title="Bullet List"
      >
        <List size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive('orderedList') ? 'is-active' : ''}
        title="Ordered List"
      >
        <ListOrdered size={16} />
      </button>
      <div className="divider" />
      <button
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={editor.isActive('codeBlock') ? 'is-active' : ''}
        title="Code Block"
      >
        <Code2 size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={editor.isActive('blockquote') ? 'is-active' : ''}
        title="Quote"
      >
        <Quote size={16} />
      </button>
      
          <div className="divider" />
          <div className="dropdown-container" ref={menuRef}>
           <button 
             className={`ai-trigger ${showAiMenu ? 'is-active' : ''}`}
             onClick={() => setShowAiMenu(!showAiMenu)}
             title="AI Actions"
           >
             <Sparkles size={16} />
             <ChevronDown size={12} />
           </button>
           
           {showAiMenu && (
             <div className="toolbar-dropdown">
               <div className="dropdown-header">Editorial Board</div>
               {personas.map((persona) => (
                 <button
                   key={persona.id}
                   className="dropdown-item"
                   onClick={() => handleAiAction(persona.instruction)}
                 >
                   {persona.icon && <span style={{marginRight: '0.5em'}}>{persona.icon}</span>}
                   {persona.name}
                 </button>
               ))}
               {personas.length === 0 && <div className="dropdown-item muted">Loading...</div>}
             </div>
           )}
        </div>
    </div>
  )
}
