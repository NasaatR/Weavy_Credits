const assert = require('assert');
require('../catalog.js');
const CORE = require('../analyzer-core.js');
const catalog = globalThis.WEAVE_CREDIT_CATALOG;

const projectId = 'scCwUmbRqpUPjiVTfXJjor';
const analyzer = CORE.createAnalyzer(catalog, { projectId });
const payload = (data, url, phase = 'response') => ({
  data,
  url,
  pageUrl: `https://app.weavy.ai/flow/${projectId}`,
  phase,
  source: 'network',
  capturedAt: '2026-07-28T11:48:53.729Z'
});

// This fixture follows the concrete node IDs/model slugs visible in the user's
// 0.2.0 diagnostic export and includes pre-existing generation history.
analyzer.processPayload(payload({
  id: projectId,
  nodes: [
    {
      id: 'e7ab1ae7-ff2d-4900-a0fb-e840f8fed299',
      type: 'model',
      data: {
        model: { name: 'Gemini 3 Pro', service: 'fal-ai/nano-banana-pro/edit' },
        generations: [
          { batchId: 'batch-pro-old-0001', order: 0, completedAt: '2026-06-01T10:00:00Z' },
          { batchId: 'batch-pro-old-0002', order: 1, completedAt: '2026-06-02T10:00:00Z' }
        ]
      }
    },
    {
      id: '06f2130a-e2b5-4291-92db-41ee7f118623',
      type: 'model',
      data: {
        model: { name: 'Gemini 3.1 Flash (Nano Banana 2)', service: 'fal-ai/nano-banana-2/edit' },
        params: { resolution: '2K' },
        generations: [
          { batchId: 'batch-flash-old-0001', order: 0, completedAt: '2026-06-03T10:00:00Z' },
          { batchId: 'batch-flash-old-0002', order: 1, completedAt: '2026-06-04T10:00:00Z' },
          { batchId: 'batch-flash-old-0003', order: 2, completedAt: '2026-06-05T10:00:00Z' }
        ]
      }
    },
    {
      id: 'e5c30345-88e4-4e24-b0e8-ad65ea82dd5f',
      type: 'model',
      data: {
        model: { name: 'GPT Image 1 Edit', service: 'gpt_image_1_edit' },
        generations: [
          { batchId: 'batch-gpt-old-0001', order: 0, completedAt: '2026-06-06T10:00:00Z' }
        ]
      }
    }
  ]
}, `https://api.weavy.ai/api/v1/recipes/${projectId}`, 'response'));

let summary = analyzer.getSummary();
assert.strictEqual(summary.generations, 6, 'all six saved historical generations must be counted');
assert.strictEqual(summary.models, 3, 'only the three models present in this project may appear');
assert.deepStrictEqual(
  new Set(summary.rows.map((row) => row.model)),
  new Set(['Gemini 3 Pro', 'Gemini 3.1 Flash (Nano Banana 2)', 'GPT Image 1 Edit'])
);

// A status response for an old batch enriches the stored item, but cannot add a duplicate.
analyzer.processPayload(payload({
  recipeRuns: [{
    nodeRuns: [{
      id: 'node-run-old-0001',
      nodeId: '06f2130a-e2b5-4291-92db-41ee7f118623',
      runId: 'run-old-0001',
      status: 'COMPLETED',
      completedAt: '2026-06-03T10:00:03Z',
      output: [{ url: 'https://cdn.example/old-output.png', order: 0 }]
    }]
  }]
}, `https://api.weavy.ai/api/v1/batches/recipes/${projectId}/batches/batch-flash-old-0001/status`));

summary = analyzer.getSummary();
assert.strictEqual(summary.generations, 6, 'historical batch status must merge with saved history');
assert.ok(!summary.rows.some((row) => /Kling|Seedance|Dalle/i.test(row.model)), 'catalog-only models must not leak into usage');

console.log('Diagnostic-shape integration test passed.');
