const assert = require('assert');
require('../catalog.js');
const CORE = require('../analyzer-core.js');
const catalog = globalThis.WEAVE_CREDIT_CATALOG;

const byName = new Map(catalog.entries.map((entry) => [entry.name, entry]));
const estimate = CORE.helpers.estimateUnitCredits;

// Safety guard: even if a wrapper incorrectly says GPT Image 1 Edit, explicit
// GPT Image 2 evidence must prevent the fixed 8-credit rule.
const mislabeled = {
  canonical: 'GPT Image 1 Edit',
  raw: 'gpt image 2/gpt/image',
  entry: byName.get('GPT Image 1 Edit')
};
let price = estimate(mislabeled, { 'input.quality': 'high', 'input.image_1.url': 'x' }, catalog, null);
assert.strictEqual(price.min, 37);
assert.strictEqual(price.max, 37);
assert.strictEqual(price.source, 'catalog-parameter-match');

price = estimate(mislabeled, { 'input.quality': 'medium', 'input.image_1.url': 'x' }, catalog, null);
assert.strictEqual(price.min, 9);
assert.strictEqual(price.max, 9);

price = estimate(mislabeled, { 'input.image_1.url': 'x' }, catalog, null);
assert.strictEqual(price.min, 9);
assert.strictEqual(price.max, 37);
assert.strictEqual(price.source, 'catalog-parameters-missing');

// Schema/default values must not override the historical execution value.
price = estimate(mislabeled, {
  'input.quality': 'high',
  'data.schema.quality.default': 'medium',
  'data.schema.quality.enum[0]': 'low'
}, catalog, null);
assert.strictEqual(price.min, 37);
assert.strictEqual(price.max, 37);

// Conflicting trusted execution values are ambiguous and must produce a range.
price = estimate(mislabeled, {
  'input.quality': 'high',
  'params.quality': 'medium'
}, catalog, null);
assert.strictEqual(price.min, 9);
assert.strictEqual(price.max, 37);

// True GPT Image 1 Edit remains fixed at 8 credits.
price = estimate({
  canonical: 'GPT Image 1 Edit',
  raw: 'gpt-image-1-edit',
  entry: byName.get('GPT Image 1 Edit')
}, { 'input.quality': 'high' }, catalog, null);
assert.strictEqual(price.min, 8);
assert.strictEqual(price.max, 8);

function payload(data) {
  return {
    data,
    url: 'https://api.weavy.ai/api/v1/recipes/gpt2-regression',
    pageUrl: 'https://app.weavy.ai/flow/gpt2-regression',
    phase: 'response',
    capturedAt: '2026-07-28T10:00:00Z'
  };
}

const analyzer = CORE.createAnalyzer(catalog, { projectId: 'gpt2-regression' });
analyzer.processPayload(payload({
  id: 'gpt2-regression',
  nodes: [{
    id: 'node-gpt2-edit',
    type: 'fal_imported',
    title: 'ChatGPT Images 2.0 Edit',
    position: { x: 0, y: 0 },
    data: {
      title: 'ChatGPT Images 2.0 Edit',
      kind: {
        model: {
          // Reproduces the conflicting wrapper data seen in the live project.
          name: 'gpt_image_1_edit',
          service: 'gpt image 2/gpt/image'
        }
      },
      generations: [
        { batchId: 'batch-high', order: 0, input: { quality: 'high', image_1: { width: 2048, height: 1152 } } },
        { batchId: 'batch-medium', order: 1, input: { quality: 'medium', image_1: { width: 2048, height: 1152 } } },
        { batchId: 'batch-unknown', order: 2, input: { image_1: { width: 2048, height: 1152 } } }
      ]
    }
  }]
}));

const summary = analyzer.getSummary();
assert.strictEqual(summary.generations, 3);
assert.strictEqual(summary.rows.length, 1);
assert.strictEqual(summary.rows[0].model, 'ChatGPT Images 2.0 Edit');
assert.strictEqual(summary.totalMin, 55); // 37 + 9 + 9
assert.strictEqual(summary.totalMax, 83); // 37 + 9 + 37
assert.ok(!summary.rows.some((row) => row.model === 'GPT Image 1 Edit'));

const report = analyzer.getReportRows();
const high = report.find((row) => row.batchId === 'batch-high');
const medium = report.find((row) => row.batchId === 'batch-medium');
const unknown = report.find((row) => row.batchId === 'batch-unknown');
assert.strictEqual(high.creditsMin, 37);
assert.strictEqual(high.creditsMax, 37);
assert.match(high.parameters, /Quality High/);
assert.strictEqual(medium.creditsMin, 9);
assert.strictEqual(medium.creditsMax, 9);
assert.match(medium.parameters, /Quality Medium/);
assert.strictEqual(unknown.creditsMin, 9);
assert.strictEqual(unknown.creditsMax, 37);

console.log('GPT Image 2 model-family and Quality regression tests passed.');
