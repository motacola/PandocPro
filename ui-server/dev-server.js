#!/usr/bin/env node
/**
 * Development server wrapper with hot reload support
 * Auto-restarts the server when source files change
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const chokidar = require('chokidar');

const SERVER_FILE = path.join(__dirname, 'server.js');
const LOGGER_FILE = path.join(__dirname, 'logger.js');
const PROCESS_POOL_FILE = path.join(__dirname, 'process-pool.js');
const DEBOUNCE_MS = 500;

let serverProcess = null;
let restartScheduled = false;

// Log with timestamp
function log(message, ...args) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`, ...args);
}

// Kill the running server process
function killServer() {
    return new Promise((resolve) => {
        if (!serverProcess) {
            resolve();
            return;
        }

        const timeoutId = setTimeout(() => {
            log('⚠️ Server didn\'t exit gracefully, force killing...');
            serverProcess.kill('SIGKILL');
            resolve();
        }, 2000);

        serverProcess.on('exit', () => {
            clearTimeout(timeoutId);
            resolve();
        });

        log('Stopping server...');
        serverProcess.kill('SIGTERM');
    });
}

// Start the server process
function startServer() {
    log('🚀 Starting server...');
    serverProcess = spawn('node', [SERVER_FILE], {
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'development' },
    });

    serverProcess.on('error', (error) => {
        log('❌ Server process error:', error.message);
    });

    serverProcess.on('exit', (code) => {
        if (code && code !== 0) {
            log(`⚠️ Server exited with code ${code}`);
        }
        serverProcess = null;
    });
}

// Schedule a restart (debounced)
function scheduleRestart() {
    if (restartScheduled) return;

    restartScheduled = true;
    log('⏱️ File change detected, restarting in %dms...', DEBOUNCE_MS);

    setTimeout(async () => {
        restartScheduled = false;
        await killServer();
        startServer();
    }, DEBOUNCE_MS);
}

// Setup file watcher
function setupWatcher() {
    const watcher = chokidar.watch([SERVER_FILE, LOGGER_FILE, PROCESS_POOL_FILE], {
        awaitWriteFinish: {
            stabilityThreshold: 100,
            pollInterval: 100,
        },
        ignoreInitial: true,
    });

    watcher.on('change', (filePath) => {
        const relative = path.relative(__dirname, filePath);
        log('📝 File changed: %s', relative);
        scheduleRestart();
    });

    watcher.on('error', (error) => {
        log('❌ Watcher error:', error);
    });

    return watcher;
}

// Handle process signals
process.on('SIGINT', async () => {
    log('\n👋 Dev server shutting down...');
    await killServer();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    log('\n👋 Dev server terminating...');
    await killServer();
    process.exit(0);
});

// Main execution
log('🔧 Development server started (auto-reload enabled)');
log('📁 Watching for changes in:');
log('   - server.js');
log('   - logger.js');
log('   - process-pool.js');
log('Press Ctrl+C to stop.');

startServer();
setupWatcher();
