const assert = require('assert');
require('../catalog.js');
const CORE = require('../analyzer-core.js');
const catalog = globalThis.WEAVE_CREDIT_CATALOG;

function payload(data, url, phase = 'response') {
  return {
    data,
    url,
    pageUrl: 'https://app.weavy.ai/flow/project-1',
    phase,
    capturedAt: '2026-07-28T10:00:00Z'
  };
}

const analyzer = CORE.createAnalyzer(catalog, { projectId: 'project-1' });

// A saved, already-existing project: three old generations are stored in node.data.generations.
analyzer.processPayload(payload({
  nodes: [
    {
      id: 'node-nano',
      data: {
        kind: { model: { name: 'Gemini 3.1 Flash (Nano Banana 2)', service: 'fal-ai/nano-banana-2/edit' } },
        params: { resolution: '2K' },
        generations: [
          { batchId: 'batch-nano-0001', order: 0, createdAt: '2026-06-01T10:00:00Z', result: [{ id: 'asset-1', width: 3168, height: 1344 }] },
          { batchId: 'batch-nano-0002', order: 1, createdAt: '2026-06-02T10:00:00Z', result: [{ id: 'asset-2', width: 3168, height: 1344 }] }
        ]
      }
    },
    {
      id: 'node-gpt',
      data: {
        kind: { model: { name: 'GPT Image 1 Edit', service: 'gpt_image_1_edit' } },
        generations: [
          { batchId: 'batch-gpt-0001', order: 0, createdAt: '2026-06-03T10:00:00Z', result: [{ id: 'asset-3' }] }
        ]
      }
    }
  ]
}, 'https://api.weavy.ai/api/v1/recipes/project-1/save', 'request'));

let summary = analyzer.getSummary();
assert.strictEqual(summary.generations, 3, 'old data.generations entries must be counted');
assert.strictEqual(summary.models, 2, 'only models actually present in the project must be shown');
assert.strictEqual(summary.rows.find(r => r.model === 'GPT Image 1 Edit').min, 8);
assert.strictEqual(summary.rows.find(r => r.model === 'GPT Image 1 Edit').max, 8);
assert.strictEqual(summary.rows.find(r => r.model === 'Gemini 3.1 Flash (Nano Banana 2)').min, 18);
assert.strictEqual(summary.rows.find(r => r.model === 'Gemini 3.1 Flash (Nano Banana 2)').max, 18);

// Batch status replaces/merges with the saved history instead of double-counting it.
analyzer.processPayload(payload({
  recipeRuns: [{
    nodeRuns: [{
      id: 'node-run-record',
      nodeId: 'node-gpt',
      runId: 'run-gpt-1',
      status: 'COMPLETED',
      completedAt: '2026-06-03T10:01:00Z',
      output: { id: 'asset-3' }
    }]
  }]
}, 'https://api.weavy.ai/api/v1/batches/recipes/project-1/batches/batch-gpt-0001/status'));

summary = analyzer.getSummary();
assert.strictEqual(summary.generations, 3, 'status response must not duplicate the saved generation');

// A template/catalog payload must never become project usage.
analyzer.processPayload(payload({
  workspaceSubflowTemplates: [{
    data: { nodes: [{ id: 'fake-node', data: { model: 'Kling 3', generations: [{ batchId: 'fake-batch' }] } }] }
  }]
}, 'https://api.weavy.ai/api/v1/subflow-templates'));
summary = analyzer.getSummary();
assert.ok(!summary.rows.some(r => r.model === 'Kling 3'), 'template model must be ignored');

// Exact credits from Weavy override an estimate.
const exact = CORE.createAnalyzer(catalog, { projectId: 'project-1' });
exact.processPayload(payload({
  nodes: [{ id: 'node-gpt', data: { model: 'GPT Image 1 Edit', generations: [{ batchId: 'batch-exact-0001' }] } }]
}, 'https://api.weavy.ai/api/v1/recipes/project-1/save', 'request'));
exact.processPayload(payload({
  creditsUsed: 11,
  recipeRuns: [{ nodeRuns: [{ nodeId: 'node-gpt', runId: 'run-exact', status: 'COMPLETED' }] }]
}, 'https://api.weavy.ai/api/v1/batches/recipes/project-1/batches/batch-exact-0001/status'));
const exactSummary = exact.getSummary();
assert.strictEqual(exactSummary.totalMin, 11);
assert.strictEqual(exactSummary.totalMax, 11);
assert.strictEqual(exactSummary.actualCredits, 11);

