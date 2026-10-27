# WEAVY CREDITS

[Русская документация](README.ru.md)

Chrome Manifest V3 extension for estimating credit usage from saved Weavy generations. Confirmed debit/refund transactions, catalog estimates, price ranges and unknown costs remain separate. The current interface is in Russian.

## Download and install

Version **1.6.1**, Chrome **116+**. [Download the ready-to-load ZIP](https://github.com/NasaatR/Weavy_Credits/raw/refs/heads/main/downloads/WEAVY-CREDITS-1.6.1.zip). The archive contains **`WEAVY-CREDITS-1.6.1/extension/`**. It is a versioned download stored in this repository, not a signed Chrome Web Store package. No build tools are needed to install it.

1. Extract the archive completely.
2. Open `chrome://extensions`, enable Developer mode and choose **Load unpacked**.
3. Select the extracted **`extension`** directory, then reload an existing `https://app.weavy.ai/` project and open its saved history.
4. Open the extension report. An unknown model has a searchable field directly below the total. Selecting a model saves immediately for equivalent names across saved files and future generations. The field states its scope; a generation-specific exception remains possible in the run list.

For example, `Seedream V5.0 Edit` resolves to the catalog's `Seedream V5 Edit`. A different minor version or conflicting historical evidence requires an explicit choice. Similar candidates appear first without being silently saved.

**Updating:** export a backup in Settings, replace all files in the existing extension directory and click Reload in `chrome://extensions`. Keep the installed extension and its original directory to retain local history. Reload project tabs to capture previously missing fields. A new paid generation is unnecessary. Uninstalling removes extension-local data; keep a backup first.

## What changed in 1.6.1

The Data tab now has **Copy diagnostics**: one click copies the existing sanitized JSON export. Paste it into your message with Ctrl+V. A blocked clipboard opens a selected, read-only JSON with retry/download actions; request failures never report success.


- Compact report, collapsible supporting details, sticky report controls and shortcuts between settings sections.
- Model suggestions stay within the viewport, support the keyboard and escape clipped containers. Saving retains the report position; conflicting generations remain editable.
- “Show more” exposes the complete report and catalog while limiting the initial DOM. Search and sorting include entries beyond the first page.
- Bundled content/observer scripts are about 48% smaller than 1.5.0 combined. An acknowledgement-gated cache coalesces identical captures briefly; failed messages and changed parameters/results are forwarded.
- Cached display calculations and protection against stale load responses. No new runtime dependency or extension permission.

## Accuracy, permissions and data

The extension reads the available saved history of opened projects, including older outputs. Missing prices, parameters or historical evidence remain unknown or a range. Catalog prices are estimates, not proof of account charges or a complete lifetime total. Current node settings do not replace historical parameters. See [pricing sources and limitations](docs/PRICING-RESEARCH.md).

`sidePanel` opens the report; `storage` holds local history/settings. Host access is limited to `app.weavy.ai` for observation and `www.cbr.ru` for the optional exchange-rate refresh. There is no analytics service or backend. Backups and raw exports can contain project data; inspect them before sharing. The calculation audit replaces identifiers and omits prompts/media/project titles.

**Verification:** 227 extension tests and 10 reference test files on synthetic data. Browser layout and authenticated Weavy billing have not been verified in this environment. The cloud browser cannot reach the local preview server. Full scope and commands: [testing](docs/TESTING.md).

## Development

Node.js 24+, npm. Generated bundles are committed so installation does not depend on npm.

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
