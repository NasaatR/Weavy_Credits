const assert = require('assert');
const fs = require('fs');
require('../catalog.js');
const CORE = require('../analyzer-core.js');
const catalog = globalThis.WEAVE_CREDIT_CATALOG;

function payload(data, url, phase = 'response') {
  return {
    data,
    url,
    pageUrl: 'https://app.weavy.ai/flow/project-accuracy',
    phase,
    capturedAt: '2026-07-28T10:00:00Z'
  };
}

// A live model definition exposes exact credit rules by output resolution.
const live = CORE.createAnalyzer(catalog, { projectId: 'project-accuracy' });
live.processPayload(payload([{
  id: 'definition-live-image',
  name: 'Live Resolution Model',
  service: 'vendor/live-resolution-model',
  pricing: [
    { resolution: '1K', credits: 4 },
    { resolution: '2K', credits: 8 },
    { resolution: '4K', credits: 18 }
  ]
}], 'https://api.weavy.ai/api/v1/node-definitions/public'));
live.processPayload(payload({
  id: 'project-accuracy',
  nodes: [{
    id: 'node-live-image',
    type: 'model',
    position: { x: 0, y: 0 },
    data: {
      model: { name: 'Live Resolution Model', service: 'vendor/live-resolution-model' },
      generations: [{ batchId: 'batch-live-image', order: 0 }],
      result: [{ width: 2048, height: 1152, url: 'https://cdn.example/live.png' }]
    }
  }]
}, 'https://api.weavy.ai/api/v1/recipes/project-accuracy'));
let summary = live.getSummary();
assert.strictEqual(summary.totalMin, 8, '2048px output must match the live 2K pricing rule');
assert.strictEqual(summary.totalMax, 8);
assert.strictEqual(summary.parameterMatchedGroups, 1);
assert.strictEqual(live.getReportRows()[0].costSource, 'live-model-parameter-match');
assert.ok(live.getReportRows()[0].parameters.includes('2048x1152'));

// When API metadata omits dimensions, a rendered image on the page can enrich the record.
const domDimensions = CORE.createAnalyzer(catalog, { projectId: 'project-accuracy' });
domDimensions.processPayload(payload([{
  id: 'definition-dom-image',
  name: 'DOM Resolution Model',
  service: 'vendor/dom-resolution-model',
  pricing: [{ resolution: '1K', credits: 4 }, { resolution: '2K', credits: 8 }, { resolution: '4K', credits: 18 }]
}], 'https://api.weavy.ai/api/v1/node-definitions/public'));
domDimensions.processPayload(payload({
  id: 'project-accuracy',
  nodes: [{
    id: 'node-dom-image', type: 'model', position: { x: 0, y: 0 },
    data: {
      model: { name: 'DOM Resolution Model', service: 'vendor/dom-resolution-model' },
      generations: [{ batchId: 'batch-dom-image', order: 0 }],
      result: [{ url: 'https://cdn.example/dom.png?temporary=1' }]
    }
  }]
}, 'https://api.weavy.ai/api/v1/recipes/project-accuracy'));
assert.deepStrictEqual([domDimensions.getSummary().totalMin, domDimensions.getSummary().totalMax], [4, 18]);
assert.strictEqual(domDimensions.enrichOutputDimensions('https://cdn.example/dom.png?another=2', 2048, 1152, 'rendered-image'), 1);
assert.deepStrictEqual([domDimensions.getSummary().totalMin, domDimensions.getSummary().totalMax], [8, 8]);
assert.strictEqual(domDimensions.getSummary().parameterMatchedGroups, 1);

// Live pricing metadata must survive saved-state restore; otherwise an exact result would degrade after reload.
const restoredLive = CORE.createAnalyzer(catalog, { projectId: 'project-accuracy' });
restoredLive.importState(live.exportState());
assert.strictEqual(restoredLive.getSummary().totalMin, 8);
assert.strictEqual(restoredLive.getSummary().totalMax, 8);
assert.strictEqual(restoredLive.getSummary().parameterMatchedGroups, 1);

// Output dimensions should also resolve a local dynamic resolution rule.
const video = CORE.createAnalyzer(catalog, { projectId: 'project-accuracy' });
video.processPayload(payload({
  id: 'project-accuracy',
  nodes: [{
    id: 'node-wan-move',
    type: 'model',
    position: { x: 0, y: 0 },
    data: {
      model: { name: 'Wan 2.2 Animate - Move' },
      generations: [{ batchId: 'batch-wan-move', order: 0 }],
      result: [{ width: 1280, height: 720, url: 'https://cdn.example/move.mp4' }]
    }
  }]
}, 'https://api.weavy.ai/api/v1/recipes/project-accuracy'));
summary = video.getSummary();
assert.strictEqual(summary.totalMin, 100, '1280x720 output must match the 720p catalog rule');
assert.strictEqual(summary.totalMax, 100);
assert.strictEqual(summary.parameterMatchedGroups, 1);

// Critical project arrays are prioritised even when a very large unrelated branch appears first.
const junk = Array.from({ length: 120_000 }, (_, index) => ({ index, payload: { decorative: true } }));
const large = CORE.createAnalyzer(catalog, { projectId: 'project-accuracy' });
large.processPayload(payload({
  junk,
  id: 'project-accuracy',
  nodes: [{
    id: 'node-after-junk',
    type: 'model',
    position: { x: 0, y: 0 },
    data: {
      model: { name: 'GPT Image 1 Edit' },
      generations: [{ batchId: 'batch-after-junk', order: 0 }]
    }
  }]
}, 'https://api.weavy.ai/api/v1/recipes/project-accuracy'));
assert.strictEqual(large.getSummary().generations, 1, 'large unrelated branches must not hide project nodes');
assert.strictEqual(large.getSummary().totalMin, 8);

const hookSource = fs.readFileSync(require.resolve('../hook-main.js'), 'utf8');
assert.ok(hookSource.includes('MAX_PRIORITY_ARRAY_ITEMS = 50_000'), 'large node/history arrays must not be cut at the old 5,000 item limit');
assert.ok(hookSource.includes('MAX_BATCH_REQUESTS = 5_000'), 'large projects must support more than the old 1,000 batches');
assert.ok(hookSource.includes('fetchWithRetry'), 'historical batch requests need retry/backoff support');

console.log('Accuracy and large-project tests passed.');
