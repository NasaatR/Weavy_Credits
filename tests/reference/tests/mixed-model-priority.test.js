const assert = require('assert');
require('../catalog.js');
const CORE = require('../analyzer-core.js');
const catalog = globalThis.WEAVE_CREDIT_CATALOG;

const projectId = 'mixed-model-priority';
const payload = (data, url = `https://api.weavy.ai/api/v1/recipes/${projectId}`) => ({
  data,
  url,
  pageUrl: `https://app.weavy.ai/flow/${projectId}`,
  phase: 'response',
  source: 'network',
  capturedAt: '2026-07-28T19:00:00Z'
});

const analyzer = CORE.createAnalyzer(catalog, { projectId });

// Generic/reused values from model metadata must not become a project-wide
// model alias. The duplicated ID is intentionally contradictory.
analyzer.processPayload(payload({
  models: [
    { id: 'shared-model-id', name: 'ChatGPT Images 2.0', version: '1' },
    { id: 'shared-model-id', name: 'Gemini 3 (Nano Banana Pro)', version: '1' }
  ]
}, 'https://api.weavy.ai/api/v1/models/prices'));

const outputUrl = 'https://cdn.example/nano-output.png';
analyzer.processPayload(payload({
  id: projectId,
  nodes: [
    {
      id: 'node-nano-pro',
      type: 'fal_imported',
      position: { x: 0, y: 0 },
      data: {
        // This is stale/generic graph metadata and must not beat the selected
        // provider model below.
        version: 'ChatGPT Images 2.0',
        name: 'Gemini 3 (Nano Banana Pro)',
        kind: {
          model: {
            name: 'fal_imported',
            service: 'fal',
            version: 'fal-ai/nano-banana-pro/edit'
          }
        },
        generations: [{
          batchId: 'batch-nano-pro',
          order: 0,
          input: { model: 'google/gemini-3-pro', resolution: '2K' },
          result: { url: outputUrl, width: 2048, height: 1152 }
        }]
      }
    },
    {
      id: 'node-linked-gpt',
      type: 'model',
      position: { x: 1, y: 0 },
      data: {
        name: 'ChatGPT Images 2.0',
        // A linked node can repeat the same saved result. Deduplication must not
        // replace the stronger Nano Banana identity with this weaker candidate.
        generations: [{
          batchId: 'batch-nano-pro',
          order: 0,
          result: { url: outputUrl, width: 2048, height: 1152 }
        }]
      }
    },
    {
      id: 'node-gpt-edit',
      type: 'model',
      position: { x: 2, y: 0 },
      data: {
        model: {
          name: 'ChatGPT Images 2.0 Edit',
          version: 'openai/gpt-image-2/edit'
        },
        generations: [{
          batchId: 'batch-gpt-edit',
          order: 0,
          input: { model: 'openai/gpt-image-2/edit', quality: 'medium' },
          result: { url: 'https://cdn.example/gpt-output.png', width: 1024, height: 1024 }
        }]
      }
    }
  ]
}));

const summary = analyzer.getSummary();
assert.strictEqual(summary.generations, 2, 'the repeated linked output must be deduplicated');
assert.strictEqual(summary.models, 2, 'Nano Banana and GPT Image must remain separate');
assert.deepStrictEqual(
  new Set(summary.rows.map((row) => row.model)),
  new Set(['Gemini 3 Pro', 'ChatGPT Images 2.0 Edit'])
);
assert.strictEqual(summary.rows.find((row) => row.model === 'Gemini 3 Pro').generations, 1);
assert.strictEqual(summary.rows.find((row) => row.model === 'Gemini 3 Pro').min, 11);
assert.strictEqual(summary.rows.find((row) => row.model === 'ChatGPT Images 2.0 Edit').min, 9);
assert.strictEqual(summary.totalMin, 20);
assert.strictEqual(summary.totalMax, 20);

const diagnostics = analyzer.exportDiagnostics();
assert.strictEqual(diagnostics.schemaVersion, 9);
assert.ok(diagnostics.modelMapDiagnostics.ambiguousAliases >= 1, 'conflicting model IDs must be blocked');
assert.ok(!diagnostics.nodes.some((node) => node.nodeId === 'node-nano-pro' && /ChatGPT/i.test(node.model)));

// This mirrors the visible node title from the affected Weavy project. Even if
// the node also carries stale GPT metadata, the exact current title is enough
// to identify Nano Banana Pro.
const titleOnly = CORE.createAnalyzer(catalog, { projectId });
titleOnly.processPayload(payload({
  id: projectId,
  nodes: [{
    id: 'title-only-nano-node',
    type: 'model',
    position: { x: 0, y: 0 },
    data: {
      name: 'Gemini 3 (Nano Banana Pro)',
      version: 'ChatGPT Images 2.0',
      generations: [{
        batchId: 'title-only-nano-batch',
        order: 0,
        input: { resolution: '2K' },
        result: { url: 'https://cdn.example/title-only-nano.png', width: 2048, height: 1152 }
      }]
    }
  }]
}));
assert.strictEqual(titleOnly.getSummary().rows[0].model, 'Gemini 3 Pro');
assert.strictEqual(titleOnly.getSummary().totalMin, 11);
assert.strictEqual(titleOnly.getSummary().totalMax, 11);

// A media filename is not model evidence.
const filenameOnly = CORE.createAnalyzer(catalog, { projectId });
filenameOnly.processPayload(payload({
  id: projectId,
  nodes: [{
    id: 'filename-only-node',
    type: 'image',
    position: { x: 0, y: 0 },
    data: {
      name: 'ChatGPT Images 2.0 Edit_0004.png',
      version: 'ChatGPT Images 2.0',
      generations: [{ batchId: 'filename-only-batch', order: 0 }]
    }
  }]
}));
assert.strictEqual(filenameOnly.getSummary().rows[0].model, 'Модель не определена');

// Version 0.19 intentionally refuses the poisoned schema-8 state produced by
// older model-map logic.
const migrated = CORE.createAnalyzer(catalog, { projectId });
migrated.importState({
  schemaVersion: 8,
  records: [{
    key: 'old-poisoned-record',
    model: 'ChatGPT Images 2.0',
    modelRaw: 'ChatGPT Images 2.0',
    scope: 'item',
    units: 1
  }]
});
assert.strictEqual(migrated.getSummary().generations, 0);
assert.strictEqual(analyzer.exportState().schemaVersion, 9);

console.log('Mixed-model priority, alias-map, filename, and state migration tests passed.');
