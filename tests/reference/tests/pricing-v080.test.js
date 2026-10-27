const assert = require('assert');
const fs = require('fs');
require('../catalog.js');
const CORE = require('../analyzer-core.js');
const catalog = globalThis.WEAVE_CREDIT_CATALOG;

function payload(data, url, phase = 'response') {
  return {
    data,
    url,
    pageUrl: 'https://app.weavy.ai/flow/project-080',
    phase,
    capturedAt: '2026-07-28T10:00:00Z'
  };
}

// Ambiguous live pricing must not force a range when the generated output
// resolution identifies one exact Gemini 3 Pro catalog tier. A larger input
// reference image must not be mistaken for the output resolution.
const pro = CORE.createAnalyzer(catalog, { projectId: 'project-080' });
pro.processPayload(payload([{
  id: 'def-pro',
  name: 'Gemini 3 Pro',
  service: 'fal-ai/nano-banana-pro/edit',
  pricing: [
    { mode: 'pro', credits: 11 },
    { mode: 'pro', credits: 17 },
    { mode: 'pro', credits: 23 }
  ]
}], 'https://api.weavy.ai/api/v1/node-definitions/public'));
pro.processPayload(payload({
  id: 'project-080',
  nodes: [{
    id: 'node-pro', type: 'fal_imported', position: { x: 0, y: 0 },
    data: {
      kind: { model: { name: 'fal_imported', version: 'fal-ai/nano-banana-pro/edit' } },
      generations: [{
        batchId: 'batch-pro', order: 0,
        input: { image_1: { width: 6336, height: 2688 }, resolution: '2K', mode: 'pro' }
      }],
      result: [{ width: 3168, height: 1344, url: 'https://cdn.example/pro.png' }]
    }
  }]
}, 'https://api.weavy.ai/api/v1/recipes/project-080'));
let summary = pro.getSummary();
assert.strictEqual(summary.totalMin, 11, 'Gemini 3 Pro 2K must resolve to the corrected 11-credit price');
assert.strictEqual(summary.totalMax, 11);
assert.strictEqual(pro.getReportRows()[0].costSource, 'catalog-parameter-match');
assert.ok(pro.getReportRows()[0].parameters.includes('профиль 2K'));
assert.ok(!pro.getReportRows()[0].parameters.includes('профиль 2K/4K'));

// GPT Image 1 Edit has a fixed Weavy catalog price. Ambiguous live metadata
// must not expand it to a meaningless 2-23 credit range.
const gpt = CORE.createAnalyzer(catalog, { projectId: 'project-080' });
gpt.processPayload(payload([{
  id: 'def-gpt',
  name: 'GPT Image 1 Edit',
  service: 'gpt_image_1_edit',
  pricing: [{ quality: 'standard', credits: 2 }, { quality: 'standard', credits: 23 }]
}], 'https://api.weavy.ai/api/v1/node-definitions/public'));
gpt.processPayload(payload({
  id: 'project-080',
  nodes: [{
    id: 'node-gpt', type: 'model', position: { x: 0, y: 0 },
    data: {
      model: { name: 'GPT Image 1 Edit', service: 'gpt_image_1_edit' },
      generations: [
        { batchId: 'batch-gpt', order: 0 },
        { batchId: 'batch-gpt', order: 1 },
        { batchId: 'batch-gpt', order: 2 }
      ],
      result: [
        { width: 1536, height: 1024, url: 'https://cdn.example/gpt-a.png' },
        { width: 1536, height: 1024, url: 'https://cdn.example/gpt-b.png' },
        { width: 1536, height: 1024, url: 'https://cdn.example/gpt-c.png' }
      ]
    }
  }]
}, 'https://api.weavy.ai/api/v1/recipes/project-080'));
summary = gpt.getSummary();
assert.strictEqual(summary.generations, 3);
assert.strictEqual(summary.totalMin, 24, 'GPT Image 1 Edit must use fixed 8 cr per generated item');
assert.strictEqual(summary.totalMax, 24);
assert.strictEqual(gpt.getReportRows()[0].costSource, 'catalog-fixed');

const content = fs.readFileSync(require.resolve('../content.js'), 'utf8');
assert.ok(content.includes('const CREDITS_PER_USD = 120'), 'USD conversion rate must be present');
assert.ok(content.includes('function setupCollapsedDragging'), 'collapsed pill must be draggable');
assert.ok(content.includes('total-usd'), 'USD total must be rendered');

console.log('0.8 pricing, USD and collapsed-drag regression tests passed.');
