const test = require('node:test');
const assert = require('node:assert');
const { spawn } = require('child_process');
const http = require('http');
const zlib = require('zlib');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');

const PORT = 5020;
const JOB_ROOT = path.join(__dirname, '..', 'tmp', 'ui-jobs-test');

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestJson(method, urlPath, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: urlPath,
        method,
        headers,
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          let buffer = Buffer.concat(chunks);
          if (res.headers['content-encoding'] === 'gzip') {
            buffer = zlib.gunzipSync(buffer);
          } else if (res.headers['content-encoding'] === 'deflate') {
            buffer = zlib.inflateSync(buffer);
          }
          const text = buffer.toString('utf8');
          resolve({
            status: res.statusCode,
            headers: res.headers,
            text,
            json: () => JSON.parse(text || '{}'),
          });
        });
      }
    );
    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function waitForHealth() {
  for (let i = 0; i < 25; i++) {
    try {
      const res = await requestJson('GET', '/api/health');
      if (res.status === 200) return;
    } catch (error) {
      // retry
    }
    await delay(200);
  }
  throw new Error('UI server health check did not become ready');
}

async function cleanupJobs() {
  try {
    await fsp.rm(JOB_ROOT, { recursive: true, force: true });
  } catch (error) {
    // ignore
  }
}

test('ui-server regressions', async (t) => {
  await cleanupJobs();

  const server = spawn('node', ['ui-server/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      DSYNC_UI_PORT: String(PORT),
      DSYNC_JOB_ROOT: 'tmp/ui-jobs-test',
      DSYNC_MAX_REQUESTS_PER_MINUTE: '3',
      DSYNC_CONVERSION_CACHE_TTL_MS: String(60 * 60 * 1000),
    },
    stdio: ['ignore', 'ignore', 'inherit'],
  });

  server.on('error', (error) => {
    throw error;
  });

  t.after(async () => {
    server.kill('SIGTERM');
    await cleanupJobs();
  });

  await waitForHealth();

  await t.test('health responds without crash and supports compression path', async () => {
    const res = await requestJson('GET', '/api/health', {
      headers: { 'Accept-Encoding': 'gzip' },
    });
    assert.strictEqual(res.status, 200);
    const payload = res.json();
    assert.strictEqual(payload.status, 'ok');
    assert.ok(typeof payload.uptime === 'number');
  });

  let firstJobId;

  await t.test('conversion caches repeat payloads and downloads stay valid', async () => {
    const mdBase64 = Buffer.from('# Hello world').toString('base64');
    const body = JSON.stringify({
      fileName: 'sample.md',
      fileData: `data:text/markdown;base64,${mdBase64}`,
      formats: ['docx'],
    });

    const res1 = await requestJson('POST', '/api/convert', {
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    assert.strictEqual(res1.status, 200);
    const meta1 = res1.json();
    assert.ok(meta1.jobId);
    assert.ok(Array.isArray(meta1.outputs) && meta1.outputs.length > 0);
    assert.ok(!meta1.fromCache);
    firstJobId = meta1.jobId;

    const res2 = await requestJson('POST', '/api/convert', {
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    assert.strictEqual(res2.status, 200);
    const meta2 = res2.json();
    assert.strictEqual(meta2.fromCache, true);
    assert.strictEqual(meta2.jobId, firstJobId);
    assert.ok(meta2.outputs.length === meta1.outputs.length);

    const downloadUrl = meta2.outputs[0].url;
    const download = await requestJson('GET', downloadUrl);
    assert.strictEqual(download.status, 200);
    assert.ok(download.text.length > 0);
  });

  await t.test('rate limiting handles IPv6 / multiple calls', async () => {
    const mdBase64 = Buffer.from('# Another job').toString('base64');
    const body = JSON.stringify({
      fileName: 'limit.md',
      fileData: `data:text/markdown;base64,${mdBase64}`,
      formats: ['docx'],
    });

    const res1 = await requestJson('POST', '/api/convert', {
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    assert.strictEqual(res1.status, 200);

    const res2 = await requestJson('POST', '/api/convert', {
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    assert.strictEqual(res2.status, 429);
  });
});
