const assert = require('assert');
require('../catalog.js');
const CORE = require('../analyzer-core.js');
const catalog = globalThis.WEAVE_CREDIT_CATALOG;

const estimate = CORE.helpers.estimateUnitCredits;
const index = new Map();
for (const entry of catalog.entries) {
  index.set(entry.name, entry);
  for (const alias of entry.aliases || []) index.set(alias, entry);
}
function model(name, raw = name) {
  const entry = index.get(name);
  assert.ok(entry, `Catalog entry missing: ${name}`);
  return { canonical: entry.name, raw, entry };
}
function exact(name, params, expected, raw = name) {
  const result = estimate(model(name, raw), params, catalog, { values: [1, 999], rules: [{ credits: 999, when: {} }] });
  assert.strictEqual(result.min, expected, `${name} min`);
  assert.strictEqual(result.max, expected, `${name} max`);
  assert.strictEqual(result.source, 'catalog-parameter-match');
}

exact('Gemini 3 Pro', { 'result.width': 1200, 'result.height': 1200 }, 11);
exact('Gemini 3 Pro', { 'result.width': 3168, 'result.height': 1344 }, 11);
exact('Gemini 3 Pro', { 'result.width': 6336, 'result.height': 2688 }, 23);

exact('Gemini 3.1 Flash (Nano Banana 2)', { 'result.width': 1200, 'result.height': 1200 }, 6);
exact('Gemini 3.1 Flash (Nano Banana 2)', { 'result.width': 3168, 'result.height': 1344 }, 9);
exact('Gemini 3.1 Flash (Nano Banana 2)', { 'result.width': 6336, 'result.height': 2688 }, 13.5);

exact('ChatGPT Images 2.0 Edit', { 'input.quality': 'medium' }, 9, 'openai/gpt-image-2/edit');
exact('ChatGPT Images 2.0 Edit', { 'params.image_quality': 'HIGH' }, 37, 'gpt-image-2/edit');

const unknownQuality = estimate(
  model('ChatGPT Images 2.0 Edit', 'openai/gpt-image-2/edit'),
  { 'result.width': 1536, 'result.height': 1024 },
  catalog,
  { values: [9], rules: [{ credits: 9, when: {} }] }
);
assert.strictEqual(unknownQuality.min, 9);
assert.strictEqual(unknownQuality.max, 37);
assert.strictEqual(unknownQuality.source, 'catalog-parameters-missing');
assert.match(unknownQuality.reason, /Quality/);

console.log('GPT Image 2 and Nano Banana pricing tests passed.');
