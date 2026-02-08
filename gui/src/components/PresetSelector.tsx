import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Plus, Edit2, Trash2 } from 'lucide-react'
import type { ConversionPreset } from '../type/pandoc-pro'
import './PresetSelector.css'

interface PresetSelectorProps {
  presets: ConversionPreset[]
  selectedPresetId?: string
  onSelectPreset: (preset: ConversionPreset) => void
  onCreatePreset?: () => void
  onEditPreset?: (preset: ConversionPreset) => void
  onDeletePreset?: (presetId: string) => void
}

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  presets,
  selectedPresetId,
  onSelectPreset,
  onCreatePreset,
  onEditPreset,
  onDeletePreset,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const selectedPreset = presets.find(p => p.id === selectedPresetId)

  return (
    <div className='preset-selector'>
      <button
        className='preset-selector-trigger'
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className='preset-label'>
          {selectedPreset ? selectedPreset.name : 'Select Preset'}
        </span>
        <ChevronDown className={`w-4 h-4 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className='preset-dropdown'
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {presets.map((preset) => (
              <div
                key={preset.id}
                className={`preset-item ${selectedPresetId === preset.id ? 'selected' : ''}`}
              >
                <button
                  className='preset-item-button'
                  onClick={() => {
                    onSelectPreset(preset)
                    setIsOpen(false)
                  }}
                >
                  <div className='preset-info'>
                    <span className='preset-name'>{preset.name}</span>
                    <span className='preset-desc'>{preset.description}</span>
                  </div>
                </button>
                <div className='preset-actions'>
                  {onEditPreset && (
                    <button
                      className='preset-action-btn'
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditPreset(preset)
                      }}
                      title='Edit preset'
                    >
                      <Edit2 className='w-4 h-4' />
                    </button>
                  )}
                  {onDeletePreset && !preset.id.startsWith('built-in-') && (
                    <button
                      className='preset-action-btn danger'
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeletePreset(preset.id)
                      }}
                      title='Delete preset'
                    >
                      <Trash2 className='w-4 h-4' />
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            {onCreatePreset && (
              <>
                <div className='preset-divider' />
                <button
                  className='preset-create-btn'
                  onClick={() => {
                    onCreatePreset()
                    setIsOpen(false)
                  }}
                >
                  <Plus className='w-4 h-4' />
                  Create Custom Preset
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
