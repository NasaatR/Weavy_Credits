# Component provenance and license status

Canonical project: https://github.com/NasaatR/Weavy_Credits . Maintainer: NasaatR.

`extension/vendor/analyzer-core.js`, `extension/vendor/catalog.js` and `tests/reference/` came from the analyzer sources provided with this project. The analyzer core is used in the extension; the old catalog and reference tests are development inputs/comparisons. These supplied files do not contain an identifiable license grant in the received snapshot. Their original authorship is not reassigned to the maintainer. No blanket MIT license is asserted over them, generated bundles containing them, or the project as a whole.

This publication preserves the supplied source provenance. It does not establish redistribution rights beyond those held by the respective rights holders. No existing license text or attribution notice has been removed.

Development dependencies are installed through npm and are not copied into the extension runtime:

- esbuild 0.28.2 — MIT, https://github.com/evanw/esbuild
- linkedom 0.18.13 — ISC, https://github.com/WebReflection/linkedom
- fake-indexeddb 6.2.5 — Apache-2.0, https://github.com/dumbmatter/fakeIndexedDB

Their installed packages and transitive dependencies retain their own notices. `package-lock.json` pins the build/test dependency graph; `node_modules` is excluded from source control and the loadable extension.

Catalog data preserves source URLs and check dates in `docs/official-rows.json`, `docs/catalog-data.json` and `extension/catalog-data.js`. Published price information is not a claim of account billing accuracy or ownership of provider names/trademarks. This is an independent project, not an official Weavy/Figma extension.