// Failed non-charged runs are excluded.
const before = exact.getSummary().generations;
exact.processPayload(payload({
  recipeRuns: [{ nodeRuns: [{ nodeId: 'node-gpt', runId: 'run-failed', status: 'FAILED' }] }]
}, 'https://api.weavy.ai/api/v1/batches/recipes/project-1/batches/batch-failed/status'));
assert.strictEqual(exact.getSummary().generations, before);

console.log('All analyzer tests passed.');

// A general models/catalog endpoint loaded while a project is open must not be
// interpreted as project usage merely because pageUrl contains the project ID.
const catalogGuard = CORE.createAnalyzer(catalog, { projectId: 'project-1' });
catalogGuard.processPayload(payload({
  models: [{ id: 'catalog-kling', name: 'Kling 3', generations: [{ batchId: 'catalog-only-batch' }] }]
}, 'https://api.weavy.ai/api/v1/models'));
assert.strictEqual(catalogGuard.getSummary().generations, 0, 'model catalog entries must never count as project history');

// When one charged batch contains several outputs, the batch charge must stay
// separate from output aliases and replace the sum of per-item estimates.
const multi = CORE.createAnalyzer(catalog, { projectId: 'project-1' });
multi.processPayload(payload({
  nodes: [{
    id: 'node-gpt-multi',
    data: {
      model: 'GPT Image 1 Edit',
      generations: [
        { batchId: 'batch-multi-0001', order: 0 },
        { batchId: 'batch-multi-0001', order: 1 }
      ],
      result: [
        { url: 'https://cdn.example/output-a.png', order: 0 },
        { url: 'https://cdn.example/output-b.png', order: 1 }
      ]
    }
  }]
}, 'https://api.weavy.ai/api/v1/recipes/project-1/save', 'request'));
multi.processPayload(payload({
  creditsUsed: 12,
  recipeRuns: [{ nodeRuns: [{
    nodeId: 'node-gpt-multi',
    runId: 'run-multi',
    status: 'COMPLETED',
    output: [
      { url: 'https://cdn.example/output-a.png' },
      { url: 'https://cdn.example/output-b.png' }
    ]
  }] }]
}, 'https://api.weavy.ai/api/v1/batches/recipes/project-1/batches/batch-multi-0001/status'));
const multiSummary = multi.getSummary();
assert.strictEqual(multiSummary.generations, 2, 'multi-output batch must count two stored generation items');
assert.strictEqual(multiSummary.totalMin, 12, 'actual batch debit must replace per-item estimates');
assert.strictEqual(multiSummary.totalMax, 12, 'actual batch debit must replace per-item estimates');
assert.strictEqual(multiSummary.actualCredits, 12, 'actual multi-output debit must be classified as actual');

console.log('Extended analyzer tests passed.');

// Diagnostic export must not expose generated asset URLs in plain text.
const diagnostic = multi.exportDiagnostics();
const diagnosticText = JSON.stringify(diagnostic);
assert.ok(!diagnosticText.includes('https://cdn.example/output-a.png'), 'diagnostics must redact output URLs');
assert.ok(diagnosticText.includes('REDACTED_OUTPUT'), 'diagnostics should preserve a redacted output marker');

// CSV/report rows are grouped by batch and must use the actual batch debit.
const reportRows = multi.getReportRows();
assert.strictEqual(reportRows.length, 1, 'multi-output batch should export as one batch row');
assert.strictEqual(reportRows[0].generations, 2);
assert.strictEqual(reportRows[0].creditsMin, 12);
assert.strictEqual(reportRows[0].creditsMax, 12);

console.log('Diagnostics and report export tests passed.');

// Persisted reports must preserve scope-aware de-duplication after a page reload.
const restored = CORE.createAnalyzer(catalog, { projectId: 'project-1' });
restored.importState(multi.exportState());
restored.processPayload(payload({
  creditsUsed: 12,
  recipeRuns: [{ nodeRuns: [{
    nodeId: 'node-gpt-multi',
    runId: 'run-multi',
    status: 'COMPLETED',
    output: [
      { url: 'https://cdn.example/output-a.png' },
      { url: 'https://cdn.example/output-b.png' }
    ]
  }] }]
}, 'https://api.weavy.ai/api/v1/batches/recipes/project-1/batches/batch-multi-0001/status'));
const restoredSummary = restored.getSummary();
assert.strictEqual(restoredSummary.generations, 2, 'reprocessing after state import must not duplicate outputs');
assert.strictEqual(restoredSummary.totalMin, 12, 'actual debit must survive state import');
assert.strictEqual(restored.getReportRows().length, 1, 'CSV/report rows should be grouped by batch, not raw evidence records');

console.log('Persistence and grouped-report tests passed.');
