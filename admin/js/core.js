// The admin's shared pieces: settings from taxonomy.js, the open state (entries, current, dirty, filter), the el() DOM helper,
// cleaning an entry for saving, titles, the status line, the preview, and changed()/set(), which every edit goes through.
// changed() also refreshes the list line (form-list.js) and the JSON panel (json-panel.js).

import { TAXONOMY } from '/taxonomy.js';
import { SHARED } from '/shared.js';
import { renderJson } from './json-panel.js';
import { headOf, refreshListItem } from './form-list.js';

export const SERVED = !TOKEN.startsWith('__');

const ITEMS = TAXONOMY.grammarMenu.flatMap((g) => g.items.map((x) => ({ ...x, group: g.label })));
export const PRONOUNS = ITEMS.filter((x) => x.group === 'Përemra').map((x) => x.id);
const LABEL = Object.fromEntries([...TAXONOMY.dictionaryCategories, ...TAXONOMY.blog, ...ITEMS].map((x) => [x.id, x.label]));
export const { PERSON_KEYS: PERSONS, PERSON_LABEL: PLABEL, CASES, asList, day, personsOf } = SHARED;
// the order keys are written in, in entries.json
const ORDER = [
    'id', 'type', 'sub', 'cat', 'tense', 'mood', 'pronoun', 'case', 'date', 'place', 'draft', 'review', 'title',
    'word', 'gender', 'adverbKinds', 'pos', 'std', 'panyjshem', 'pronunciation', 'audio', 'audios', 'video', 'intro', 'meaning',
    ...PERSONS, 'm', 'f', 'njejes', 'shumes', 'pashquar', 'shquar', ...CASES.map((c) => c[0]),
    'participle', 'participleReview', 'variants', 'variantsNote', 'declension', 'words', 'conjugation',
    'examples', 'etymology', 'footnotes', 'text', 'body',
];
// true/false flags that are left out of the file when false
const REVIEW_KEYS = ['draft', 'review', 'participleReview'];
// filled in without a speaker's check yet: a tense with review: true, or a verb with participleReview: true
export const needsReview = (e) => (e.words || []).some((w) => {
    return w.participleReview || (w.conjugation || []).some((tenseMood) => tenseMood.review);
});
export const reviewBox = (obj, key) => {
    const toggle = (ev) => {
        if (ev.target.checked) obj[key] = true;
        else delete obj[key];
        changed();
    };
    const title = 'Format u mbushën pa u kontrolluar nga një folës. Hiqe kur t’i kesh kontrolluar.';
    return el('label', { class: 'check review', title }, el('input', { type: 'checkbox', checked: !!obj[key], onchange: toggle }), 'pret rishikim');
};
export const today = () => new Date().toLocaleDateString('sv');
export const { norm } = SHARED;

export let entries = [];
export const setEntries = (value) => { entries = value; };
export let current = -1;
export const setCurrent = (value) => { current = value; };
export let dirty = false;
export const setDirty = (value) => { dirty = value; };
export let filter = 'all';
export const setFilter = (value) => { filter = value; };

// ---------- small DOM helper ----------
export const el = (tag, attrs = {}, ...kids) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (v === undefined || v === null || v === false) continue;
        if (k === 'class') node.className = v;
        else if (k === 'value') node.value = v;
        else if (k === 'checked') node.checked = !!v;
        else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat(Infinity)) {
        if (kid === null || kid === undefined || kid === false) continue;
        node.append(kid.nodeType ? kid : document.createTextNode(kid));
    }
    return node;
};

