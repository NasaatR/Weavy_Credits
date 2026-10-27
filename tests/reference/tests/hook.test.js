const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
require('../catalog.js');
const CORE = require('../analyzer-core.js');

class MiniWindow {
  constructor() {
    this.listeners = new Map();
    this.location = {
      href: 'https://app.weavy.ai/flow/project-1',
      origin: 'https://app.weavy.ai',
      pathname: '/flow/project-1'
    };
    this.localStorage = createStorage();
    this.sessionStorage = createStorage();
    this.indexedDB = null;
    this.XMLHttpRequest = undefined;
    this.WebSocket = undefined;
    this.Request = Request;
    this.Headers = Headers;
  }
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }
  postMessage(data) {
    const event = { source: this, data };
    for (const listener of this.listeners.get('message') || []) listener(event);
  }
}

function createStorage() {
  const map = new Map();
  return {
    get length() { return map.size; },
    key(index) { return [...map.keys()][index] ?? null; },
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { map.set(String(key), String(value)); },
    removeItem(key) { map.delete(String(key)); }
  };
}

const project = {
  id: 'project-1',
  nodes: [{
    id: 'node-1',
    type: 'model',
    position: { x: 0, y: 0 },
    data: {
      model: { name: 'GPT Image 1 Edit', service: 'gpt_image_1_edit' },
      generations: [
        { batchId: 'batch-old-0001', order: 0 },
        { batchId: 'batch-old-0002', order: 1 }
      ]
    }
  }]
};

const fetchCalls = [];
async function mockFetch(input, init = {}) {
  const url = typeof input === 'string' ? input : input.url;
  fetchCalls.push({ url, method: String(init.method || input.method || 'GET').toUpperCase() });
  const path = new URL(url).pathname;
  let body = { error: 'not found' };
  let status = 404;
  if (path === '/api/v1/recipes/project-1' || path === '/api/v1/recipes/project-1/load') {
    body = project; status = 200;
  } else if (path === '/api/v1/node-definitions/public') {
    body = [{ id: 'def-gpt', name: 'GPT Image 1 Edit', service: 'gpt_image_1_edit', creditPrice: 8 }]; status = 200;
  } else if (/\/api\/v1\/batches\/recipes\/project-1\/batches\/batch-old-000[12]\/status$/.test(path)) {
    const batchId = path.split('/').at(-2);
    body = { recipeRuns: [{ nodeRuns: [{ nodeId: 'node-1', runId: `run-${batchId}`, status: 'COMPLETED' }] }] };
    status = 200;
  } else if (/\/api\/v1\/(?:recipes\/project-1|batches\/recipes\/project-1)/.test(path)) {
    body = { id: 'project-1', batchIds: ['batch-old-0001', 'batch-old-0002'] };
    status = 200;
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

(async () => {
  const win = new MiniWindow();
  win.fetch = mockFetch;
  const envelopes = [];
  const analyzer = CORE.createAnalyzer(globalThis.WEAVE_CREDIT_CATALOG, { projectId: 'project-1' });
  win.addEventListener('message', (event) => {
    envelopes.push(event.data);
    if (event.data?.type === 'payload' && event.data.payload) analyzer.processPayload(event.data.payload);
  });

  const context = vm.createContext({
    window: win,
    location: win.location,
    URL,
    URLSearchParams,
    Request,
    Response,
    Headers,
    FormData,
    Blob,
    ArrayBuffer,
    WeakSet,
    Map,
    Set,
    Date,
    JSON,
    Math,
    Object,
    Array,
    String,
    Number,
    Boolean,
    RegExp,
    Promise,
    console,
    setTimeout,
    clearTimeout,
    indexedDB: undefined
  });

  vm.runInContext(fs.readFileSync(require.resolve('../hook-main.js'), 'utf8'), context, { filename: 'hook-main.js' });

  // Simulate the normal project-load request that is intercepted at document_start.
  await win.fetch('https://api.weavy.ai/api/v1/recipes/project-1').then((response) => response.json());
  await new Promise((resolve) => setTimeout(resolve, 30));

  const completed = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('active scan did not complete')), 5000);
    win.addEventListener('message', (event) => {
      if (event.data?.channel !== 'weavy-project-credit-analyzer-v9') return;
      if (event.data.type === 'scan-error') {
        clearTimeout(timeout); reject(new Error(event.data.payload?.message || 'scan error'));
      }
      if (event.data.type === 'scan-complete') {
        clearTimeout(timeout); resolve(event.data.payload);
      }
    });
  });

  win.postMessage({
    channel: 'weavy-project-credit-analyzer-v9',
    type: 'command',
    command: 'active-scan',
    projectId: 'project-1',
    scanId: 'scan-test'
  });

  const result = await completed;
  assert.strictEqual(result.projectId, 'project-1');
  assert.strictEqual(result.knownBatchIds, 2, 'batch IDs must be recovered from saved node history');
  assert.strictEqual(result.requestedBatches, 2, 'both historical batches must be requested');
  assert.strictEqual(result.batchOk, 2, 'both historical batch status requests must succeed');
  assert.ok(fetchCalls.some((call) => call.url.endsWith('/batches/batch-old-0001/status')));
  assert.ok(fetchCalls.some((call) => call.url.endsWith('/batches/batch-old-0002/status')));
  assert.ok(envelopes.some((message) => message?.type === 'payload' && message.payload?.source === 'batch-history'));
  await new Promise((resolve) => setTimeout(resolve, 30));
  const summary = analyzer.getSummary();
  assert.strictEqual(summary.generations, 2, 'bridge payloads must produce two historical generation records');
  assert.strictEqual(summary.models, 1);
  assert.strictEqual(summary.rows[0].model, 'GPT Image 1 Edit');
  assert.strictEqual(summary.totalMin, 16);
  assert.strictEqual(summary.totalMax, 16);

  console.log('Hook + analyzer end-to-end integration test passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
