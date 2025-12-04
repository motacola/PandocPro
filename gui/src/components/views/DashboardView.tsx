import React from 'react'
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
        <motion.div
          className='stats-grid'
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
          initial='hidden'
          animate='show'
        >
          {[
            { label: 'Total Documents', value: stats.total, color: '' },
            { label: 'Synced', value: stats.synced, color: 'text-success' },
            { label: 'Pending', value: stats.pending, color: 'text-warning' },
            { label: 'Total Size', value: formatSize(stats.totalSize), color: '' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              className='stat-card'
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

        <QuickActions
          onQuickConvertAll={onQuickConvertAll}
          onSyncRecent={onSyncRecent}
          pendingCount={stats.pending}
          recentCount={recentFilesCount}
          isProcessing={isProcessing}
        />

        <div className='dashboard-section'>
          <h3>Recent Activity</h3>
          <div className='activity-list'>
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
