// The read-only JSON panel on the right (foldable) and its Kopjo button.

import { clean, current, el, entries } from './core.js';

// JSON panel: the current entry as it will be saved, read-only. Click anywhere on a line with { or [ (or its closing
// bracket) to fold that object or list. Folds stay while the same entry is open; another entry starts unfolded.
const jsonEl = document.getElementById('json');
let jsonFolds = new Set(), jsonEntry = null;
const jsonSpan = (cls, t) => el('span', { class: cls }, t);
// "3 elemente" for a folded list, "2 fusha" for a folded object
const foldedCount = (n, isList) => {
    if (isList) return `${n} ${n === 1 ? 'element' : 'elemente'}`;
    return `${n} ${n === 1 ? 'fushë' : 'fusha'}`;
};
// one value as lines: a plain value is one line; an object or list is its opening line, its items, its closing line
const jsonLines = (key, v, path, depth, last) => {
    const head = key === null ? [] : [jsonSpan('j-key', JSON.stringify(key)), jsonSpan('j-p', ': ')];
    const comma = last ? null : jsonSpan('j-p', ',');
    const style = `padding-left: calc(16px + ${depth * 2}ch)`;
    if (!v || typeof v !== 'object') {
        const value = jsonSpan(typeof v === 'string' ? 'j-str' : 'j-lit', JSON.stringify(v));
        return el('div', { class: 'jl', style }, head, value, comma);
    }
    const isList = Array.isArray(v);
    const items = isList ? v.map((x, i) => [i, x]) : Object.entries(v);
    const [opening, closing] = isList ? '[]' : '{}';
    if (!items.length) return el('div', { class: 'jl', style }, head, jsonSpan('j-p', opening + closing), comma);
    const open = !jsonFolds.has(path);
    const toggle = () => {
        if (open) jsonFolds.add(path);
        else jsonFolds.delete(path);
        renderJson();
    };
    const folded = [jsonSpan('j-more', ` ${foldedCount(items.length, isList)} `), jsonSpan('j-p', closing), comma];
    const first = el('button', { type: 'button', class: 'jl jf', style, 'aria-expanded': String(open), onclick: toggle },
        head, jsonSpan('j-p', opening), open ? null : folded);
    if (!open) return first;
    const children = items.map(([k, x], i) => jsonLines(isList ? null : k, x, `${path}/${k}`, depth + 1, i === items.length - 1));
    const closingLine = el('button', { type: 'button', class: 'jl jc', style, tabindex: '-1', onclick: toggle }, jsonSpan('j-p', closing), comma);
    return [first, children, closingLine];
};
// Kopjo: the whole entry's JSON (folds don't matter), as it will be saved
const copyBtn = document.getElementById('json-copy');
copyBtn.addEventListener('click', async () => {
    if (!entries[current]) return;
    try {
        await navigator.clipboard.writeText(JSON.stringify(clean(entries[current], null, true), null, 2));
        copyBtn.textContent = 'U kopjua';
    } catch (err) { copyBtn.textContent = 'Nuk u kopjua'; }
    setTimeout(() => { copyBtn.textContent = 'Kopjo'; }, 1500);
});
export const renderJson = () => {
    const e = entries[current] || null;
    copyBtn.disabled = !e;
    if (e !== jsonEntry) {
        jsonFolds = new Set();
        jsonEntry = e;
    }
    const y = jsonEl.scrollTop;
    const lines = e ? [jsonLines(null, clean(e, null, true), '', 0, true)].flat(Infinity) : [];
    jsonEl.replaceChildren(...lines);
    jsonEl.scrollTop = y;
};
