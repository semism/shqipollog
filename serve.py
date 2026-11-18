#!/usr/bin/env python3
"""Local editor for shqipollog.

    python3 serve.py            then open http://127.0.0.1:8792/admin/

Serves docs/ (the site) and admin/ (the editor) on 127.0.0.1 only.
Saves go to docs/entries.json; the previous version is kept as entries.bak.json (outside docs/, so never published).
GitHub Pages publishes only docs/, so none of this is online.
"""

import json
import re
import secrets
import shutil
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DOCS = ROOT / 'docs'
ADMIN = ROOT / 'admin' / 'index.html'
DATA = DOCS / 'entries.json'
BACKUP = ROOT / 'entries.bak.json'
HOST = '127.0.0.1'
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8792
TOKEN = secrets.token_urlsafe(32)
TYPES = {'fjale', 'gramatike', 'blog'}
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
        if path.startswith('/admin'):
            return self.reply(404, '{"error":"not found"}')
        return super().do_GET()

    def do_POST(self):
        if self.path != '/api/save':
            return self.reply(404, '{"error":"not found"}')
        origin = self.headers.get('Origin')
        if not self.local_host() or (origin and origin not in (f'http://{HOST}:{PORT}', f'http://localhost:{PORT}')):
            return self.reply(403, '{"error":"origin"}')
        if not secrets.compare_digest(self.headers.get('X-Token', ''), TOKEN):
            return self.reply(403, '{"error":"token"}')
        try:
            n = int(self.headers.get('Content-Length', 0))
            entries = json.loads(self.rfile.read(n).decode('utf-8'))
        except (ValueError, UnicodeDecodeError) as err:
            return self.reply(400, json.dumps({'error': f'bad json: {err}'}))
        problem = check(entries)
        if problem:
            return self.reply(400, json.dumps({'error': problem}, ensure_ascii=False))
        write(entries)
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
