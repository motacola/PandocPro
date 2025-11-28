const http = require('http');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const { spawn } = require('child_process');
const crypto = require('crypto');
const zlib = require('zlib');
const { logger, LOG_LEVELS } = require('./logger');
const ProcessPool = require('./process-pool');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCRIPT_PATH = path.join(PROJECT_ROOT, 'scripts', 'docx-sync.sh');
const PUBLIC_DIR = path.join(__dirname, 'public');
const JOB_ROOT = path.join(PROJECT_ROOT, 'tmp', 'ui-jobs');
const JOB_TTL_MS = Number(process.env.DSYNC_UI_JOB_TTL_MS || 24 * 60 * 60 * 1000);
const JOB_MAX_KEEP = Number(process.env.DSYNC_UI_MAX_JOBS || 200);
const PORT = Number(process.env.DSYNC_UI_PORT || 4174);
const MAX_BODY_BYTES = Number(process.env.DSYNC_UI_MAX_BYTES || 25 * 1024 * 1024);
const MAX_REQUESTS_PER_MINUTE = 60;
const MAX_CONCURRENT_JOBS = 5;
const FORMAT_SUPPORT = {
  docx: new Set(['docx', 'md', 'pdf', 'html', 'pptx']),
  markdown: new Set(['docx', 'md', 'pdf', 'html', 'pptx']),
  html: new Set(['docx', 'pdf', 'html', 'pptx']),
};

// Request throttling
const requestCounts = new Map();
let activeConversions = 0;

// Process pool for pandoc conversions
const processPool = new ProcessPool(MAX_CONCURRENT_JOBS, logger);

// Conversion result caching (memoization for identical inputs)
const conversionCache = new Map();
const CONVERSION_CACHE_TTL_MS = Number(process.env.DSYNC_CONVERSION_CACHE_TTL_MS || 60 * 60 * 1000); // 1 hour default
const CONVERSION_CACHE_MAX_SIZE = Number(process.env.DSYNC_CONVERSION_CACHE_MAX_SIZE || 100); // Max 100 cached results

// Simple caching for static files (5 minute TTL)
const fileCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

// Error categorization and structured logging
const ERROR_TYPES = {
  INPUT_VALIDATION: 'INPUT_VALIDATION',
  RATE_LIMIT: 'RATE_LIMIT',
  SERVER_BUSY: 'SERVER_BUSY',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  CONVERSION_FAILED: 'CONVERSION_FAILED',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  ACCESS_DENIED: 'ACCESS_DENIED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};

function createRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function logError(requestId, errorType, message, details = {}) {
  logger.error(message, null, { errorType, ...details }, requestId);
}

async function ensureDirectories() {
  await fsp.mkdir(JOB_ROOT, { recursive: true });
}

async function removeJobDir(dirPath) {
  try {
    await fsp.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    console.warn('Failed to remove job dir', dirPath, error);
  }
}

async function cleanupOldJobs() {
  try {
    const entries = await fsp.readdir(JOB_ROOT, { withFileTypes: true });
    const now = Date.now();
    const keepers = [];
    const expired = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const dirPath = path.join(JOB_ROOT, entry.name);
      let stat;
      try {
        stat = await fsp.stat(dirPath);
      } catch (error) {
        continue;
      }
      const age = now - stat.mtimeMs;
      const jobInfo = { dirPath, mtime: stat.mtimeMs, age };
      if (age > JOB_TTL_MS) {
        expired.push(jobInfo);
      } else {
        keepers.push(jobInfo);
      }
    }
    await Promise.all(expired.map((job) => removeJobDir(job.dirPath)));
    keepers.sort((a, b) => a.mtime - b.mtime);
    while (keepers.length > JOB_MAX_KEEP) {
      const job = keepers.shift();
      if (job) {
        // Delete oldest jobs beyond the configured cap
        // eslint-disable-next-line no-await-in-loop
        await removeJobDir(job.dirPath);
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('Job cleanup skipped', error);
    }
  }
}

function sanitizeFilename(name) {
  const base = path.basename(name).replace(/[^a-zA-Z0-9_.-]/g, '_');
  return base || `upload-${Date.now()}`;
}

function sanitizeJobId(jobId) {
  // Only allow alphanumeric, hyphen, and underscore
  return jobId.replace(/[^a-zA-Z0-9_-]/g, '') || null;
}

function isPathSafe(filePath, basePath) {
  // Ensure the resolved path is within the base directory
  const resolved = path.resolve(filePath);
  const base = path.resolve(basePath);
  return resolved.startsWith(base + path.sep) || resolved === base;
}

function detectInputType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.docx') return 'docx';
  if (ext === '.html' || ext === '.htm') return 'html';
  return 'markdown';
}

