"""Create the deterministic, ready-to-load archive; no npm dependencies included."""
import json
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

root = Path(__file__).resolve().parent.parent
version = json.loads((root / 'package.json').read_text())['version']
name = f'WEAVY-CREDITS-{version}'
target = root / 'downloads' / f'{name}.zip'
target.parent.mkdir(exist_ok=True)
files = [(str(p.relative_to(root)), p.read_bytes())
         for p in sorted((root / 'extension').rglob('*')) if p.is_file()]
files.append(('THIRD_PARTY_NOTICES.md', (root / 'THIRD_PARTY_NOTICES.md').read_bytes()))
files.append(('INSTALL.txt', (
    f'WEAVY CREDITS {version}\nChrome 116+\n\n'
    'Extract the archive completely. Open chrome://extensions, enable Developer mode,\n'
    'choose Load unpacked and select the extension directory inside this folder.\n\n'
    'Updating: back up your data, replace files in your existing extension directory,\n'
    'then click Reload. Keep the installed extension to retain its local history.\n'
    'Reload Weavy tabs and open saved history; a paid generation is unnecessary.\n\n'
    'Confirmed transactions, estimates, ranges and unknown costs remain separate.\n'
    'https://github.com/NasaatR/Weavy_Credits\n'
).encode()))
with ZipFile(target, 'w', compression=ZIP_DEFLATED, compresslevel=9) as archive:
    for relative, data in files:
        info = ZipInfo(f'{name}/{relative}', date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, data, compresslevel=9)
print(target.relative_to(root))
