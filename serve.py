#!/usr/bin/env python3
"""Local editor for shqipollog.

    python3 serve.py            then open http://127.0.0.1:8792/admin/

Serves docs/ (the site) and admin/ (the editor) on 127.0.0.1 only.
Saves go to docs/entries.json; the previous version is kept as entries.bak.json (outside docs/, so never published).
Recordings from the admin go to docs/audio/ (as .mp3 when ffmpeg is installed, so every browser can play them);
a save deletes the ones it stops pointing to (never a clip that was recorded but not saved yet). GitHub Pages publishes only docs/; the editor itself is never online.
"""

import json
import re
import secrets
import shutil
import subprocess
import sys
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DOCS = ROOT / 'docs'
ADMIN = ROOT / 'admin' / 'index.html'
ADMIN_FILES = {'/admin/admin.css': ('admin.css', 'text/css; charset=utf-8'), '/admin/admin.js': ('admin.js', 'text/javascript; charset=utf-8')}
DATA = DOCS / 'entries.json'
BACKUP = ROOT / 'entries.bak.json'
HOST = '127.0.0.1'
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8792
TOKEN = secrets.token_urlsafe(32)
TYPES = {'fjale', 'gramatike', 'blog'}
AUDIO = DOCS / 'audio'
AUDIO_TYPES = {'audio/webm': '.webm', 'audio/ogg': '.ogg', 'audio/mp4': '.m4a', 'audio/mpeg': '.mp3', 'audio/wav': '.wav'}
AUDIO_MAX = 8 * 1024 * 1024
FFMPEG = shutil.which('ffmpeg')
# trim silence at both ends, then even out the loudness
TRIM = 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm'
DATE = re.compile(r'^\d{4}-\d{2}-\d{2}$')
WIDTH = 120


def dump(v, ind=0):
    """JSON with short objects and lists kept on one line, so the file stays readable."""
    one = json.dumps(v, ensure_ascii=False, separators=(', ', ': '))
    if not isinstance(v, (dict, list)) or not v or ind + len(one) <= WIDTH:
        return one
    pad = ' ' * (ind + 4)
    if isinstance(v, list):
        items = [pad + dump(x, ind + 4) for x in v]
        return '[\n' + ',\n'.join(items) + '\n' + ' ' * ind + ']'
    items = [pad + json.dumps(k, ensure_ascii=False) + ': ' + dump(x, ind + 4) for k, x in v.items()]
    return '{\n' + ',\n'.join(items) + '\n' + ' ' * ind + '}'


def check(entries):
    if not isinstance(entries, list):
        return 'entries must be a list'
    for i, e in enumerate(entries):
        if not isinstance(e, dict):
            return f'entry {i} is not an object'
        if e.get('type') not in TYPES:
            return f'entry {i}: type must be one of {sorted(TYPES)}'
        if not isinstance(e.get('date'), str) or not DATE.match(e['date']):
            return f'entry {i}: date must be YYYY-MM-DD'
    return None


def audio_refs(v, out):
    """Every recording the entries point to: "audio" values and the values of "audios" maps."""
    if isinstance(v, dict):
        for k, x in v.items():
            if k == 'audio' and isinstance(x, str):
                out.add(x)
            elif k == 'audios' and isinstance(x, dict):
                out.update(p for p in x.values() if isinstance(p, str))
            else:
                audio_refs(x, out)
    elif isinstance(v, list):
        for x in v:
            audio_refs(x, out)
    return out


def sweep_audio(before, entries):
    """Delete the recordings this save stopped using (re-recorded or removed): the ones the previous entries.json pointed to
    and the new one doesn't. Files no saved version ever pointed to (recorded but not saved yet) are never touched."""
    for p in before - audio_refs(entries, set()):
        f = DOCS / p
        if p.startswith('audio/') and f.parent == AUDIO and f.is_file():
            f.unlink()


