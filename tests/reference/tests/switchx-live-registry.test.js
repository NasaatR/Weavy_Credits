const assert = require('assert');
const fs = require('fs');
require('../catalog.js');
const CORE = require('../analyzer-core.js');
const catalog = globalThis.WEAVE_CREDIT_CATALOG;

function payload(data, url = 'https://api.weavy.ai/api/v1/recipes/project-switchx') {
  return {
    data,
    url,
    pageUrl: 'https://app.weavy.ai/flow/project-switchx',
    phase: 'response',
    capturedAt: '2026-07-28T10:00:00Z'
  };
}

// User-reported case: Weavy shows 360 credits for a 5.888-second SwitchX run
// at 1080p. Billing is per started second, so each saved run is 6 * 60 = 360.
const switchx = CORE.createAnalyzer(catalog, { projectId: 'project-switchx' });
switchx.processPayload(payload({
  id: 'project-switchx',
  nodes: [{
    id: 'node-switchx',
    type: 'model',
    position: { x: 0, y: 0 },
    data: {
      kind: { model: { name: 'beeble_switchx', service: 'beeble_switchx' } },
      generations: [
        { batchId: 'switchx-a', order: 0, input: { resolution: '1080p', duration: 5.888 } },
        { batchId: 'switchx-b', order: 1, input: { resolution: '1080p', duration: 5.888 } }
      ],
      result: [
        { width: 1080, height: 1080, duration: 5.888, url: 'https://cdn.example/switchx-a.mp4' },
        { width: 1080, height: 1080, duration: 5.888, url: 'https://cdn.example/switchx-b.mp4' }
      ]
    }
  }]
}));
let summary = switchx.getSummary();
assert.strictEqual(summary.generations, 2);
assert.strictEqual(summary.rows[0].model, 'Beeble SwitchX');
assert.strictEqual(summary.totalMin, 720);
assert.strictEqual(summary.totalMax, 720);
assert.strictEqual(switchx.getReportRows()[0].costSource, 'catalog-formula');

// A future model can be absent from the bundled catalog. Its price registry can
// be keyed only by slug and can arrive after project history; existing records
// must be repriced from the saved parameters without a reload.
const future = CORE.createAnalyzer(catalog, { projectId: 'project-switchx' });
future.processPayload(payload({
  id: 'project-switchx',
  nodes: [{
    id: 'node-future',
    type: 'model',
    position: { x: 0, y: 0 },
    data: {
      kind: { model: { name: 'vendor_future_video', service: 'vendor_future_video' } },
      generations: [{
        batchId: 'future-a',
        order: 0,
        input: { resolution: '1080p', duration: 6 }
      }],
      result: [{ width: 1920, height: 1080, duration: 6, url: 'https://cdn.example/future.mp4' }]
    }
  }]
}));
summary = future.getSummary();
assert.strictEqual(summary.unknownGenerations, 1);

future.processPayload(payload({
  vendor_future_video: {
    pricing: {
      '720p': 90,
      '1080p': 180
    }
  }
}, 'https://api.weavy.ai/api/v1/models/prices'));
summary = future.getSummary();
assert.strictEqual(summary.generations, 1);
assert.strictEqual(summary.unknownGenerations, 0);
assert.strictEqual(summary.totalMin, 180);
assert.strictEqual(summary.totalMax, 180);
assert.strictEqual(future.getReportRows()[0].costSource, 'live-model-parameter-match');

// The visible Weavy "Total cost" card is a final fallback for a model that has
// no catalog/API price. It is tied to this node's saved resolution and duration.
const visible = CORE.createAnalyzer(catalog, { projectId: 'project-switchx' });
visible.processPayload(payload({
  id: 'project-switchx',
  nodes: [{
    id: 'node-visible',
    type: 'model',
    position: { x: 0, y: 0 },
    data: {
      kind: { model: { name: 'vendor_visible_model', service: 'vendor_visible_model' } },
      params: { resolution: '1080p', duration: 5.888 },
      generations: [{
        batchId: 'visible-a',
        order: 0,
        input: { resolution: '1080p', duration: 5.888 }
      }],
      result: [{ width: 1920, height: 1080, duration: 5.888, url: 'https://cdn.example/visible.mp4' }]
    }
  }]
}));
assert.strictEqual(visible.getSummary().unknownGenerations, 1);
assert.strictEqual(visible.observeDisplayedPrice({
  nodeId: 'node-visible',
  modelName: 'Vendor Visible Model',
  totalCredits: 360,
  runs: 1,
  params: { resolution: '1080p' }
}), true);
summary = visible.getSummary();
assert.strictEqual(summary.unknownGenerations, 0);
assert.strictEqual(summary.totalMin, 360);
assert.strictEqual(summary.totalMax, 360);
assert.strictEqual(visible.getReportRows()[0].costSource, 'live-model-parameter-match');

visible.processPayload(payload({
  id: 'project-switchx',
  nodes: [{
    id: 'node-visible',
    type: 'model',
    position: { x: 0, y: 0 },
    data: {
      kind: { model: { name: 'vendor_visible_model', service: 'vendor_visible_model' } },
      params: { resolution: '1080p', duration: 5.888 },
      generations: [
        { batchId: 'visible-a', order: 0, input: { resolution: '1080p', duration: 5.888 } },
        { batchId: 'visible-b', order: 1, input: { resolution: '720p', duration: 4 } }
      ],
      result: [
        { width: 1920, height: 1080, duration: 5.888, url: 'https://cdn.example/visible.mp4' },
        { width: 1280, height: 720, duration: 4, url: 'https://cdn.example/visible-b.mp4' }
      ]
    }
  }]
}));
summary = visible.getSummary();
assert.strictEqual(summary.generations, 2);
assert.strictEqual(summary.unknownGenerations, 1, 'visible current price must not leak into a historical run with other parameters');
assert.strictEqual(summary.totalMin, 360);
assert.strictEqual(summary.totalMax, 360);

const content = fs.readFileSync(require.resolve('../content.js'), 'utf8');
assert.ok(content.includes('function captureVisibleWeavyPrice'));
assert.ok(content.includes('Total cost|Общая стоимость'));
assert.ok(content.includes('analyzer.observeDisplayedPrice(observation)'));

console.log('SwitchX, live registry and visible-price fallback tests passed.');
