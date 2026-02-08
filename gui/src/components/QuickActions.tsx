import React from 'react'
import { motion } from 'framer-motion'
import { Zap, Clock } from 'lucide-react'
import { Button } from './ui'

interface QuickActionsProps {
  onQuickConvertAll: () => void
  onSyncRecent: () => void
  pendingCount: number
  recentCount: number
  isProcessing: boolean
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onQuickConvertAll,
  onSyncRecent,
  pendingCount,
  recentCount,
  isProcessing,
}) => {
  return (
    <div className='quick-actions'>
      <h3>Quick Actions</h3>
      <div className='quick-actions-grid'>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            variant='primary'
            size='lg'
            onClick={onQuickConvertAll}
            disabled={isProcessing || pendingCount === 0}
            className='quick-action-btn'
          >
            <Zap className='w-5 h-5' />
            <div className='quick-action-content'>
              <span className='quick-action-label'>Quick Convert All</span>
              <span className='quick-action-desc'>
                {pendingCount} {pendingCount === 1 ? 'document' : 'documents'} pending
              </span>
            </div>
          </Button>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            variant='secondary'
            size='lg'
            onClick={onSyncRecent}
            disabled={isProcessing || recentCount === 0}
            className='quick-action-btn'
          >
            <Clock className='w-5 h-5' />
            <div className='quick-action-content'>
              <span className='quick-action-label'>Sync Recent Files</span>
              <span className='quick-action-desc'>
                {recentCount} {recentCount === 1 ? 'file' : 'files'} modified today
              </span>
            </div>
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
