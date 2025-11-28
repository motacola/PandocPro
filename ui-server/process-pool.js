/**
 * Process pool for managing pandoc conversions
 * Limits concurrent processes to prevent resource exhaustion
 */

const { spawn } = require('child_process');

class ProcessPool {
    constructor(maxConcurrent = 5, logger = null) {
        this.maxConcurrent = maxConcurrent;
        this.activeProcesses = 0;
        this.queue = [];
        this.logger = logger;
        this.metrics = {
            totalProcessed: 0,
            totalFailed: 0,
            averageTime: 0,
            peakConcurrent: 0,
        };
    }

    _log(level, message, context) {
        if (!this.logger) return;
        if (level === 'debug' && this.logger.debug) {
            this.logger.debug(message, context);
        } else if (level === 'info' && this.logger.info) {
            this.logger.info(message, context);
        }
    }

    /**
     * Execute a process with automatic pooling
     * @param {string} script - Script path
     * @param {string[]} args - Script arguments
     * @param {object} options - spawn options
     * @returns {Promise<{stdout: string, stderr: string}>}
     */
    execute(script, args, options = {}) {
        return new Promise((resolve, reject) => {
            const task = { script, args, options, resolve, reject, startTime: Date.now() };

            if (this.activeProcesses < this.maxConcurrent) {
                this.runTask(task);
            } else {
                this._log('debug', 'Task queued (pool at capacity)', {
                    queued: this.queue.length + 1,
                    active: this.activeProcesses,
                    maxConcurrent: this.maxConcurrent,
                });
                this.queue.push(task);
            }
        });
    }

    runTask(task) {
        this.activeProcesses++;
        if (this.activeProcesses > this.metrics.peakConcurrent) {
            this.metrics.peakConcurrent = this.activeProcesses;
        }

        this._log('debug', 'Process started', {
            active: this.activeProcesses,
            queued: this.queue.length,
            script: task.script,
        });

        const child = spawn(task.script, task.args, {
            cwd: task.options.cwd || process.cwd(),
            env: { ...process.env, ...task.options.env },
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (chunk) => {
            stdout += chunk.toString();
        });

        child.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
        });

        child.on('error', (error) => {
            this.metrics.totalFailed++;
            this.recordTiming(task);
            this._log('debug', 'Process error', { error: error.message });
            task.reject(error);
            this.processNext();
        });

        child.on('close', (code) => {
            const duration = Date.now() - task.startTime;

            if (code === 0) {
                this.metrics.totalProcessed++;
                this.recordTiming(task);
                this._log('debug', 'Process completed', {
                    duration,
                    active: this.activeProcesses - 1,
                    totalProcessed: this.metrics.totalProcessed,
                });
                task.resolve({ stdout, stderr, duration });
            } else {
                this.metrics.totalFailed++;
                this.recordTiming(task);
                this._log('debug', 'Process failed', { exitCode: code, duration });
                const error = new Error(`Process exited with code ${code}`);
                error.stdout = stdout;
                error.stderr = stderr;
                error.exitCode = code;
                task.reject(error);
            }

            this.processNext();
        });
    }

    recordTiming(task) {
        const duration = Date.now() - task.startTime;
        const total = this.metrics.totalProcessed + this.metrics.totalFailed;
        this.metrics.averageTime = (this.metrics.averageTime * (total - 1) + duration) / total;
    }

    processNext() {
        this.activeProcesses--;

        if (this.queue.length > 0) {
            const nextTask = this.queue.shift();
            this._log('debug', 'Processing queued task', {
                remaining: this.queue.length,
                active: this.activeProcesses + 1,
            });
            this.runTask(nextTask);
        }
    }

    /**
     * Get current pool metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            activeProcesses: this.activeProcesses,
            queuedTasks: this.queue.length,
            utilizationPercent: Math.round((this.activeProcesses / this.maxConcurrent) * 100),
        };
    }

    /**
     * Reset metrics
     */
    resetMetrics() {
        this.metrics = {
            totalProcessed: 0,
            totalFailed: 0,
            averageTime: 0,
            peakConcurrent: 0,
        };
    }
}

module.exports = { ProcessPool };
