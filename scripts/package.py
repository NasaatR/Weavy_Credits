"""Create the deterministic, ready-to-load archive; no npm dependencies included."""
import json
import re
import hashlib
import io
import subprocess
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

root = Path(__file__).resolve().parent.parent
version = json.loads((root / 'package.json').read_text())['version']
name = f'WEAVY-CREDITS-{version}'
target = root / 'downloads' / f'{name}.zip'
target.parent.mkdir(exist_ok=True)
extension = root / 'extension'
manifest = json.loads((extension / 'manifest.json').read_text())
required = {'manifest.json', manifest['background']['service_worker'], manifest['side_panel']['default_path']}
required.update(ref.split('?')[0] for ref in [manifest.get('options_page'), manifest.get('options_ui', {}).get('page'), manifest.get('action', {}).get('default_popup')] if ref)
required.update(manifest.get('icons', {}).values())
required.update(name for script in manifest.get('content_scripts', []) for name in script.get('js', []))
queue = list(required)
while queue:
    relative = queue.pop()
    source = (extension / relative).resolve()
    if not source.is_relative_to(extension.resolve()):
        raise ValueError('Runtime reference escapes extension: ' + relative)
    if source.suffix not in {'.js', '.css', '.html', '.json'}:
        continue
    body = source.read_text(encoding='utf-8')
    refs = []
    if source.suffix == '.js':
        refs = re.findall(r"(?:from\s*|import\s*)['\"](\.[^'\"]+)['\"]", body)
    elif source.suffix == '.html':
        refs = re.findall(r"<(?:script|link)\b[^>]*(?:src|href)=['\"]([^'\"]+)['\"]", body)
    elif source.suffix == '.css':
        refs = re.findall(r"url\(['\"]?([^)'\"]+)['\"]?\)", body)
    for ref in refs:
        if ':' in ref or ref.startswith('/'):
            raise ValueError('External runtime resource: ' + ref)
        child = (source.parent / ref).resolve()
        if not child.is_relative_to(extension.resolve()):
            raise ValueError('Runtime reference escapes extension: ' + ref)
        reference_name = child.relative_to(extension.resolve()).as_posix()
        if reference_name not in required:
            required.add(reference_name)
            queue.append(reference_name)
files = [('extension/' + reference_name, (extension / reference_name).read_bytes()) for reference_name in sorted(required)]
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
files.append(('PACKAGE-CONTENTS.sha256', ''.join(hashlib.sha256(data).hexdigest() + '  ' + relative + '\n' for relative, data in files).encode()))
buffer = io.BytesIO()
with ZipFile(buffer, 'w', compression=ZIP_DEFLATED, compresslevel=9) as archive:
    for relative, data in files:
        info = ZipInfo(f'{name}/{relative}', date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, data, compresslevel=9)
payload = buffer.getvalue()
try:
    committed = subprocess.check_output(['git', 'show', 'HEAD:' + target.relative_to(root).as_posix()], cwd=root, stderr=subprocess.DEVNULL)
except (FileNotFoundError, subprocess.CalledProcessError):
    committed = None
if committed is not None and committed != payload:
    raise ValueError('Refusing to replace a committed version archive; bump package.json version first')
target.write_bytes(payload)
print(target.relative_to(root))
