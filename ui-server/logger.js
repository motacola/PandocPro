/**
 * Structured logging utility for the application
 * Provides JSON-formatted logs with timestamps, levels, and context
 */

const LOG_LEVELS = {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
};

class Logger {
    constructor() {
        this.minLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO);
        this.isDev = process.env.NODE_ENV === 'development';
    }

    shouldLog(level) {
        const levels = [LOG_LEVELS.DEBUG, LOG_LEVELS.INFO, LOG_LEVELS.WARN, LOG_LEVELS.ERROR];
        const minIndex = levels.indexOf(this.minLevel);
        const currentIndex = levels.indexOf(level);
        return currentIndex >= minIndex;
    }

    formatEntry(entry) {
        if (this.isDev) {
            // Development: colorized console output
            const levelColors = {
                [LOG_LEVELS.DEBUG]: '\x1b[36m', // Cyan
                [LOG_LEVELS.INFO]: '\x1b[32m', // Green
                [LOG_LEVELS.WARN]: '\x1b[33m', // Yellow
                [LOG_LEVELS.ERROR]: '\x1b[31m', // Red
            };
            const reset = '\x1b[0m';
            const color = levelColors[entry.level];
            const requestIdStr = entry.requestId ? ` (${entry.requestId})` : '';
            const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
            return `${color}[${entry.level}]${reset} ${entry.timestamp} - ${entry.message}${requestIdStr}${contextStr}`;
        }
        // Production: structured JSON
        return JSON.stringify(entry);
    }

    createEntry(level, message, context, requestId, error) {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
        };
        if (requestId) entry.requestId = requestId;
        if (context) entry.context = context;
        if (error && error.stack) entry.stack = error.stack;
        return entry;
    }

    debug(message, context, requestId) {
        if (this.shouldLog(LOG_LEVELS.DEBUG)) {
            const entry = this.createEntry(LOG_LEVELS.DEBUG, message, context, requestId);
            console.log(this.formatEntry(entry));
        }
    }

    info(message, context, requestId) {
        if (this.shouldLog(LOG_LEVELS.INFO)) {
            const entry = this.createEntry(LOG_LEVELS.INFO, message, context, requestId);
            console.log(this.formatEntry(entry));
        }
    }

    warn(message, context, requestId) {
        if (this.shouldLog(LOG_LEVELS.WARN)) {
            const entry = this.createEntry(LOG_LEVELS.WARN, message, context, requestId);
            console.warn(this.formatEntry(entry));
        }
    }

    error(message, error, context, requestId) {
        if (this.shouldLog(LOG_LEVELS.ERROR)) {
            const err = typeof error === 'string' ? new Error(error) : error;
            const entry = this.createEntry(LOG_LEVELS.ERROR, message, context, requestId, err);
            console.error(this.formatEntry(entry));
        }
    }

    logRequest(method, path, status, duration, requestId) {
        this.info(`HTTP ${method} ${path}`, {
            status,
            duration_ms: duration,
        }, requestId);
    }

    logConversion(jobId, mode, status, duration, error) {
        const context = { mode, status };
        if (duration) context.duration_ms = duration;
        if (error) context.error = error;

        if (status === 'failed') {
            this.warn(`Conversion ${status}`, context, jobId);
        } else {
            this.info(`Conversion ${status}`, context, jobId);
        }
    }
}

module.exports = {
    logger: new Logger(),
    LOG_LEVELS,
};
