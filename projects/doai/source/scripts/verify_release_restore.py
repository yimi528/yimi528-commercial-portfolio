"""Restore a release from its exact Git base and verify it offline/local-only."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import subprocess
import tarfile
import tempfile
import time

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('archive', type=Path)
parser.add_argument('--backend', type=Path, default=Path(__file__).resolve().parents[2] / 'atomesh-network-fix/atomhub-api')
parser.add_argument('--output', type=Path, default=Path('/tmp/doai-release-restore-report.json'))
parser.add_argument('--mysql', action='store_true', help='Also run the isolated temporary MySQL service verification')
args = parser.parse_args()
frontend = Path(__file__).resolve().parents[1]
stage = Path(tempfile.mkdtemp(prefix='doai-restored-candidate-', dir='/tmp'))
report = {'archive': str(args.archive.resolve()), 'archiveSha256': hashlib.sha256(args.archive.read_bytes()).hexdigest(), 'stage': str(stage), 'commands': [], 'productionWrites': False, 'success': False}
env = {**os.environ, 'DATABASE_URL': 'mysql://unused:unused@127.0.0.1:1/unused', 'AUTH_DATABASE_URL': 'mysql://unused:unused@127.0.0.1:1/unused', 'DOAI_ADMIN_USER_IDS': '', 'FORCE_COLOR': '0'}

def run(command, cwd=stage, extra=None):
    started = time.time()
    result = subprocess.run(command, cwd=cwd, env={**env, **(extra or {})}, capture_output=True, text=True)
    log = stage / ('check-%02d.log' % (len(report['commands']) + 1))
    log.write_text(result.stdout + result.stderr)
    report['commands'].append({'command': command, 'exitCode': result.returncode, 'seconds': round(time.time() - started, 2), 'log': str(log)})
    print(('PASS: ' if result.returncode == 0 else 'FAIL: ') + shlex.join(command), flush=True)
    if result.returncode:
        raise RuntimeError('Command failed; inspect ' + str(log))
    return result.stdout

def extract_regular(archive, destination):
    for member in archive.getmembers():
        path = Path(member.name)
        if path.is_absolute() or '..' in path.parts or not (member.isdir() or member.isfile()):
            raise RuntimeError('Unsupported archive entry: ' + member.name)
        target = destination / path
        if member.isdir():
            target.mkdir(parents=True, exist_ok=True)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(archive.extractfile(member).read())
            target.chmod(member.mode)

try:
    release = stage / 'release'
    release.mkdir()
    with tarfile.open(args.archive, 'r:gz') as archive:
        extract_regular(archive, release)
    manifest = json.loads((release / 'manifest.json').read_text())
    if not re.fullmatch(r'[a-f0-9]{40}', manifest['backendPatchBase']):
        raise RuntimeError('Release must identify an exact Git SHA-1 base revision')
    report['baseRevision'] = manifest['backendPatchBase']
    expected = {row['path'] for row in manifest['files']} | {'manifest.json'}
    actual = {str(path.relative_to(release)) for path in release.rglob('*') if path.is_file()}
    if actual != expected:
        raise RuntimeError('Release inventory differs from manifest')
    for record in manifest['files']:
        content = (release / record['path']).read_bytes()
        if len(content) != record['bytes'] or hashlib.sha256(content).hexdigest() != record['sha256']:
            raise RuntimeError('Release checksum mismatch: ' + record['path'])
    report['verifiedFiles'] = len(manifest['files'])
    backend = stage / 'backend'
    backend.mkdir()
    base = subprocess.run(['git', '-C', str(args.backend.resolve()), 'archive', manifest['backendPatchBase']], check=True, capture_output=True).stdout
    with tarfile.open(fileobj=io.BytesIO(base)) as archive:
        extract_regular(archive, backend)
    patch = release / 'backend/doai-backend-fixes.patch'
    run(['git', 'apply', '--check', str(patch)], backend)
    run(['git', 'apply', str(patch)], backend)
    if (backend / 'docs/doai-release.md').read_bytes() != (release / 'backend/doai-release.md').read_bytes():
        raise RuntimeError('Packaged backend instructions do not match the patch')
    for migration in manifest['migrationOrder']:
        packaged = release / migration['path']
        if (backend / 'prisma/migrations/sql' / packaged.name).read_bytes() != packaged.read_bytes():
            raise RuntimeError('Packaged SQL differs from restored repository: ' + packaged.name)
    dependency_source = args.backend.resolve() / 'node_modules'
    if not dependency_source.is_dir():
        raise RuntimeError('Install backend lockfile dependencies before restoring the release')
    dependency_target = backend / 'node_modules'
    cloned = False
    if os.uname().sysname == 'Darwin':
        cloned = subprocess.run(['cp', '-cR', str(dependency_source), str(dependency_target)], capture_output=True).returncode == 0
        if not cloned and dependency_target.exists():
            shutil.rmtree(dependency_target)
    if not cloned:
        shutil.copytree(dependency_source, dependency_target, symlinks=True)
    report['dependencies'] = 'Copy of installed lockfile dependency tree; both Prisma clients regenerated inside restored checkout'
    run(['npx', '--no-install', 'prisma', 'generate'], backend)
    run(['npx', '--no-install', 'prisma', 'generate', '--schema', 'prisma/auth-schema.prisma'], backend)
    run(['npm', 'test', '--', '--runInBand'], backend)
    run(['npm', 'run', 'build'], backend)
    startup = json.loads((backend / 'package.json').read_text())['scripts']['start:prod']
    if manifest.get('backendStartCommand') and startup != manifest['backendStartCommand']:
        raise RuntimeError('Restored startup command differs from the release manifest')
    parts = shlex.split(startup)
    if len(parts) != 2 or parts[0] != 'node':
        raise RuntimeError('Inspect unsupported production startup command: ' + startup)
    entry = backend / parts[1]
    if not entry.is_file() and entry.suffix == '':
        entry = entry.with_suffix('.js')
    if not entry.is_file():
        raise RuntimeError('Production startup entry does not exist after build: ' + startup)
    run(['node', '--check', str(entry)], backend)
    report['productionStartCommand'] = startup
    report['startupScope'] = 'Generated entry file and JavaScript syntax verified; production bootstrap was not executed'
    if args.mysql:
        run(['node', 'scripts/verify_social_mysql.mjs'], frontend, {'DOAI_BACKEND_DIR': str(backend)})
    report['success'] = True
except Exception as error:
    report['error'] = str(error)
finally:
    report['completedAt'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'success': report['success'], 'report': str(args.output), 'stage': str(stage), 'error': report.get('error')}, ensure_ascii=False), flush=True)
if not report['success']:
    raise SystemExit(1)