function generateId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return crypto.randomBytes(16).toString('hex');
}

function runSync(docxPath, textPath, mode, outputOverride) {
  const args = [docxPath, textPath, mode];
  if (outputOverride) {
    args.push(outputOverride);
  }
  return processPool.execute(SCRIPT_PATH, args, {
    cwd: PROJECT_ROOT,
    env: { ...process.env },
  });
}

// HTTP header optimization helpers
function getCompressionHeader(req) {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  if (acceptEncoding.includes('gzip')) return 'gzip';
  if (acceptEncoding.includes('deflate')) return 'deflate';
  return null;
}

function shouldCompress(contentType, contentLength) {
  // Don't compress if already compressed or too small (<1KB)
  if (!contentType || contentLength < 1024) return false;
  const compressibleTypes = ['application/json', 'text/', 'application/javascript'];
  return compressibleTypes.some((type) => contentType.includes(type));
}

function getETag(data) {
  return `"${crypto.createHash('md5').update(data).digest('hex')}"`;
}

function getCacheControlHeader(isStatic, hasVary) {
  // Static assets: long cache (1 week)
  if (isStatic) {
    return 'public, max-age=604800, immutable';
  }
  // Dynamic API responses: minimal cache but allow revalidation
  return hasVary ? 'private, max-age=0, must-revalidate' : 'no-cache';
}

function sendJsonCompressed(res, status, payload, requestId) {
  const body = JSON.stringify(payload);
  const encoding = getCompressionHeader(res.req || {});
  const compressed = shouldCompress('application/json', Buffer.byteLength(body));
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'ETag': getETag(body),
    'Cache-Control': getCacheControlHeader(false, true),
    'Vary': 'Accept-Encoding',
  };

  if (compressed && encoding) {
    if (encoding === 'gzip') {
      zlib.gzip(body, (err, compressed) => {
        if (err) {
          logger.warn('Compression failed, sending uncompressed', { error: err.message }, requestId);
          headers['Content-Length'] = Buffer.byteLength(body);
          res.writeHead(status, headers);
          res.end(body);
          return;
        }
        headers['Content-Encoding'] = 'gzip';
        headers['Content-Length'] = compressed.length;
        res.writeHead(status, headers);
        res.end(compressed);
      });
    } else if (encoding === 'deflate') {
      zlib.deflate(body, (err, compressed) => {
        if (err) {
          headers['Content-Length'] = Buffer.byteLength(body);
          res.writeHead(status, headers);
          res.end(body);
          return;
        }
        headers['Content-Encoding'] = 'deflate';
        headers['Content-Length'] = compressed.length;
        res.writeHead(status, headers);
        res.end(compressed);
      });
    }
  } else {
    headers['Content-Length'] = Buffer.byteLength(body);
    res.writeHead(status, headers);
    res.end(body);
  }
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sendError(res, status, requestId, errorType, userMessage, details = {}) {
  const errorPayload = {
    requestId,
    status,
    error: userMessage,
    ...details,
  };
  logError(requestId, errorType, userMessage, details);
  sendJsonCompressed(res, status, errorPayload, requestId);
}

