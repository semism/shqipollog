#!/usr/bin/env python3
"""Local editor for shqipollog.

    python3 serve.py            then open http://127.0.0.1:8792/admin/

Serves docs/ (the site) and admin/ (the editor) on 127.0.0.1 only.
Saves go to docs/entries.json; the previous version is kept as entries.bak.json (outside docs/, so never published).
Recordings from the admin go to docs/audio/ (as .mp3 when ffmpeg is installed, so every browser can play them);
a save deletes the ones it stops pointing to (never a clip that was recorded but not saved yet).
GitHub Pages publishes only docs/; the editor itself is never online.
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
# the admin's own files: admin/admin.css and the scripts in admin/js/ (nothing else under admin/ is served)
ADMIN_FILE = re.compile(r'^/admin/(admin\.css|js/[a-z0-9-]+\.js)$')
ADMIN_TYPES = {'.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8'}
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
CUT_START = 'silenceremove=start_periods=1:start_threshold=-45dB'
TRIM = ','.join([CUT_START, 'areverse', CUT_START, 'areverse', 'loudnorm'])   # cut the start, flip, cut the (old) end, flip back
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


SUBS = {'folje', 'emra', 'mbiemra', 'ndajfolje'}
TEXT_LISTS = ('meaning', 'examples', 'etymology', 'footnotes', 'text', 'intro', 'adverbKinds')


def is_text(v):
    return isinstance(v, str) and v.strip() != ''


def is_text_list(v):
    return isinstance(v, list) and all(isinstance(x, str) for x in v)


def is_declension(v):
    """{ njejes/shumes: { pashquar/shquar: { case: "form" } } }"""
    if not isinstance(v, dict):
        return False
    for number in v.values():
        if not isinstance(number, dict):
            return False
        for definiteness in number.values():
            if not isinstance(definiteness, dict) or not all(isinstance(form, str) for form in definiteness.values()):
                return False
    return True


def name_of(e, i):
    """How an entry is called in an error message: its word(s) or title, else its position."""
    words = [w.get('word') or w.get('std') for w in e.get('words') or [] if isinstance(w, dict)]
    return e.get('word') or ', '.join(filter(None, words)) or e.get('title') or f'hyrja nr. {i + 1}'


def word_problem(w, sub):
    """A word on a folje or mbiemra card."""
    if not isinstance(w, dict):
        return 'një fjalë nuk është objekt'
    if not (is_text(w.get('word')) or is_text(w.get('std'))):
        return 'një fjalë nuk ka as word as std'
    if sub == 'folje':
        conjugation = w.get('conjugation', [])
        if not isinstance(conjugation, list):
            return 'conjugation duhet të jetë listë'
        for tense_mood in conjugation:
            has_both = isinstance(tense_mood, dict) and is_text(tense_mood.get('tense')) and is_text(tense_mood.get('mood'))
            if not has_both:
                return 'çdo kohë te conjugation duhet të ketë tense dhe mood'
    if sub == 'mbiemra':
        for number in ('njejes', 'shumes'):
            if not isinstance(w.get(number, {}), dict):
                return f'{number} duhet të jetë objekt'
        variants = w.get('variants', [])
        if not isinstance(variants, list) or not all(isinstance(v, dict) for v in variants):
            return 'variantet e mbiemrit duhet të jenë objekte'
    return None


def entry_problem(e):
    """What is wrong with one entry, in words the admin can show; None if nothing."""
    if e.get('type') not in TYPES:
        return f'type duhet të jetë një nga {", ".join(sorted(TYPES))}'
    if not isinstance(e.get('date'), str) or not DATE.match(e['date']):
        return 'data duhet të jetë VVVV-MM-DD'
    for key in TEXT_LISTS:
        if key in e and not is_text_list(e[key]):
            return f'{key} duhet të jetë listë tekstesh'
    if e['type'] == 'fjale':
        sub = e.get('sub')
        if sub not in SUBS:
            return f'sub duhet të jetë një nga {", ".join(sorted(SUBS))}'
        if sub in ('folje', 'mbiemra'):
            words = e.get('words')
            if not isinstance(words, list) or not words:
                return 'mungon fjala (words është bosh)'
            for w in words:
                problem = word_problem(w, sub)
                if problem:
                    return problem
        else:
            if not is_text(e.get('word')):
                return 'mungon fjala'
            if 'variants' in e and not is_text_list(e['variants']):
                return 'variants duhet të jetë listë tekstesh'
        if sub == 'emra' and 'declension' in e and not is_declension(e['declension']):
            return 'declension duhet të jetë { njejes/shumes: { pashquar/shquar: { rasa: "forma" } } }'
    if e['type'] == 'blog':
        if not is_text(e.get('title')):
            return 'mungon titulli'
        if not isinstance(e.get('body', []), list):
            return 'body duhet të jetë listë'
    return None


def check(entries):
    if not isinstance(entries, list):
        return 'entries must be a list'
    for i, e in enumerate(entries):
        if not isinstance(e, dict):
            return f'hyrja nr. {i + 1} nuk është objekt'
        problem = entry_problem(e)
        if problem:
            return f'“{name_of(e, i)}”: {problem}'
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
        # trimmed and evened out (TRIM), mono, 44.1 kHz, 64 kbps
        command = [FFMPEG, '-y', '-loglevel', 'error', '-i', str(raw),
                   '-af', TRIM, '-ac', '1', '-ar', '44100', '-b:a', '64k', str(mp3)]
        r = subprocess.run(command, capture_output=True, timeout=60)
        if r.returncode == 0 and mp3.exists() and mp3.stat().st_size > 0:
            raw.unlink()
            return f'audio/{mp3.name}'
        mp3.unlink(missing_ok=True)
    return f'audio/{raw.name}'


BOOK = DOCS / 'libri'
BOOK_MAX = 64 * 1024 * 1024
BOOK_PAGE = re.compile(r'^[a-z]{1,9}\.html$')   # index.html, a.html, sh.html, gramatike.html…


def write_book(files):
    """The static book (docs/libri/): writes the pages the admin built and removes the ones it no longer has."""
    if not isinstance(files, dict) or 'index.html' not in files:
        return 'the book needs an index.html'
    for name, html in files.items():
        if not BOOK_PAGE.match(name) or not isinstance(html, str):
            return f'not a book page: {name!r}'
    BOOK.mkdir(exist_ok=True)
    for old in BOOK.glob('*.html'):
        if old.name not in files:
            old.unlink()
    for name, html in files.items():
        tmp = BOOK / (name + '.tmp')
        tmp.write_text(html, encoding='utf-8')
        tmp.replace(BOOK / name)
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
        if ADMIN_FILE.match(path):
            f = ADMIN.parent / path[len('/admin/'):]
            if f.is_file():
                return self.reply(200, f.read_text(encoding='utf-8'), ADMIN_TYPES[f.suffix])
        if path.startswith('/admin'):
            return self.reply(404, '{"error":"not found"}')
        return super().do_GET()

    def do_POST(self):
        if self.path not in ('/api/save', '/api/audio', '/api/book'):
            return self.reply(404, '{"error":"not found"}')
        origin = self.headers.get('Origin')
        if not self.local_host() or (origin and origin not in (f'http://{HOST}:{PORT}', f'http://localhost:{PORT}')):
            return self.reply(403, '{"error":"origin"}')
        if not secrets.compare_digest(self.headers.get('X-Token', ''), TOKEN):
            return self.reply(403, '{"error":"token"}')
        if self.path == '/api/book':
            n = int(self.headers.get('Content-Length', 0))
            if not 0 < n <= BOOK_MAX:
                return self.reply(400, '{"error":"size"}')
            try:
                files = json.loads(self.rfile.read(n).decode('utf-8'))
            except (ValueError, UnicodeDecodeError) as err:
                return self.reply(400, json.dumps({'error': f'bad json: {err}'}))
            problem = write_book(files)
            if problem:
                return self.reply(400, json.dumps({'error': problem}, ensure_ascii=False))
            return self.reply(200, json.dumps({'ok': True, 'pages': len(files)}))
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