// ---------- data cleanup (for save and preview) ----------
const order = (o) => {
    const keys = Object.keys(o);
    // a blog post's `sub` is its subtitle: right after the title. Keys not in ORDER keep their order, at the end.
    const rank = (k) => {
        const subtitle = k === 'sub' && o.type === 'blog';
        const i = subtitle ? ORDER.indexOf('title') + 0.5 : ORDER.indexOf(k);
        return i < 0 ? ORDER.length + keys.indexOf(k) : i;
    };
    return Object.fromEntries(keys.sort((a, b) => rank(a) - rank(b)).map((k) => [k, o[k]]));
};
export const clean = (v, key, top) => {
    if (typeof v === 'string') {
        const trimmed = v.trim();
        return trimmed === '' ? undefined : trimmed;
    }
    if (typeof v === 'boolean') return REVIEW_KEYS.includes(key) && !v ? undefined : v;
    if (Array.isArray(v)) {
        const out = v.map((x) => clean(x, key)).filter((x) => x !== undefined);
        return out.length ? out : undefined;
    }
    if (v && typeof v === 'object') {
        const out = {};
        for (const [k, x] of Object.entries(v)) {
            const c = clean(x, k);
            if (c !== undefined) out[k] = c;
        }
        return Object.keys(out).length || top ? order(out) : undefined;
    }
    return v;
};
// for the preview, each entry is cleaned once and kept until it changes; saving always cleans everything fresh
const cleaned = () => entries.map((e) => cached(e, 'clean', () => clean(e, null, true)));
export const cleanedFresh = () => entries.map((e) => clean(e, null, true));

// ---------- titles ----------
export const titleOf = (e) => {
    if (e.type === 'gramatike') {
        const which = e.mood || e.case;
        return `${LABEL[e.tense || e.pronoun] || '(pa kohë)'}${which ? ', ' + which : ''}`;
    }
    if (e.type === 'fjale') {
        if (e.word) return e.word;
        const words = (e.words || []).map((w) => (e.sub === 'mbiemra' ? SHARED.adjHead(w) : w.word)).filter(Boolean);
        return words.join(', ') || '(pa fjalë)';
    }
    return e.title || '(pa titull)';
};
export const kindOf = (e) => {
    if (e.type === 'gramatike') return 'Gramatikë';
    return e.type === 'fjale' ? LABEL[e.sub] : 'Blog, ' + (LABEL[e.cat] || '');
};
export const groupOf = (e) => (e.type === 'fjale' ? e.sub : e.type);

// ---------- status, preview ----------
export const statusEl = document.getElementById('status');
export const setStatus = (text, cls = '') => {
    statusEl.textContent = text;
    statusEl.className = cls;
};
const iframe = document.getElementById('preview');
let previewTimer = 0;
export const preview = () => {
    clearTimeout(previewTimer);
    const reload = () => { iframe.src = '/index.html?preview&t=' + Date.now(); };
    previewTimer = setTimeout(reload, 250);
};
window.addEventListener('message', (m) => {
    if (m.origin !== location.origin || m.source !== iframe.contentWindow || m.data !== 'ready') return;
    const focus = current >= 0 ? current : undefined;
    iframe.contentWindow.postMessage({ entries: cleaned(), focus }, location.origin);
});

// Slow per-entry results (search text, verb progress, recording counts), worked out once and kept until that entry
// changes. Recording counts of every verb depend on the helper verb (kom), so changing kom forgets all of them.
let memo = new WeakMap();
// forget every cached result (after changes that did not go through changed())
export const forgetAll = () => { memo = new WeakMap(); };
export const cached = (e, key, compute) => {
    if (!memo.has(e)) memo.set(e, {});
    const m = memo.get(e);
    if (!(key in m)) m[key] = compute();
    return m[key];
};
const forget = (e) => {
    if (e && (e.words || []).some(SHARED.isHelper)) forgetAll();
    else memo.delete(e);
};

export const changed = () => {
    dirty = true;
    forget(entries[current]);
    setStatus('Ndryshime të paruajtura', 'dirty');
    refreshListItem(current);
    // the title at the top of the form: an editable headword (left alone while typing in it), or plain text
    const t = document.getElementById('title');
    const e = entries[current];
    if (t && e) {
        if (t.tagName !== 'INPUT') t.textContent = titleOf(e);
        else if (document.activeElement !== t) t.value = headOf(e).get();
    }
    preview();
    renderJson();
};
const isNothing = (val) => val === '' || val === undefined || val === null || (Array.isArray(val) && !val.length);
export const set = (obj, key, val) => {
    if (isNothing(val)) delete obj[key];
    else obj[key] = val;
    changed();
};
