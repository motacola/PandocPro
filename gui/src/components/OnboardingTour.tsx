import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Check } from 'lucide-react'

interface OnboardingTourProps {
  onComplete: () => void
  onConfigureDocs: () => void
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ onComplete, onConfigureDocs }) => {
  const [step, setStep] = useState(0)

  const steps = [
    {
      title: "Welcome to PandocPro",
      content: (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚀</div>
          <p>The ultimate power-tool for Markdown and Word conversion.</p>
          <p className="muted">Let's get you set up in less than a minute.</p>
        </div>
      ),
      action: "Get Started"
    },
    {
      title: "Set Your Workspace",
      content: (
        <div>
          <p>PandocPro needs a dedicated folder to watch for your <code>.docx</code> and <code>.md</code> files.</p>
          <button className="secondary full-width" onClick={onConfigureDocs} style={{ margin: '1rem 0' }}>
             Choose Documents Folder
          </button>
          <p className="muted small">We'll automatically sync file pairs in this folder.</p>
        </div>
      ),
      action: "Next"
    },
    {
      title: "Meet Your Time Machine",
      content: (
        <div style={{ textAlign: 'center' }}>
           <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🕰️</div>
           <p>Don't worry about mistakes. We backup your files automatically before every conversion.</p>
           <p>Use the <strong>Iterations</strong> panel to restore any previous version.</p>
        </div>
      ),
      action: "Awesome"
    },
    {
      title: "You're Ready!",
      content: (
         <div style={{ textAlign: 'center' }}>
           <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✨</div>
           <p>Drag and drop files, edit with AI, and enjoy seamless syncing.</p>
         </div>
      ),
      action: "Start Creating"
    }
  ]
  
  const currentStep = steps[step]

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1)
    } else {
      onComplete()
    }
  }

  return (
    <AnimatePresence>
      <div className="modal-backdrop" style={{ zIndex: 9999 }}>
        <motion.div 
          className="modal-card" 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          style={{ maxWidth: '400px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
             <h3>{currentStep.title}</h3>
             <div className="step-dots" style={{ display: 'flex', gap: '4px' }}>
                {steps.map((_, i) => (
                    <div key={i} style={{ 
                        width: '8px', height: '8px', borderRadius: '50%', 
                        background: i === step ? 'var(--accent-primary)' : 'var(--border-color)' 
                    }} />
                ))}
             </div>
          </div>
          
          <div className="tour-content" style={{ minHeight: '150px' }}>
             {currentStep.content}
          </div>

          <button className="primary full-width" onClick={handleNext} style={{ marginTop: '1.5rem' }}>
            {currentStep.action} {step < steps.length - 1 ? <ChevronRight size={16} /> : <Check size={16} />}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
