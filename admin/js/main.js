// Saving, the theme button, ↑ ↓ between boxes, the collapsible panels, growing textareas, and loading entries.json.

import {
    clean, cleanedFresh, current, dirty, entries, forgetAll, preview, SERVED, setCurrent, setDirty, setEntries,
    setStatus, statusEl,
} from './core.js';
import { clearAutoMarks } from './fields.js';
import { WORD_SHAPE } from './editor-common.js';
import { sortConjugation } from './tenses.js';
import { draw, formEl, renderList } from './form-list.js';
import { buildBook } from './book.js';

// ---------- save ----------
const saveBtn = document.getElementById('save');
// An entry with nothing in it yet: no word for a Fjalor entry, no title and no text for a blog post.
// Such entries are dropped when saving, unless they are open (then the save check names what is missing).
const isBlank = (e) => {
    const c = clean(e, null, true);
    if (c.type === 'fjale') return WORD_SHAPE[c.sub] === 'words' ? !(c.words || []).some((w) => w.word || w.std) : !c.word;
    if (c.type === 'blog') return !c.title && !c.body;
    return false;
};
const dropBlankEntries = () => {
    const open = entries[current];
    const kept = entries.filter((e) => e === open || !isBlank(e));
    const dropped = entries.length - kept.length;
    if (dropped) { setEntries(kept); setCurrent(kept.indexOf(open)); renderList(); }
    return dropped;
};

const save = async () => {
    if (!SERVED) return setStatus('Hape me: python3 serve.py', 'err');
    saveBtn.disabled = true;
    entries.forEach((e) => { if (e.sub === 'folje') (e.words || []).forEach(sortConjugation); });
    forgetAll();   // the sort changed verbs without going through changed()
    if (entries[current] && entries[current].sub === 'folje') { const y = formEl.scrollTop; draw(); formEl.scrollTop = y; }
    const dropped = dropBlankEntries();
    try {
        const r = await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Token': TOKEN },
            body: JSON.stringify(cleanedFresh()),
        });
        const res = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(res.error || r.status);
        setDirty(false);
        clearAutoMarks();
        formEl.querySelectorAll('textarea.auto').forEach((t) => t.classList.remove('auto'));
        const time = new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' });
        setStatus(`Ruajtur, ${time}${dropped ? ` (u hoq${dropped > 1 ? `ën ${dropped}` : ' 1'} hyrje bosh)` : ''}`, 'ok');
    } catch (err) {
        setStatus('Nuk u ruajt: ' + err.message, 'err');
    } finally {
        saveBtn.disabled = false;
    }
};
saveBtn.addEventListener('click', save);
window.addEventListener('keydown', (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') { ev.preventDefault(); save(); }
});
window.addEventListener('beforeunload', (ev) => { if (dirty) { ev.preventDefault(); ev.returnValue = ''; } });

// ---------- the static book (docs/libri/) ----------
// Built from the saved entries, so it matches the site: with unsaved changes it asks to save first.
const bookBtn = document.getElementById('book');
const rebuildBook = async () => {
    if (!SERVED) return setStatus('Hape me: python3 serve.py', 'err');
    if (dirty) return setStatus('Ruaji ndryshimet së pari: libri bëhet nga hyrjet e ruajtura.', 'err');
    bookBtn.disabled = true;
    setStatus('Po bëhet libri…');
    try {
        const files = buildBook(cleanedFresh());
        const r = await fetch('/api/book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Token': TOKEN },
            body: JSON.stringify(files),
        });
        const res = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(res.error || r.status);
        setStatus(`Libri u rigjenerua: ${res.pages} faqe në docs/libri/`, 'ok');
    } catch (err) {
        setStatus('Libri nuk u bë: ' + err.message, 'err');
    } finally {
        bookBtn.disabled = false;
    }
};
bookBtn.addEventListener('click', rebuildBook);

// ---------- theme ----------
const themeBtn = document.getElementById('theme');
const themeLabel = () => { themeBtn.textContent = document.documentElement.dataset.theme === 'light' ? '☾' : '☀'; };
themeLabel();
themeBtn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('shqipollog-theme', next); } catch (err) {}
    themeLabel();
    preview();
});

