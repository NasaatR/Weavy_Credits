const assert = require('assert');
require('../catalog.js');
const CORE = require('../analyzer-core.js');
const catalog = globalThis.WEAVE_CREDIT_CATALOG;

function payload(data, url = 'https://api.weavy.ai/api/v1/recipes/project-wrapper') {
  return {
    data,
    url,
    pageUrl: 'https://app.weavy.ai/flow/project-wrapper',
    phase: 'response',
    capturedAt: '2026-07-28T10:00:00Z'
  };
}

// Weavy can expose an internal wrapper name before the actual provider version.
const wrapped = CORE.createAnalyzer(catalog, { projectId: 'project-wrapper' });
wrapped.processPayload(payload({
  id: 'project-wrapper',
  nodes: [{
    id: 'node-nano-2',
    type: 'fal_imported',
    position: { x: 0, y: 0 },
    data: {
      kind: { model: { name: 'fal_imported', service: 'fal', version: 'fal-ai/nano-banana-2/edit' } },
      generations: [
        { batchId: 'batch-nano-2-a', order: 0 },
        { batchId: 'batch-nano-2-b', order: 1 }
      ]
    }
  }]
}));
let summary = wrapped.getSummary();
assert.strictEqual(summary.generations, 2);
assert.ok(summary.rows.some((row) => row.model === 'Gemini 3.1 Flash (Nano Banana 2)'));
assert.ok(!summary.rows.some((row) => /fal_imported/i.test(row.model)));

// Generic any_llm is also a wrapper. The selected model can be stored in params.
const llmWrapper = CORE.createAnalyzer(catalog, { projectId: 'project-wrapper' });
llmWrapper.processPayload(payload({
  id: 'project-wrapper',
  nodes: [{
    id: 'node-nano-pro',
    type: 'any_llm',
    position: { x: 0, y: 0 },
    data: {
      kind: { model: { name: 'any_llm', service: 'any_llm' } },
      params: { model: 'fal-ai/nano-banana-pro/edit' },
      generations: [{ batchId: 'batch-nano-pro-a', order: 0 }]
    }
  }]
}));
summary = llmWrapper.getSummary();
assert.strictEqual(summary.generations, 1);
assert.strictEqual(summary.rows[0].model, 'Gemini 3 Pro');
assert.ok(!summary.rows.some((row) => /any_llm/i.test(row.model)));

// Per-generation settings have priority over a generic node wrapper.
const perRun = CORE.createAnalyzer(catalog, { projectId: 'project-wrapper' });
perRun.processPayload(payload({
  id: 'project-wrapper',
  nodes: [{
    id: 'node-generic',
    type: 'any_llm',
    position: { x: 0, y: 0 },
    data: {
      kind: { model: { name: 'any_llm' } },
      generations: [{
        batchId: 'batch-specific-model',
        order: 0,
        input: { model: 'fal-ai/nano-banana-2-lite/edit' }
      }]
    }
  }]
}));
summary = perRun.getSummary();
assert.strictEqual(summary.generations, 1);
assert.strictEqual(summary.rows[0].model, 'Gemini 3.1 Flash (Nano Banana 2)');

// If no actual model exists, keep the generation but do not lie about a wrapper.
const unresolved = CORE.createAnalyzer(catalog, { projectId: 'project-wrapper' });
unresolved.processPayload(payload({
  id: 'project-wrapper',
  nodes: [{
    id: 'node-unresolved',
    type: 'fal_imported',
    position: { x: 0, y: 0 },
    data: {
      kind: { model: { name: 'fal_imported' } },
      generations: [{ batchId: 'batch-unresolved', order: 0 }]
    }
  }]
}));
summary = unresolved.getSummary();
assert.strictEqual(summary.generations, 1);
assert.strictEqual(summary.rows[0].model, 'Модель не определена');
assert.strictEqual(summary.unresolvedModelGenerations, 1);

console.log('Model wrapper resolution regression tests passed.');

// A large project with many wrapper nodes must not collapse into fal_imported.
const many = CORE.createAnalyzer(catalog, { projectId: 'project-wrapper' });
many.processPayload(payload({
  id: 'project-wrapper',
  nodes: Array.from({ length: 240 }, (_, index) => ({
    id: `large-node-${index}`,
    type: 'fal_imported',
    position: { x: index, y: 0 },
    data: {
      kind: {
        model: {
          name: 'fal_imported',
          service: 'fal',
          version: index % 2 === 0
            ? 'fal-ai/nano-banana-2/edit'
            : 'fal-ai/nano-banana-pro/edit'
        }
      },
      generations: [{ batchId: `large-batch-${index}`, order: 0 }]
    }
  }))
}));
summary = many.getSummary();
assert.strictEqual(summary.generations, 240);
assert.strictEqual(summary.rows.find((row) => row.model === 'Gemini 3.1 Flash (Nano Banana 2)').generations, 120);
assert.strictEqual(summary.rows.find((row) => row.model === 'Gemini 3 Pro').generations, 120);
assert.ok(!summary.rows.some((row) => /fal_imported|any_llm/i.test(row.model)));

// A later weak wrapper object cannot overwrite a previously resolved endpoint.
const overwriteGuard = CORE.createAnalyzer(catalog, { projectId: 'project-wrapper' });
overwriteGuard.processPayload(payload({
  id: 'project-wrapper',
  nodes: [{
    id: 'stable-node', type: 'fal_imported', position: { x: 0, y: 0 },
    data: {
      kind: { model: { name: 'fal_imported', version: 'fal-ai/nano-banana-pro/edit' } },
      generations: [{ batchId: 'stable-batch', order: 0 }]
    }
  }]
}));
overwriteGuard.processPayload(payload({
  id: 'project-wrapper',
  nodes: [{
    id: 'stable-node', type: 'fal_imported', position: { x: 0, y: 0 },
    data: { kind: { model: { name: 'fal_imported', service: 'fal' } } }
  }]
}, 'https://api.weavy.ai/api/v1/recipes/project-wrapper/save'));
summary = overwriteGuard.getSummary();
assert.strictEqual(summary.rows[0].model, 'Gemini 3 Pro');

console.log('Large wrapper and overwrite-protection tests passed.');