function isRateLimited(ip) {
  const now = Date.now();
  const key = `${ip}:${Math.floor(now / 60000)}`;
  const count = (requestCounts.get(key) || 0) + 1;
  requestCounts.set(key, count);

  // Clean up old entries every minute
  if (Math.random() < 0.01) {
    const cutoff = now - 120000;
    for (const [k, _] of requestCounts.entries()) {
      if (parseInt(k.split(':')[1]) * 60000 < cutoff) {
        requestCounts.delete(k);
      }
    }
  }

  return count > MAX_REQUESTS_PER_MINUTE;
}

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket.remoteAddress ||
    'unknown';
}

async function handleConvert(req, res) {
  const requestId = createRequestId();
  const clientIp = getClientIp(req);

  // Check rate limiting
  if (isRateLimited(clientIp)) {
    sendError(
      res,
      429,
      requestId,
      ERROR_TYPES.RATE_LIMIT,
      'Too many requests. Please wait before trying again.',
      { retryAfter: '60s', clientIp }
    );
    return;
  }

  // Check concurrent job limit
  if (activeConversions >= MAX_CONCURRENT_JOBS) {
    sendError(
      res,
      503,
      requestId,
      ERROR_TYPES.SERVER_BUSY,
      'Server is busy processing other conversions. Please try again in a moment.',
      { maxConcurrent: MAX_CONCURRENT_JOBS, activeJobs: activeConversions }
    );
    return;
  }

  activeConversions++;
  try {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
        sendError(
          res,
          413,
          requestId,
          ERROR_TYPES.PAYLOAD_TOO_LARGE,
          `File too large. Maximum size is ${Math.round(MAX_BODY_BYTES / 1024 / 1024)}MB.`,
          { maxBytes: MAX_BODY_BYTES, receivedBytes: Buffer.byteLength(body) }
        );
        return;
      }
    }
    let payload;
    try {
      payload = JSON.parse(body || '{}');
    } catch (error) {
      sendError(
        res,
        400,
        requestId,
        ERROR_TYPES.INPUT_VALIDATION,
        'Invalid JSON format. Please check your request body.',
        { parseError: error.message }
      );
      return;
    }
    const { fileName, fileData, formats = [] } = payload;
    if (!fileName || !fileData) {
      sendError(
        res,
        400,
        requestId,
        ERROR_TYPES.INPUT_VALIDATION,
        'Missing required fields. Please provide both "fileName" and "fileData".',
        { provided: Object.keys(payload) }
      );
      return;
    }
    if (!Array.isArray(formats) || formats.length === 0) {
      sendError(
        res,
        400,
        requestId,
        ERROR_TYPES.INPUT_VALIDATION,
        'No output formats selected. Please choose at least one format (e.g., "md", "docx", "pdf").',
        { supportedFormats: ['docx', 'md', 'pdf', 'html', 'pptx'] }
      );
      return;
    }

    // Check conversion result cache before processing
    const cacheKey = getCacheKey(fileData, formats);
    const cachedResult = getConversionCacheEntry(cacheKey);
    if (cachedResult) {
      logger.info('Conversion cache hit', { cacheKey, formats }, requestId);
      const meta = {
        jobId: generateId(),
        requestId,
        originalName: fileName,
        createdAt: new Date().toISOString(),
        outputs: cachedResult.outputs,
        logs: cachedResult.logs,
        fromCache: true,
      };
      sendJsonCompressed(res, 200, meta, requestId);
      return;
    }

    logger.debug('Conversion cache miss', { cacheKey, formats }, requestId);

    const jobId = generateId();
    const jobDir = path.join(JOB_ROOT, jobId);
    await fsp.mkdir(jobDir, { recursive: true });

    const safeName = sanitizeFilename(fileName);
    const uploadPath = path.join(jobDir, safeName);
    const base64 = fileData.includes(',') ? fileData.split(',').pop() : fileData;
    await fsp.writeFile(uploadPath, Buffer.from(base64, 'base64'));

    const inputType = detectInputType(safeName);
    const allowedFormats = FORMAT_SUPPORT[inputType];
    const filteredFormats = formats
      .map((fmt) => String(fmt || '').toLowerCase())
      .filter((fmt) => allowedFormats.has(fmt));
    if (!filteredFormats.length) {
      sendError(
        res,
        400,
        requestId,
        ERROR_TYPES.INPUT_VALIDATION,
        `Unsupported format conversion. File type "${inputType}" supports: ${Array.from(allowedFormats).join(', ')}.`,
        { detectedFormat: inputType, allowedFormats: Array.from(allowedFormats), requestedFormats: formats }
      );
      return;
    }
    const baseName = path.basename(safeName, path.extname(safeName));
    let docxPath = uploadPath;
    let textPath = uploadPath;
    let markdownPath = path.join(jobDir, `${baseName}.md`);

    if (inputType === 'markdown') {
      docxPath = path.join(jobDir, `${baseName}.docx`);
      markdownPath = uploadPath;
    } else if (inputType === 'html') {
      docxPath = path.join(jobDir, `${baseName}.docx`);
      markdownPath = path.join(jobDir, `${baseName}.md`);
    }

    const requested = new Set(filteredFormats);
    const outputs = [];
    const logs = [];

    async function ensureMarkdownFromDocx() {
      if (inputType !== 'docx') return;
      if (await fileExists(markdownPath)) return;
      const result = await runSync(docxPath, markdownPath, 'to-md');
      logs.push({ step: 'to-md', stdout: result.stdout, stderr: result.stderr });
    }

    if (inputType === 'docx' && requested.has('docx')) {
      outputs.push(await describeFile(jobId, docxPath, 'docx'));
    }

    if (inputType === 'markdown' && requested.has('md')) {
      outputs.push(await describeFile(jobId, markdownPath, 'md'));
    }

    if (inputType === 'html' && requested.has('html')) {
      outputs.push(await describeFile(jobId, uploadPath, 'html'));
    }

    if (inputType === 'docx') {
      const needsMarkdown = requested.has('md') || requested.has('pdf') || requested.has('html');
      if (needsMarkdown) {
        await ensureMarkdownFromDocx();
        if (requested.has('md')) {
          outputs.push(await describeFile(jobId, markdownPath, 'md'));
        }
      }
    }

    if (inputType === 'markdown' && requested.has('docx')) {
      const result = await runSync(docxPath, markdownPath, 'to-docx');
      logs.push({ step: 'to-docx', stdout: result.stdout, stderr: result.stderr });
      outputs.push(await describeFile(jobId, docxPath, 'docx'));
    }

    if (inputType === 'html' && requested.has('docx')) {
      const result = await runSync(docxPath, uploadPath, 'to-docx');
      logs.push({ step: 'to-docx', stdout: result.stdout, stderr: result.stderr });
      outputs.push(await describeFile(jobId, docxPath, 'docx'));
    }

    if (requested.has('pdf')) {
      let sourcePath = markdownPath;
      if (inputType === 'docx') {
        await ensureMarkdownFromDocx();
      } else if (inputType === 'markdown') {
        sourcePath = markdownPath;
      } else if (inputType === 'html') {
        sourcePath = uploadPath;
      }
      const pdfPath = path.join(jobDir, `${baseName}.pdf`);
      const result = await runSync(docxPath, sourcePath, 'to-pdf', pdfPath);
      logs.push({ step: 'to-pdf', stdout: result.stdout, stderr: result.stderr });
      outputs.push(await describeFile(jobId, pdfPath, 'pdf'));
    }

    if (requested.has('pptx')) {
      let sourcePath = markdownPath;
      if (inputType === 'docx') {
        await ensureMarkdownFromDocx();
      } else if (inputType === 'html') {
        sourcePath = uploadPath;
      }
      const pptxPath = path.join(jobDir, `${baseName}.pptx`);
      const result = await runSync(docxPath, sourcePath, 'to-pptx', pptxPath);
      logs.push({ step: 'to-pptx', stdout: result.stdout, stderr: result.stderr });
      outputs.push(await describeFile(jobId, pptxPath, 'pptx'));
    }

    if (requested.has('html') && inputType !== 'html') {
      let sourcePath = markdownPath;
      if (inputType === 'docx') {
        await ensureMarkdownFromDocx();
      }
      const htmlOut = path.join(jobDir, `${baseName}.preview.html`);
      const result = await runSync(docxPath, sourcePath, 'to-html', htmlOut);
      logs.push({ step: 'to-html', stdout: result.stdout, stderr: result.stderr });
      outputs.push(await describeFile(jobId, htmlOut, 'html'));
    }

    if (outputs.length === 0) {
      sendError(
        res,
        400,
        requestId,
        ERROR_TYPES.CONVERSION_FAILED,
        'Conversion produced no output. This may indicate an issue with your file format.',
        { requestedFormats: Array.from(requested), fileType: inputType }
      );
      return;
    }

    const metaPath = path.join(jobDir, 'meta.json');
    const meta = {
      jobId,
      requestId,
      originalName: safeName,
      createdAt: new Date().toISOString(),
      outputs,
      logs,
    };
    await fsp.writeFile(metaPath, JSON.stringify(meta, null, 2));

    // Cache conversion results for future identical requests
    setConversionCache(cacheKey, outputs, logs);

    logger.logConversion(jobId, 'conversion', 'completed', undefined, undefined);
    logger.info('Conversion completed successfully', {
      formats: Array.from(requested),
      outputCount: outputs.length,
    }, requestId);
    sendJsonCompressed(res, 200, meta, requestId);
    cleanupOldJobs().catch((error) => {
      console.warn('Background job cleanup failed', error);
    });
  } catch (error) {
    logError(requestId, ERROR_TYPES.CONVERSION_FAILED, String(error.message), {
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      stderr: error.stderr ? String(error.stderr).trim().slice(0, 500) : undefined,
      exitCode: error.exitCode,
    });
    const userMessage = error.stderr
      ? `Conversion failed: ${String(error.stderr).trim().split('\n')[0]}`
      : 'Conversion failed. Please check your file format and try again.';
    sendError(
      res,
      500,
      requestId,
      ERROR_TYPES.CONVERSION_FAILED,
      userMessage,
      { suggestion: 'Verify file format is correct and try again. Contact support if issue persists.' }
    );
  } finally {
    activeConversions--;
  }
}

