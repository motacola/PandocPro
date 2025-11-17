const http = require('http');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const { spawn } = require('child_process');
const crypto = require('crypto');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCRIPT_PATH = path.join(PROJECT_ROOT, 'scripts', 'docx-sync.sh');
const PUBLIC_DIR = path.join(__dirname, 'public');
const JOB_ROOT = path.join(PROJECT_ROOT, 'tmp', 'ui-jobs');
const JOB_TTL_MS = Number(process.env.DSYNC_UI_JOB_TTL_MS || 24 * 60 * 60 * 1000);
const JOB_MAX_KEEP = Number(process.env.DSYNC_UI_MAX_JOBS || 200);
const PORT = Number(process.env.DSYNC_UI_PORT || 4174);
const MAX_BODY_BYTES = Number(process.env.DSYNC_UI_MAX_BYTES || 25 * 1024 * 1024);
const FORMAT_SUPPORT = {
  docx: new Set(['docx', 'md', 'pdf', 'html']),
  markdown: new Set(['docx', 'md', 'pdf', 'html']),
  html: new Set(['docx', 'pdf', 'html']),
};

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
  return new Promise((resolve, reject) => {
    const args = [docxPath, textPath, mode];
    if (outputOverride) {
      args.push(outputOverride);
    }
    const child = spawn(SCRIPT_PATH, args, {
      cwd: PROJECT_ROOT,
      env: { ...process.env },
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
      reject(error);
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const error = new Error(`docx-sync failed (${mode})`);
        error.stdout = stdout;
        error.stderr = stderr;
        error.exitCode = code;
        reject(error);
      }
    });
  });
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

async function handleConvert(req, res) {
  try {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
        sendJson(res, 413, { error: 'Upload too large' });
        return;
      }
    }
    let payload;
    try {
      payload = JSON.parse(body || '{}');
    } catch (error) {
      sendJson(res, 400, { error: 'Invalid JSON payload' });
      return;
    }
    const { fileName, fileData, formats = [] } = payload;
    if (!fileName || !fileData) {
      sendJson(res, 400, { error: 'fileName and fileData are required' });
      return;
    }
    if (!Array.isArray(formats) || formats.length === 0) {
      sendJson(res, 400, { error: 'Select at least one output format' });
      return;
    }

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
      sendJson(res, 400, {
        error: `This file type supports: ${Array.from(allowedFormats).join(', ')}`,
      });
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
      sendJson(res, 400, { error: 'No compatible formats produced for this input' });
      return;
    }

    const metaPath = path.join(jobDir, 'meta.json');
    const meta = {
      jobId,
      originalName: safeName,
      createdAt: new Date().toISOString(),
      outputs,
      logs,
    };
    await fsp.writeFile(metaPath, JSON.stringify(meta, null, 2));
    sendJson(res, 200, meta);
    cleanupOldJobs().catch((error) => {
      console.warn('Background job cleanup failed', error);
    });
  } catch (error) {
    console.error('Convert error', error);
    sendJson(res, 500, { error: error.message || 'Conversion failed' });
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
  const safeName = sanitizeFilename(fileName);
  const filePath = path.join(JOB_ROOT, jobId, safeName);
  if (!(await fileExists(filePath))) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }
  const stream = fs.createReadStream(filePath);
  res.writeHead(200, {
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${safeName}"`,
  });
  stream.pipe(res);
}

async function handleJobMeta(res, jobId) {
  const metaPath = path.join(JOB_ROOT, jobId, 'meta.json');
  if (!(await fileExists(metaPath))) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Job not found' }));
    return;
  }
  const raw = await fsp.readFile(metaPath, 'utf8');
  sendJson(res, 200, JSON.parse(raw));
}

async function serveStatic(req, res, urlPath) {
  let relative = decodeURIComponent(urlPath.split('?')[0]);
  if (relative === '/' || relative === '') {
    relative = '/index.html';
  }
  const filePath = path.join(PUBLIC_DIR, relative);
  try {
    const stat = await fsp.stat(filePath);
    if (stat.isDirectory()) {
      return serveStatic(req, res, path.join(relative, 'index.html'));
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = getContentType(ext);
    res.writeHead(200, { 'Content-Type': type });
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    if (relative !== '/index.html') {
      serveStatic(req, res, '/index.html');
      return;
    }
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
  if (req.method === 'POST' && pathname === '/api/convert') {
    await handleConvert(req, res);
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
    console.log(`📎 Drag-and-drop UI running at http://localhost:${PORT}`);
  });
}).catch((error) => {
  console.error('Failed to start UI server', error);
  process.exit(1);
});
