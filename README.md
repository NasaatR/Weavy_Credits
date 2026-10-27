# WEAVY CREDITS

[Русская документация](README.ru.md)

Chrome Manifest V3 extension for estimating credit usage from saved Weavy generations. Confirmed transactions and estimates remain distinct in the audit. The main UI shows one approximate total, using the midpoint of each price range; unknown costs stay explicitly uncounted. The current interface is in Russian.

## Download and install

Version **1.8.0**, Chrome **116+**. [Download the ready-to-load ZIP](https://github.com/NasaatR/Weavy_Credits/raw/refs/heads/main/downloads/WEAVY-CREDITS-1.8.0.zip). The archive contains **`WEAVY-CREDITS-1.8.0/extension/`**. It is a versioned download stored in this repository, not a signed Chrome Web Store package. No build tools are needed to install it. The ZIP contains only runtime resources, installation notes, provenance notices and integrity hashes.

1. Extract the archive completely.
2. Open `chrome://extensions`, enable Developer mode and choose **Load unpacked**.
3. Select the extracted **`extension`** directory, then reload an existing `https://app.weavy.ai/` project and open its saved history.
4. Open the extension report. An unknown model has a searchable field directly below the total. Selecting a model saves immediately for equivalent names across saved files and future generations. The field states its scope; a generation-specific exception remains possible in the run list.

For example, `Seedream V5.0 Edit` resolves to the catalog's `Seedream V5 Edit`. A different minor version or conflicting historical evidence requires an explicit choice. Similar candidates appear first without being silently saved.

**Updating:** export a backup in Settings, replace all files in the existing extension directory and click Reload in `chrome://extensions`. Keep the installed extension and its original directory to retain local history. Reload project tabs to capture previously missing fields. A new paid generation is unnecessary. Uninstalling removes extension-local data; keep a backup first.

## What changed in 1.8.0

- Any LLM: 360 text model identities, including Claude Opus 5, plus models observed in your Weavy data. A text-model filter, provider-ID search and explicit missing-tariff labels make them selectable. The external model directory does not assert Weavy availability or credit prices. Existing manual corrections remain in effect.
- Typed LLM selections and explicit token-usage counters are recognized. Token tariffs use actual counters; missing counters and Weavy prices stay unknown. Current price quotes are shown as hints, not silently applied to old generations.
- Stable floating panel: existing controls update in place, same-page refresh keeps context, drag updates use one animation frame and pointer capture, and position is saved once on release. Background updates are deferred during a drag.
- Menus render up to 80 options, while searching the full inventory. Similarity features are cached. Diagnostics retain up to 4,000 observed price rows and diverse node schemas.
- Distribution follows the manifest/module resource graph, includes per-file integrity hashes and refuses to overwrite a committed version ZIP with different bytes. Source and audit scripts remain in the repository.

## Package validation and Defender

`node scripts/audit-runtime.mjs` checks local resources, CSP, permissions and dynamic execution patterns. This is a static guard, not an antivirus verdict. The Windows CI job updates Microsoft Defender signatures and scans the distributed ZIP and extracted files, recording the archive hash, engine/signature versions and results. A scan error or unavailable scanner is a failure, never a clean verdict; view the actual [Actions result](https://github.com/NasaatR/Weavy_Credits/actions).

A verdict applies to the scanned bytes and engine/signature versions. Incorrect classifications can be submitted to [Microsoft Security Intelligence](https://www.microsoft.com/en-us/wdsi/filesubmission) as a software developer; Microsoft makes the final determination. Nothing in this extension changes Windows Security settings.

## Accuracy, permissions and data

The extension reads the available saved history of opened projects, including older outputs. Missing prices remain unknown. Parameter-dependent bounds are retained in the audit; the main UI shows their midpoint as an approximation. Catalog prices are estimates, not proof of account charges or a complete lifetime total. Current node settings do not replace historical parameters. See [pricing sources and limitations](docs/PRICING-RESEARCH.md).

`sidePanel` opens the report; `storage` holds local history/settings. Host access is limited to `app.weavy.ai` for observation and `www.cbr.ru` for the optional exchange-rate refresh. There is no analytics service or backend. Backups and raw exports can contain project data; inspect them before sharing. The calculation audit replaces identifiers and omits prompts/media/project titles.

**Verification:** 252 extension tests and 10 reference test files on synthetic data. Browser layout and authenticated Weavy billing have not been verified in this environment. The cloud browser cannot reach the local preview server. Full scope and commands: [testing](docs/TESTING.md).

## Development

Node.js 24+, npm. Generated bundles are committed so installation does not depend on npm. Python 3.9+ is used by packaging tests and archive creation.

```sh
npm ci
npm run build
npm test
npm run test:reference
npm run preview
```

Preview serves synthetic data at `http://localhost:18765`. It exercises the real UI with a mock extension API; it does not observe Weavy or persist production history. Optional query parameters: `?width=320`, `?font=22` and `?theme=light`.

Edit `content-source.js` / `observer-source.js`, then rebuild. `package.json` is the application version source. To rebuild the ready-to-load ZIP, run `npm run package` (Python 3 required only for packaging). Run `node scripts/build-catalog.mjs` only when intentionally updating the saved catalog inputs and review the resulting prices/sources. [Data format](docs/DATA-FORMAT.md) · [project guidance](AGENTS.md).

For bugs, use [Issues](https://github.com/NasaatR/Weavy_Credits/issues) with the version, Chrome version, reproduction and a reviewed calculation audit. Do not post credentials, private projects or raw billing exports.

Maintained by [NasaatR](https://github.com/NasaatR). Made by Nasaat. Provided analyzer/reference components retain their provenance; no blanket license or ownership claim is added. See [component and license notes](THIRD_PARTY_NOTICES.md).
