import { Notification, BrowserWindow } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

function resolveIcon() {
    const base = process.env.VITE_PUBLIC ?? path.join(process.env.APP_ROOT ?? '.', 'public')
    const candidate = path.join(base, 'favicon.ico')
    return fs.existsSync(candidate) ? candidate : undefined
}

type NotificationType = 'success' | 'error' | 'info' | 'warning'

interface NotificationPayload {
    title: string
    body: string
    type?: NotificationType
    tag?: string
    silent?: boolean
}

/**
 * Send a desktop notification
 * On macOS: Uses native Notification API
 * On Windows/Linux: Uses Electron Notification
 */
export function sendNotification(payload: NotificationPayload, win?: BrowserWindow) {
    const { title, body, type = 'info', silent = false } = payload
    const icon = resolveIcon()

    const notification = new Notification({
        title,
        body,
        silent,
        icon,
        // macOS-specific options
        subtitle: type === 'error' ? 'Error' : type === 'success' ? 'Success' : undefined,
    })

    // Add event listeners
    notification.on('click', () => {
        if (win && !win.isDestroyed()) {
            if (win.isMinimized()) win.restore()
            win.focus()
        }
    })

    notification.on('show', () => {
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            try {
                notification.close()
            } catch {
                // Already closed
            }
        }, 5000)
    })

    notification.show()
}

/**
 * Send success notification (e.g., conversion completed)
 */
export function notifySuccess(title: string, body: string, win?: BrowserWindow) {
    sendNotification({ title, body, type: 'success' }, win)
}

/**
 * Send error notification (e.g., conversion failed)
 */
export function notifyError(title: string, body: string, win?: BrowserWindow) {
    sendNotification({ title, body, type: 'error' }, win)
}

/**
 * Send info notification (e.g., watch mode started)
 */
export function notifyInfo(title: string, body: string, win?: BrowserWindow) {
    sendNotification({ title, body, type: 'info' }, win)
}

/**
 * Send warning notification
 */
export function notifyWarning(title: string, body: string, win?: BrowserWindow) {
    sendNotification({ title, body, type: 'warning' }, win)
}
