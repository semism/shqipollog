// Tables and blocks: the ▶ after a form, lists, the persons table (verbs, Gramatikë), the "— mungon" cells,
// and the blocks a Gramatikë entry or a blog post is made of.

import { TAXONOMY } from '../taxonomy.js';
import { SHARED } from '../shared.js';
import { asList, helperWord, PERSON_KEYS, PERSON_LABEL, personsOf } from './data.js';
import { esc, fmt, stdLine } from './format.js';
import { ruleLine } from './cards.js';

// ▶ after a form that can be heard (see SHARED.clipChain). au: the owning word's recordings (`audios`), or for a verb
// { verb } so the helper verb's recordings can fill in pieces.
export const verbClips = (w) => ({ verb: w });
export const playSm = (au, v) => {
    if (!v || !au) return '';
    const chain = au.verb ? SHARED.clipChain(SHARED.clipsOf(au.verb), v, helperWord) : SHARED.clipChain(au, v);
    if (!chain) return '';
    const tip = chain.linked ? 'Dëgjo (nga pjesët)' : 'Dëgjo';
    const paths = esc(chain.paths.join(' '));
    return `<button type="button" class="play sm" data-audio="${paths}" aria-label="${tip}: ${esc(v)}" title="${tip}">▶</button>`;
};
export const listHtml = (items, au) => {
    const item = (t) => `<li>${t ? fmt(t) + playSm(au, t) : '&nbsp;'}</li>`;
    return `<ul>${items.map(item).join('')}</ul>`;
};
const headCell = (h) => {
    if (!h) return '';
    if (typeof h === 'string') return h === 'variant' ? `<span class="var">${h}</span>` : fmt(h);
    const std = h.std ? `<span class="hstd">std: ${fmt(h.std)}</span>` : '';
    return `${h.word ? fmt(h.word) : ''}${std}`;
};
export const MISS = '\u0000';
export const cell = (v, au) => {
    if (v === MISS) return '<span class="miss" title="mungon e dhona">—</span>';
    return v ? fmt(v) + playSm(au, v) : '';
};
export const wrapTable = (t) => {
    const key = t.includes('class="miss"') ? '<p class="miss-key">— mungon e dhona</p>' : '';
    return `<div class="table-wrap">${t}</div>${key}`;
};
export const table = (b) => {
    // a column that starts a new word gets a separator line (class gs)
    const startsWord = (b.heads || []).map((h, i) => i > 0 && h && typeof h === 'object' && (h.word || h.std));
    const cls = (i) => (startsWord[i] ? ' class="gs"' : '');
    const headCells = (b.heads || []).map((h, i) => `<th${cls(i)}>${headCell(h)}</th>`).join('');
    const head = b.heads ? `<thead><tr><th></th>${headCells}</tr></thead>` : '';
    const row = (who, i) => {
        const cells = b.table.map((col, j) => `<td${cls(j)}>${cell(col[i], (b.audios || [])[j])}</td>`).join('');
        return `<tr><th class="p" scope="row">${who}</th>${cells}</tr>`;
    };
    const rows = (b.rows || TAXONOMY.persons).map(row).join('');
    return wrapTable(`<table class="conj">${head}<tbody>${rows}</tbody></table>`);
};
const columns = (b) => {
    const column = (c, i) => {
        const head = b.heads && b.heads[i] ? `<div class="colhead">${headCell(b.heads[i])}</div>` : '';
        return `<div>${head}${listHtml(c)}</div>`;
    };
    return `<div class="cols">${b.cols.map(column).join('')}</div>`;
};
const block = (b) => {
    if (typeof b === 'string') return `<p>${fmt(b)}</p>`;
    if (b.table) return table(b);
    if (b.cols) return columns(b);
    if (b.list) return listHtml(b.list);
    if (b.note) return `<p class="note">${fmt(b.note)}</p>`;
    if (b.head) return `<div class="lemma"><h4>${fmt(b.head)}</h4>${stdLine(b.std)}</div>`;
    if (b.label) return `<p class="std">${fmt(b.label)}</p>`;
    if (b.std) return stdLine(b.std);
    return '';
};
export const blocks = (arr, cls = 'forms') => (arr && arr.length ? `<div class="${cls}">${arr.map(block).join('')}</div>` : '');

// Keys of a verb's forms that are not persons but still get a row of their own (anything unexpected someone typed).
const NOT_FORMS = ['word', 'std', 'variants', 'tense', 'mood', 'footnotes', 'participle', 'conjugation', 'review'];
export const personBlock = (words, keys = PERSON_KEYS) => {
    const cols = [];
    words.forEach((w) => {
        const head = w.word || w.std ? { word: w.word, std: w.std } : '';
        cols.push({ head, forms: w.forms || {}, main: true, audios: w.audios });
        (w.variants || []).forEach((v) => cols.push({ head: 'variant', forms: v, audios: w.audios }));
    });
    const isExtra = (k) => !PERSON_KEYS.includes(k) && !NOT_FORMS.includes(k);
    const extra = [...new Set(cols.flatMap((c) => Object.keys(c.forms).filter(isExtra)))];
    const rows = [];
    const cells = cols.map(() => []);
    [...keys, ...extra].forEach((k) => {
        const n = Math.max(0, ...cols.map((c) => asList(c.forms[k]).length));
        for (let r = 0; r < n; r++) {
            rows.push(PERSON_LABEL[k] || k);
            cols.forEach((c, i) => cells[i].push(asList(c.forms[k])[r] || (c.main ? MISS : '')));
        }
    });
    const result = { rows, table: cells, audios: cols.map((c) => c.audios) };
    if (cols.some((c) => c.head)) result.heads = cols.map((c) => c.head);
    return result;
};

export const gramForms = (e) => {
    const out = [...(e.intro || [])];
    const rule = e.tense && e.mood ? ruleLine(e.tense, e.mood) : '';
    if (rule) out.push({ label: rule });
    const words = e.words || [];
    if (words.some((w) => w.examples)) {
        words.forEach((w) => {
            out.push({ head: w.word, std: w.std });
            out.push({ list: w.examples || [] });
        });
    } else if (words.length) {
        const verbs = words.map((w) => ({ word: w.word, std: w.std, forms: w, variants: w.variants }));
        out.push(personBlock(verbs, e.tense ? personsOf(e.mood) : PERSON_KEYS));
    }
    (e.footnotes || []).forEach((n) => out.push({ note: n }));
    return out;
};
