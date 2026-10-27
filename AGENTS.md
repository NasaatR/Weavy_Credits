# Project guidance

- `extension/` is the ready-to-load Chrome MV3 package. Preserve Russian UI and the existing appearance settings.
- Node 24+: `npm ci`, `npm run build`, `npm test`, `npm run test:reference`, `node scripts/audit-runtime.mjs` (Python 3.9+ for packaging tests). `npm run preview` uses synthetic data and a mock Chrome API, not authenticated Weavy.
- Edit `content-source.js` / `observer-source.js`; rebuild their generated `.js` bundles. `npm run package` (Python 3) refreshes the versioned ZIP in `downloads/`; update its SHA256SUMS after a meaningful release. `package.json` owns the app version; build synchronizes the manifest, `version.js` and visible version labels.
- Confirmed debit/refund amounts require stable transaction IDs. Keep confirmed debits separate from estimates in the data. The main UI shows one approximate total using the midpoint of each bounded estimate; detailed bounds remain in the audit and collapsed breakdown. Unknown costs and preview prices must never become zero/confirmed charges. Never infer historical model parameters from current node settings.
- Equivalent model names can share an assignment; distinct versions/modes and generation exceptions must remain distinct. Preserve raw source evidence, persisted data, backup compatibility and incoming history during undo.
- Keep page-origin messages unable to change settings, prices, mappings or backups. Do not expand host permissions or add telemetry for UI work.
- Preserve notices and provenance. `extension/vendor/` and `tests/reference/` originate in user-provided analyzer sources; public availability is not a license grant. Canonical project: https://github.com/NasaatR/Weavy_Credits . The small UI credit is exactly “Made by Nasaat”.
- Before publishing, inspect the latest remote default branch and run relevant checks. Use normal fast-forward updates; preserve concurrent work.

- The LLM directory contains identities only. Never translate provider USD/token prices into Weavy credits automatically. Observed models/quotes are discoverable; they do not become historical tariffs. Keep existing manual model corrections.
- The installable ZIP follows the runtime import graph and contains integrity hashes. Preserve committed version archives. Windows Defender results require a real scanner, recorded signatures and the exact artifact; unavailable/failed is not clean. Do not change code merely to conceal a detection or weaken protection; use official false-positive review when appropriate.