async function fileExists(filePath) {
  try {
    await fsp.access(filePath, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}

async function describeFile(jobId, filePath, format) {
  const stat = await fsp.stat(filePath);
  return {
    format,
    fileName: path.basename(filePath),
    size: stat.size,
    url: `/api/jobs/${jobId}/files/${encodeURIComponent(path.basename(filePath))}`,
  };
}

async function handleDownload(req, res, jobId, fileName) {
  const requestId = createRequestId();
  const safeJobId = sanitizeJobId(jobId);
  if (!safeJobId) {
    sendError(res, 400, requestId, ERROR_TYPES.INPUT_VALIDATION, 'Invalid job ID format.');
    return;
  }
  const safeName = sanitizeFilename(fileName);
  const filePath = path.join(JOB_ROOT, safeJobId, safeName);
  if (!isPathSafe(filePath, JOB_ROOT)) {
    sendError(res, 403, requestId, ERROR_TYPES.ACCESS_DENIED, 'Access to this resource is denied.');
    return;
  }
  if (!(await fileExists(filePath))) {
    sendError(
      res,
      404,
      requestId,
      ERROR_TYPES.FILE_NOT_FOUND,
      'File not found. The conversion job may have expired.',
      { jobId: safeJobId, fileName: safeName, suggestion: 'Try converting again.' }
    );
    return;
  }
  const stream = fs.createReadStream(filePath);
  res.writeHead(200, {
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${safeName}"`,
  });
  stream.on('error', (error) => {
    logError(requestId, ERROR_TYPES.INTERNAL_ERROR, 'Stream error during download', {
      error: error.message,
      filePath,
    });
  });
  stream.pipe(res);
}

async function handleJobMeta(res, jobId) {
  const requestId = createRequestId();
  const safeJobId = sanitizeJobId(jobId);
  if (!safeJobId) {
    sendError(res, 400, requestId, ERROR_TYPES.INPUT_VALIDATION, 'Invalid job ID format.');
    return;
  }
  const metaPath = path.join(JOB_ROOT, safeJobId, 'meta.json');
  if (!isPathSafe(metaPath, JOB_ROOT)) {
    sendError(res, 403, requestId, ERROR_TYPES.ACCESS_DENIED, 'Access to this resource is denied.');
    return;
  }
  if (!(await fileExists(metaPath))) {
    sendError(
      res,
      404,
      requestId,
      ERROR_TYPES.FILE_NOT_FOUND,
      'Conversion job not found. The job may have expired.',
      { jobId: safeJobId, suggestion: 'Create a new conversion and use the returned job ID.' }
    );
    return;
  }
  try {
    const raw = await fsp.readFile(metaPath, 'utf8');
    const meta = JSON.parse(raw);
    meta.requestId = requestId;
    sendJsonCompressed(res, 200, meta, requestId);
  } catch (error) {
    logError(requestId, ERROR_TYPES.INTERNAL_ERROR, 'Failed to read job metadata', {
      error: error.message,
      metaPath,
    });
    sendError(
      res,
      500,
      requestId,
      ERROR_TYPES.INTERNAL_ERROR,
      'Failed to retrieve job information. Please try again.'
    );
  }
}

function getCachedFile(filePath) {
  const cached = fileCache.get(filePath);
  if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
    return cached.data;
  }
  fileCache.delete(filePath);
  return null;
}

function setCachedFile(filePath, data) {
  fileCache.set(filePath, { data, time: Date.now() });
  // Prevent cache from growing too large
  if (fileCache.size > 100) {
    const oldest = Array.from(fileCache.entries())[0][0];
    fileCache.delete(oldest);
  }
}

// Conversion result caching helpers
function getCacheKey(fileData, formats) {
  // Generate cache key from file data hash + sorted formats
  const fileHash = crypto.createHash('md5').update(fileData).digest('hex');
  const formatStr = Array.from(formats).sort().join(':');
  return `${fileHash}:${formatStr}`;
}

function getConversionCacheEntry(cacheKey) {
  const entry = conversionCache.get(cacheKey);
  if (!entry) return null;

  // Check if entry has expired
  if (Date.now() - entry.time > CONVERSION_CACHE_TTL_MS) {
    conversionCache.delete(cacheKey);
    return null;
  }

  return entry;
}

function setConversionCache(cacheKey, outputs, logs) {
  // Prevent cache from growing too large (LRU-style by deletion)
  if (conversionCache.size >= CONVERSION_CACHE_MAX_SIZE) {
    // Delete oldest entry
    const firstKey = conversionCache.keys().next().value;
    conversionCache.delete(firstKey);
  }

  conversionCache.set(cacheKey, {
    outputs,
    logs,
    time: Date.now(),
  });
}

async function serveStatic(req, res, urlPath) {
  const requestId = createRequestId();
  let relative = decodeURIComponent(urlPath.split('?')[0]);
  if (relative === '/' || relative === '') {
    relative = '/index.html';
  }
  const filePath = path.join(PUBLIC_DIR, relative);
  if (!isPathSafe(filePath, PUBLIC_DIR)) {
    sendError(res, 403, requestId, ERROR_TYPES.ACCESS_DENIED, 'Access to this resource is denied.');
    return;
  }
  try {
    const stat = await fsp.stat(filePath);
    if (stat.isDirectory()) {
      return serveStatic(req, res, path.join(relative, 'index.html'));
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = getContentType(ext);

    // Cache small static files (<1MB)
    if (stat.size < 1024 * 1024) {
      const cached = getCachedFile(filePath);
      if (cached) {
        const etag = getETag(cached);
        const headers = {
          'Content-Type': type,
          'Content-Length': cached.length,
          'Cache-Control': getCacheControlHeader(true, false),
          'ETag': etag,
          'Vary': 'Accept-Encoding',
        };
        // Support ETag-based revalidation (304 Not Modified)
        if (req.headers['if-none-match'] === etag) {
          res.writeHead(304, headers);
          res.end();
          return;
        }
        res.writeHead(200, headers);
        res.end(cached);
        return;
      }
    }

    if (stat.size < 1024 * 1024) {
      // Read and cache small files
      const data = await fsp.readFile(filePath);
      setCachedFile(filePath, data);
      const etag = getETag(data);
      const headers = {
        'Content-Type': type,
        'Content-Length': data.length,
        'Cache-Control': getCacheControlHeader(true, false),
        'ETag': etag,
        'Vary': 'Accept-Encoding',
      };
      // Support ETag-based revalidation
      if (req.headers['if-none-match'] === etag) {
        res.writeHead(304, headers);
        res.end();
        return;
      }
      res.writeHead(200, headers);
      res.end(data);
    } else {
      // Stream large files with cache headers
      const etag = `"${stat.mtimeMs}-${stat.size}"`;
      const headers = {
        'Content-Type': type,
        'Cache-Control': getCacheControlHeader(true, false),
        'ETag': etag,
        'Vary': 'Accept-Encoding',
        'Last-Modified': new Date(stat.mtimeMs).toUTCString(),
      };
      // Support Last-Modified based revalidation
      if (req.headers['if-modified-since'] === headers['Last-Modified']) {
        res.writeHead(304, headers);
        res.end();
        return;
      }
      res.writeHead(200, headers);
      fs.createReadStream(filePath).on('error', (error) => {
        logError(requestId, ERROR_TYPES.INTERNAL_ERROR, 'Stream error serving static file', {
          error: error.message,
          filePath,
        });
      }).pipe(res);
    }
  } catch (error) {
    if (relative !== '/index.html') {
      serveStatic(req, res, '/index.html');
      return;
    }
    logError(requestId, ERROR_TYPES.FILE_NOT_FOUND, 'Static file not found', {
      requestedPath: relative,
      error: error.message,
    });
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}

function getContentType(ext) {
  switch (ext) {
    case '.css':
      return 'text/css';
    case '.js':
      return 'application/javascript';
    case '.json':
      return 'application/json';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.ico':
      return 'image/x-icon';
    default:
      return 'text/html; charset=utf-8';
  }
}

function parsePath(url) {
  try {
    const parsed = new URL(url, 'http://localhost');
    return parsed.pathname;
  } catch (error) {
    return '/';
  }
}

async function requestListener(req, res) {
  const pathname = parsePath(req.url || '/');
  logger.debug(`${req.method} ${pathname}`, { url: req.url, ip: getClientIp(req) });

  if (req.method === 'POST' && pathname === '/api/convert') {
    await handleConvert(req, res);
    return;
  }
  if (req.method === 'GET' && pathname === '/api/metrics') {
    const metrics = processPool.getMetrics();
    sendJsonCompressed(res, 200, {
      success: true,
      metrics: {
        processPool: metrics,
        activeConversions,
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }
  if (req.method === 'GET' && pathname.startsWith('/api/jobs/')) {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 4 && segments[2] === 'files') {
      await handleDownload(req, res, segments[1], segments[3]);
      return;
    }
    if (segments.length === 2) {
      await handleJobMeta(res, segments[1]);
      return;
    }
  }
  serveStatic(req, res, pathname);
}

ensureDirectories().then(async () => {
  await cleanupOldJobs();
  const server = http.createServer(requestListener);
  server.listen(PORT, () => {
    logger.info(`Drag-and-drop UI running at http://localhost:${PORT}`, { port: PORT });
    console.log(`📎 Drag-and-drop UI running at http://localhost:${PORT}`);
  });
}).catch((error) => {
  logger.error('Failed to start UI server', error);
  console.error('Failed to start UI server', error);
  process.exit(1);
});