// ---------- ↑ ↓ move between boxes ----------
// In a table: the box above or below in the same column. Elsewhere: the previous or next text box.
// In a box with several lines, the arrows move inside it until the first or last line.
const FIELDS = 'input[type="text"], input:not([type]), textarea';
formEl.addEventListener('keydown', (ev) => {
    if ((ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') || ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
    const field = ev.target;
    if (!field.matches(FIELDS)) return;
    const up = ev.key === 'ArrowUp';
    if (field.tagName === 'TEXTAREA') {
        const before = field.value.slice(0, field.selectionStart);
        const after = field.value.slice(field.selectionEnd);
        if (up ? before.includes('\n') : after.includes('\n')) return;
    }
    let next = null;
    const td = field.closest('td');
    if (td && td.closest('.grid')) {
        const tr = td.parentElement;
        const col = [...tr.children].indexOf(td);
        let row = up ? tr.previousElementSibling : tr.nextElementSibling;
        while (row && !next) {
            next = row.children[col] && row.children[col].querySelector(FIELDS);
            row = up ? row.previousElementSibling : row.nextElementSibling;
        }
    } else {
        const all = [...formEl.querySelectorAll(FIELDS)].filter((x) => !x.closest('.grid') && x.offsetParent);
        next = all[all.indexOf(field) + (up ? -1 : 1)];
    }
    if (!next) return;
    ev.preventDefault();
    next.focus();
    const end = next.value.length;
    next.setSelectionRange(end, end);
});

// ---------- collapsible panels ----------
// The list (left) and the right panel close to a thin rail; inside the right panel, the preview and the JSON fold on their own.
// Remembered per browser; the page works the same without it.
const PANES_KEY = 'shqipollog-admin-panes';
const appEl = document.querySelector('.app'), prevEl = document.querySelector('.prev');
let panes = {};
try { panes = JSON.parse(localStorage.getItem(PANES_KEY)) || {}; } catch (err) { panes = {}; }
const applyPanes = () => {
    appEl.classList.toggle('list-closed', !!panes.list);
    appEl.classList.toggle('prev-closed', !!panes.prev);
    ['preview', 'json'].forEach((f) => {
        prevEl.classList.toggle('fold-' + f, !!panes[f]);
        const b = prevEl.querySelector(`[data-fold="${f}"]`);
        if (b) b.setAttribute('aria-expanded', String(!panes[f]));
    });
    try { localStorage.setItem(PANES_KEY, JSON.stringify(panes)); } catch (err) { /* not remembered */ }
};
const flip = (name) => {
    panes[name] = !panes[name];
    applyPanes();
};
document.querySelectorAll('[data-pane]').forEach((b) => b.addEventListener('click', () => flip(b.dataset.pane)));
document.querySelectorAll('[data-fold]').forEach((b) => b.addEventListener('click', () => flip(b.dataset.fold)));
applyPanes();

// ---------- textareas grow with their text ----------
const grow = (t) => { t.style.height = 'auto'; t.style.height = t.scrollHeight + 2 + 'px'; };
document.addEventListener('input', (ev) => { if (ev.target.tagName === 'TEXTAREA') grow(ev.target); });
new MutationObserver(() => requestAnimationFrame(() => formEl.querySelectorAll('textarea').forEach(grow)))
    .observe(formEl, { childList: true, subtree: true });

// ---------- start ----------
if (!SERVED) {
    saveBtn.disabled = true;
    bookBtn.disabled = true;
    setStatus('Vetëm lokalisht: hape me python3 serve.py', 'err');
}
fetch('/entries.json', { cache: 'no-store' })
    .then((r) => r.json())
    .then((list) => {
        setEntries(list);
        if (SERVED) setStatus(`${list.length} hyrje`);
        else setStatus(statusEl.textContent, 'err');
        renderList();
        draw();
    })
    .catch((err) => setStatus('Nuk u lexua entries.json: ' + err.message, 'err'));
