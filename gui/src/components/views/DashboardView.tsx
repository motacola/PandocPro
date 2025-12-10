import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Settings as SettingsIcon } from 'lucide-react'
import { Button, EmptyState as EmptyStateComponent } from '../ui'
import { QuickActions } from '../QuickActions'
import type { HistoryEntry } from '../../type/pandoc-pro'

interface DashboardViewProps {
  stats: {
    total: number
    synced: number
    pending: number
    totalSize: number
  }
  history: HistoryEntry[]
  isLoadingHistory: boolean
  onScan: () => void
  onSettings: () => void
  formatSize: (bytes?: number | null) => string
  onQuickConvertAll: () => void
  onSyncRecent: () => void
  recentFilesCount: number
  isProcessing: boolean
  conversionProgress?: number
  bulkConversionActive?: boolean
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  history,
  isLoadingHistory,
  onScan,
  onSettings,
  formatSize,
  onQuickConvertAll,
  onSyncRecent,
  recentFilesCount,
  isProcessing,
  conversionProgress,
  bulkConversionActive,
}) => {
  return (
    <motion.div
      className='view-dashboard'
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <header className='view-header'>
        <h2>Dashboard</h2>
      </header>
      <div className='dashboard-content'>
        {/* Stats Row */}
        <motion.div
          className='stats-grid'
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.1 },
            },
          }}
          initial='hidden'
          animate='show'
        >
          {[
            { label: 'Total Documents', value: stats.total, color: 'text-gradient' },
            { label: 'Synced', value: stats.synced, color: 'text-success' },
            { label: 'Pending', value: stats.pending, color: 'text-warning' },
            { label: 'Total Size', value: formatSize(stats.totalSize), color: 'text-info' },
            { label: 'Performance', value: 'Optimized', color: 'text-success' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              className='stat-card glass-card-hover'
              variants={{
                hidden: { opacity: 0, y: 20 },
                show: { opacity: 1, y: 0 },
              }}
            >
              <span className='stat-label'>{stat.label}</span>
              <span className={`stat-value ${stat.color}`}>{stat.value}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Large Prominent Drop Zone */}
        <motion.div
          className='drop-zone-large'
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={onQuickConvertAll}
        >
          <RefreshCw className='icon-large' />
          <div className='drop-text-primary'>
            Drop Word files to convert
          </div>
          <div className='drop-text-secondary'>
            or click here to run <strong>Quick Convert All</strong> ({stats.pending} pending)
          </div>
          <div className='performance-indicator'>
            <span className='performance-label'>Performance Mode:</span>
            <span className='performance-value'>Optimized</span>
          </div>

          {/* Progress Indicator */}
          {bulkConversionActive && (
            <div className='conversion-progress'>
              <div className='progress-bar-container'>
                <div
                  className='progress-bar'
                  style={{ width: `${conversionProgress || 0}%` }}
                />
              </div>
              <div className='progress-text'>
                Converting... {Math.round(conversionProgress || 0)}% complete
              </div>
            </div>
          )}
        </motion.div>

        <div className='dashboard-section'>
          <h3>Recent Activity</h3>
          <div className='activity-list glass-strong'>
            {isLoadingHistory ? (
              <div className='skeleton-container'>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className='skeleton-item' style={{ height: '2.5rem' }} />
                ))}
              </div>
            ) : history.length === 0 ? (
              <EmptyStateComponent
                icon='📋'
                title='No recent activity'
                description='Your conversion history will appear here'
              />
            ) : (
              history.map((entry, i) => (
                <div key={i} className='activity-item'>
                  <div className={`activity-status ${entry.status === 'success' ? 'success' : 'error'}`}>
                    {entry.status === 'success' ? '✓' : '✕'}
                  </div>
                  <div className='activity-details'>
                    <span className='activity-path'>{entry.source}</span>
                    <span className='activity-meta'>
                      {entry.mode} • {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className='dashboard-actions'>
          <Button variant='primary' size='lg' onClick={onScan}>
            <RefreshCw className='w-5 h-5 mr-2' />
            Scan for Changes
          </Button>
          <Button variant='secondary' size='lg' onClick={onSettings}>
            <SettingsIcon className='w-5 h-5 mr-2' />
            Configure Settings
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