def save_audio(data, ctype, name):
    """Store one recording; returns its path relative to docs/ (what the entry's "audio" holds)."""
    ext = AUDIO_TYPES.get(ctype.split(';')[0].strip())
    if not ext:
        raise ValueError(f'audio type {ctype!r}')
    stem = (re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')[:40] or 'fjale') + '-' + format(int(time.time() * 1000), 'x')
    AUDIO.mkdir(exist_ok=True)
    raw = AUDIO / (stem + ext)
    raw.write_bytes(data)
    if FFMPEG and ext != '.mp3':
        mp3 = AUDIO / (stem + '.mp3')
        r = subprocess.run([FFMPEG, '-y', '-loglevel', 'error', '-i', str(raw), '-af', TRIM, '-ac', '1', '-ar', '44100', '-b:a', '64k', str(mp3)],
                           capture_output=True, timeout=60)
        if r.returncode == 0 and mp3.exists() and mp3.stat().st_size > 0:
            raw.unlink()
            return f'audio/{mp3.name}'
        mp3.unlink(missing_ok=True)
    return f'audio/{raw.name}'


def write(entries):
    if DATA.exists():
        shutil.copyfile(DATA, BACKUP)
    tmp = DATA.with_suffix('.tmp')
    tmp.write_text(dump(entries) + '\n', encoding='utf-8')
    tmp.replace(DATA)


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def local_host(self):
        return self.headers.get('Host', '') in (f'{HOST}:{PORT}', f'localhost:{PORT}')

    def reply(self, code, body, ctype='application/json; charset=utf-8'):
        data = body.encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if not self.local_host():
            return self.reply(403, '{"error":"host"}')
        path = self.path.split('?')[0]
        if path in ('/admin', '/admin/', '/admin/index.html'):
            html = ADMIN.read_text(encoding='utf-8').replace('__TOKEN__', TOKEN)
            return self.reply(200, html, 'text/html; charset=utf-8')
        if path in ADMIN_FILES:
            name, ctype = ADMIN_FILES[path]
            return self.reply(200, (ADMIN.parent / name).read_text(encoding='utf-8'), ctype)
        if path.startswith('/admin'):
            return self.reply(404, '{"error":"not found"}')
        return super().do_GET()

    def do_POST(self):
        if self.path not in ('/api/save', '/api/audio'):
            return self.reply(404, '{"error":"not found"}')
        origin = self.headers.get('Origin')
        if not self.local_host() or (origin and origin not in (f'http://{HOST}:{PORT}', f'http://localhost:{PORT}')):
            return self.reply(403, '{"error":"origin"}')
        if not secrets.compare_digest(self.headers.get('X-Token', ''), TOKEN):
            return self.reply(403, '{"error":"token"}')
        if self.path == '/api/audio':
            n = int(self.headers.get('Content-Length', 0))
            if not 0 < n <= AUDIO_MAX:
                return self.reply(400, '{"error":"size"}')
            try:
                path = save_audio(self.rfile.read(n), self.headers.get('Content-Type', ''), self.headers.get('X-Name', ''))
            except (ValueError, OSError, subprocess.SubprocessError) as err:
                return self.reply(400, json.dumps({'error': str(err)}))
            return self.reply(200, json.dumps({'ok': True, 'path': path}))
        try:
            n = int(self.headers.get('Content-Length', 0))
            entries = json.loads(self.rfile.read(n).decode('utf-8'))
        except (ValueError, UnicodeDecodeError) as err:
            return self.reply(400, json.dumps({'error': f'bad json: {err}'}))
        problem = check(entries)
        if problem:
            return self.reply(400, json.dumps({'error': problem}, ensure_ascii=False))
        try:
            before = audio_refs(json.loads(DATA.read_text(encoding='utf-8')), set())
        except (OSError, ValueError):
            before = set()
        write(entries)
        sweep_audio(before, entries)
        return self.reply(200, json.dumps({'ok': True, 'count': len(entries)}))

    def log_message(self, fmt, *args):
        if self.command == 'POST':
            super().log_message(fmt, *args)


if __name__ == '__main__':
    server = ThreadingHTTPServer((HOST, PORT), partial(Handler, directory=str(DOCS)))
    print(f'shqipollog admin: http://{HOST}:{PORT}/admin/   (Ctrl+C to stop)')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print()
