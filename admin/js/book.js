// The static book (docs/libri/): every published entry as plain HTML, no scripts and no styling, for readers without
// JavaScript. One page per letter of the Albanian alphabet, plus Gramatikë, Blog and a contents page.
// Entries keep the site's link ids (prepareEntries in docs/js/data.js), so libri/v.html#vdore is the site's #vdore.
// buildBook() returns { "a.html": "<!DOCTYPE html>…", … }; main.js sends it to serve.py, which writes the files.

import { TAXONOMY } from '/taxonomy.js';
import { SHARED } from '/shared.js';
import { ENTRIES, prepareEntries } from '/js/data.js';
import { MISS } from '/js/tables.js';

const { asList, norm, COMBOS, comboKey, CASES, PERSON_LABEL, personsOf } = SHARED;

// The alphabet, two-letter letters first so "sh" is not read as "s". ç and ë get ascii file names.
const ALPHABET = ['a', 'b', 'c', 'ç', 'd', 'dh', 'e', 'ë', 'f', 'g', 'gj', 'h', 'i', 'j', 'k', 'l', 'll', 'm', 'n', 'nj',
    'o', 'p', 'q', 'r', 'rr', 's', 'sh', 't', 'th', 'u', 'v', 'x', 'xh', 'y', 'z', 'zh'];
const BY_LENGTH = [...ALPHABET].sort((a, b) => b.length - a.length);
const FILE_OF = { 'ç': 'cc', 'ë': 'ee' };
const pageOf = (letter) => (FILE_OF[letter] || letter) + '.html';
const OTHER = 'tjera';   // words that start with something else (a number, a quote…)

// a dictionary word as it is alphabetised: without an adjective's article
const sortWord = (e) => {
    const first = (e.words || [])[0] || {};
    return String(e.word || first.word || first.std || '').trim().toLowerCase();
};
const letterOf = (word) => BY_LENGTH.find((l) => word.startsWith(l)) || OTHER;

// ---------- text ----------
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ESCAPES[c]);
let pageFor = {};   // entry id → the book page it is on
let byTitle = {};   // normalised title → entry id, for [[…]] links
const hrefFor = (id) => (pageFor[id] ? `${pageFor[id]}#${id}` : `../index.html#${id}`);
// **bold**, {highlight}, [[word]], [text](#id), [text](https://…), as on the site
const fmt = (s) => esc(s)
    .replace(/\[\[(.+?)\]\]/g, (m, title) => {
        const id = byTitle[norm(title.replace(/&amp;/g, '&'))];
        return id ? `<a href="${hrefFor(id)}">${title}</a>` : title;
    })
    .replace(/\[([^\]]+)\]\((#[^)\s]+|https?:\/\/[^)\s]+)\)/g, (m, text, url) => {
        return `<a href="${url[0] === '#' ? hrefFor(url.slice(1)) : url}">${text}</a>`;
    })
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\{(.+?)\}/g, '<mark>$1</mark>');
// a box with several forms (a list, or one per line) as lines; empty: "—", or nothing where blank means "as before"
const forms = (v, empty = '—') => {
    const all = asList(v).flatMap((f) => String(f).split('\n')).map((f) => f.trim()).filter(Boolean);
    return all.length ? all.map(fmt).join('<br>') : empty;
};
const paragraphs = (list) => (list || []).map((t) => `<p>${fmt(t)}</p>`).join('\n');
const italics = (list) => (list || []).map((t) => `<p><em>${fmt(t)}</em></p>`).join('\n');
const audio = (path) => (path ? `<audio controls preload="none" src="../${esc(path)}"></audio>` : '');

// ---------- tables ----------
const tableHtml = (head, rows) => {
    const th = head.map((h) => `<th>${h}</th>`).join('');
    const row = ([label, cells]) => `<tr><th>${label}</th>${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`;
    const tr = rows.map(row).join('\n');
    return `<table>\n<tr>${th}</tr>\n${tr}\n</table>`;
};

// one tense of a verb card: a column per verb (and per variant of it). A variant holds only the forms that differ,
// so its other boxes stay empty, as on the site.
const tenseTable = (words, c) => {
    const columns = [];
    words.forEach((w) => {
        const f = formsFor(w, c) || {};
        columns.push({ head: words.length > 1 ? fmt(w.word || w.std || '') : '', forms: f, empty: '—' });
        (f.variants || []).forEach((v, i) => columns.push({ head: `variant ${i + 1}`, forms: v, empty: '' }));
    });
    const head = ['', ...columns.map((col) => col.head)];
    const rows = personsOf(c.mood).map((p) => [PERSON_LABEL[p], columns.map((col) => forms(col.forms[p], col.empty))]);
    return tableHtml(head, rows);
};
// a verb's forms for one tense, or for the pair it shares its forms with (TAXONOMY.sameForms)
const formsFor = (w, c) => {
    const link = (TAXONOMY.sameForms || {})[comboKey(c)];
    const [tense, mood] = link ? link.split('|') : [c.tense, c.mood];
    return (w.conjugation || []).find((t) => t.tense === tense && t.mood === mood) || null;
};
const TENSE_NAME = Object.fromEntries(TAXONOMY.tenses.map((t) => [t.id, t.indefinite || t.label]));
const comboName = (c) => `${TENSE_NAME[c.tense] || c.tense} (${c.mood})`;
// every tense the verb has, each folded in <details>; the first one open. A pair that shares another's forms is named with it.
const verbTenses = (e) => {
    const linked = {};
    for (const [pair, to] of Object.entries(TAXONOMY.sameForms || {})) (linked[to] = linked[to] || []).push(pair);
    const own = COMBOS.filter((c) => !(TAXONOMY.sameForms || {})[c.key] && e.words.some((w) => formsFor(w, c)));
    return own.map((c, i) => {
        const also = (linked[c.key] || []).map((pair) => {
            const [tense, mood] = pair.split('|');
            return comboName({ tense, mood });
        });
        const review = e.words.some((w) => (formsFor(w, c) || {}).review) ? ' (pa rishikuar)' : '';
        const notes = e.words.flatMap((w) => (formsFor(w, c) || {}).footnotes || []);
        const summary = comboName(c) + (also.length ? `, njësoj si: ${also.join(', ')}` : '') + review;
        const open = i === 0 ? ' open' : '';
        return `<details${open}><summary>${esc(summary)}</summary>\n${tenseTable(e.words, c)}\n${paragraphs(notes)}</details>`;
    }).join('\n');
};

const nounTable = (e) => {
    const der = SHARED.nounDerived(e);
    const cols = SHARED.NOUN_COLS;
    const name = ([n, d]) => `${n === 'njejes' ? 'njëjës' : 'shumës'}, ${d === 'shquar' ? 'e shquar' : 'e pashquar'}`;
    const box = (k) => ([n, d]) => forms((SHARED.nounCell(e, der, n, d, k) || {}).v);
    const rows = CASES.map(([k, label]) => [label, cols.map(box(k))]);
    if (rows.every(([, cells]) => cells.every((c) => c === '—'))) return '';
    return tableHtml(['', ...cols.map(name)], rows);
};

const adjectiveTable = (e) => {
    const columns = [];
    (e.words || []).forEach((w) => {
        [w, ...(w.variants || [])].forEach((v, i) => {
            columns.push({ head: (i ? 'variant: ' : '') + fmt(SHARED.adjHead(v, w) || ''), v, w });
        });
    });
    const named = (c, number) => (columns.length > 1 ? `${c.head}, ${number}` : number);
    const head = ['', ...columns.flatMap((c) => [named(c, 'njëjës'), named(c, 'shumës')])];
    const both = (g) => (c) => [forms(SHARED.adjForm(c.v, 'njejes', g, c.w)), forms(SHARED.adjForm(c.v, 'shumes', g, c.w))];
    const rows = [['m', 'mashkullore'], ['f', 'femërore']].map(([g, label]) => [label, columns.flatMap(both(g))]);
    return tableHtml(head, rows);
};

// ---------- blocks (Gramatikë entries and blog posts) ----------
const blockHtml = (b) => {
    if (typeof b === 'string') return `<p>${fmt(b)}</p>`;
    if (b.table) {
        const headText = (h) => (typeof h === 'string' ? fmt(h) : fmt(h.word || h.std || ''));
        const head = b.heads ? ['', ...b.heads.map(headText)] : ['', ...b.table.map(() => '')];
        const cellOf = (i) => (col) => (col[i] === MISS ? '—' : forms(col[i], ''));
        const rows = (b.rows || TAXONOMY.persons).map((who, i) => [esc(who), b.table.map(cellOf(i))]);
        return tableHtml(head, rows);
    }
    if (b.cols) {
        const column = (c, i) => {
            const head = b.heads && b.heads[i] ? `<p><strong>${fmt(b.heads[i])}</strong></p>` : '';
            return `${head}<ul>${c.map((t) => `<li>${fmt(t)}</li>`).join('')}</ul>`;
        };
        return b.cols.map(column).join('\n');
    }
    if (b.list) return `<ul>${b.list.map((t) => `<li>${fmt(t)}</li>`).join('')}</ul>`;
    if (b.note) return `<p><small>${fmt(b.note)}</small></p>`;
    if (b.head) return `<h3>${fmt(b.head)}</h3>${b.std ? `<p>std: ${fmt(b.std)}</p>` : ''}`;
    if (b.label) return `<p>${fmt(b.label)}</p>`;
    if (b.std) return `<p>std: ${fmt(b.std)}</p>`;
    return '';
};

// ---------- entries ----------
const posOf = (e) => {
    if (e.pos) return e.pos;
    if (e.sub === 'ndajfolje' && (e.adverbKinds || []).length) return 'ndajfolje ' + SHARED.adverbKindsText(e);
    const noun = `emër${e.gender ? ', gjinia ' + e.gender : ''}`;
    return { folje: 'folje', emra: noun, mbiemra: 'mbiemër', ndajfolje: 'ndajfolje' }[e.sub];
};
const wordEntry = (e) => {
    const words = e.words || [];
    let title = e.word || words.map((w) => w.word).join(', ');
    if (e.sub === 'mbiemra') title = words.map((w) => SHARED.adjHead(w)).join(', ');
    const def = e.def || (((e.declension || {}).njejes || {}).shquar || {}).emerore;
    let std = e.std;
    if (!std && words.length === 1) std = e.sub === 'mbiemra' ? SHARED.adjStd(words[0]) : words[0].std;
    const participles = words.flatMap((w) => asList(w.participle));
    const about = [
        `<em>${fmt(posOf(e) || '')}</em>`,
        std && std !== title ? `std: ${fmt(std)}` : '',   // not when it is the same as the word
        e.pronunciation ? `shqiptime kryesore: ${fmt(e.pronunciation)}` : '',
    ].filter(Boolean).join('. ');
    const variantsNote = e.variantsNote ? ` (${fmt(e.variantsNote)})` : '';
    const parts = [
        `<h2>${fmt(title)}${def ? ` <small>${fmt(def)}</small>` : ''}</h2>`,
        [e, ...words].map((x) => audio(x.audio)).join(''),
        `<p>${about}</p>`,
        paragraphs(e.meaning),
        e.variants ? `<p>variacion${variantsNote}: ${e.variants.map(fmt).join(', ')}</p>` : '',
        participles.length ? `<p>pjesore: ${participles.map(fmt).join(' / ')}</p>` : '',
        e.sub === 'folje' ? verbTenses(e) : '',
        e.sub === 'emra' && nounTable(e) ? `<p><strong>Lakimi</strong></p>\n${nounTable(e)}` : '',
        e.sub === 'mbiemra' ? adjectiveTable(e) : '',
        e.examples ? `<p><strong>shembuj</strong></p>\n<ul>${e.examples.map((t) => `<li>${fmt(t)}</li>`).join('')}</ul>` : '',
        e.etymology ? `<p><strong>etimologjia</strong></p>\n${paragraphs(e.etymology)}` : '',
        (e.footnotes || []).map((n) => `<p><small>${fmt(n)}</small></p>`).join(''),
        italics(e.text),
    ];
    return `<article id="${esc(e.id)}">\n${parts.filter(Boolean).join('\n')}\n</article>`;
};
const LABELS = Object.fromEntries(
    [...TAXONOMY.tenses, ...TAXONOMY.blog, ...TAXONOMY.grammarMenu.flatMap((g) => g.items)].map((x) => [x.id, x.label]));
const grammarEntry = (e) => {
    const title = `${LABELS[e.item] || ''}${e.v ? `, ${e.v}` : ''}`;
    const parts = [
        `<h2>${esc(title)}</h2>`,
        e.std ? `<p>std: ${fmt(e.std)}</p>` : '',
        (e.forms || []).map(blockHtml).join('\n'),
        paragraphs(e.text),
    ];
    return `<article id="${esc(e.id)}">\n${parts.filter(Boolean).join('\n')}\n</article>`;
};
const blogEntry = (e) => {
    const src = esc(e.video || '');
    const parts = [
        `<h2>${fmt(e.title)}</h2>`,
        `<p><em>${esc(LABELS[e.cat] || '')}, ${esc(e.date)}</em></p>`,
        e.sub ? `<p>${fmt(e.sub)}</p>` : '',
        e.std ? `<p>std: ${fmt(e.std)}</p>` : '',
        e.video ? `<video controls preload="none" poster="../${src}.jpg" src="../${src}.mp4"></video>` : '',
        (e.body || []).map(blockHtml).join('\n'),
    ];
    return `<article id="${esc(e.id)}">\n${parts.filter(Boolean).join('\n')}\n</article>`;
};

// ---------- pages ----------
const page = (title, nav, body) => `<!DOCTYPE html>
<html lang="sq">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
</head>
<body>
${nav}
${body}
${nav}
</body>
</html>
`;

// entries: the saved entries (drafts are left out). Returns { file name: page HTML }.
export const buildBook = (entries) => {
    prepareEntries(structuredClone(entries), false);   // the site's ids, items and Gramatikë forms, on a copy
    const words = ENTRIES.filter((e) => e.type === 'fjale');
    const grammar = ENTRIES.filter((e) => e.type === 'gramatike');
    const blog = ENTRIES.filter((e) => e.type === 'blog').sort((a, b) => b.date.localeCompare(a.date));

    // letters in alphabet order, each with its words in Albanian alphabetical order
    const byLetter = new Map([...ALPHABET, OTHER].map((l) => [l, []]));
    for (const e of words) byLetter.get(letterOf(sortWord(e))).push(e);
    for (const list of byLetter.values()) list.sort((a, b) => sortWord(a).localeCompare(sortWord(b), 'sq'));
    const letters = [...byLetter].filter(([, list]) => list.length);
    const fileOf = (letter) => (letter === OTHER ? 'tjera.html' : pageOf(letter));

    pageFor = {};
    letters.forEach(([letter, list]) => list.forEach((e) => { pageFor[e.id] = fileOf(letter); }));
    grammar.forEach((e) => { pageFor[e.id] = 'gramatike.html'; });
    blog.forEach((e) => { pageFor[e.id] = 'blog.html'; });
    byTitle = {};
    for (const e of ENTRIES) {
        byTitle[norm(e.id)] = e.id;
        if (e.key) byTitle[norm(e.key)] = e.id;
    }

    // every page: contents, the letters, Gramatikë, Blog
    const nameOf = (letter) => (letter === OTHER ? 'të tjera' : letter.toUpperCase());
    const sections = [
        ...letters.map(([letter, list]) => ({ file: fileOf(letter), name: nameOf(letter), count: list.length })),
        grammar.length ? { file: 'gramatike.html', name: 'Gramatikë', count: grammar.length } : null,
        blog.length ? { file: 'blog.html', name: 'Blog', count: blog.length } : null,
    ].filter(Boolean);
    const nav = (here) => {
        const i = sections.findIndex((s) => s.file === here);
        const prev = i > 0 ? ` · <a href="${sections[i - 1].file}">‹ ${esc(sections[i - 1].name)}</a>` : '';
        const next = i >= 0 && i < sections.length - 1 ? ` · <a href="${sections[i + 1].file}">${esc(sections[i + 1].name)} ›</a>` : '';
        const link = (s) => (s.file === here ? `<strong>${esc(s.name)}</strong>` : `<a href="${s.file}">${esc(s.name)}</a>`);
        const all = sections.map(link).join(' ');
        return `<nav><p><a href="index.html">Përmbajtja</a>${prev}${next}</p><p>${all}</p></nav>`;
    };

    const files = {};
    const contents = sections.map((s) => `<li><a href="${s.file}">${esc(s.name)}</a> (${s.count})</li>`).join('\n');
    files['index.html'] = page('Shqipollog: libri', nav('index.html'), `<h1>Shqipollog</h1>
<p>Fjalori dhe gramatika e të folmes së Tetovës, si libër: pa JavaScript, një faqe për çdo shkronjë.
Faqja e plotë: <a href="../index.html">shqipollog.com</a>.</p>
<h2>Përmbajtja</h2>
<ul>
${contents}
</ul>`);
    for (const [letter, list] of letters) {
        const name = letter === OTHER ? 'Të tjera' : letter.toUpperCase();
        const index = list.map((e) => `<a href="#${esc(e.id)}">${esc(sortWord(e))}</a>`).join(', ');
        const body = `<h1>${esc(name)}</h1>\n<p>${index}</p>\n${list.map(wordEntry).join('\n<hr>\n')}`;
        files[fileOf(letter)] = page(`Shqipollog: ${name}`, nav(fileOf(letter)), body);
    }
    if (grammar.length) {
        const body = `<h1>Gramatikë</h1>\n${grammar.map(grammarEntry).join('\n<hr>\n')}`;
        files['gramatike.html'] = page('Shqipollog: Gramatikë', nav('gramatike.html'), body);
    }
    if (blog.length) {
        files['blog.html'] = page('Shqipollog: Blog', nav('blog.html'), `<h1>Blog</h1>\n${blog.map(blogEntry).join('\n<hr>\n')}`);
    }
    return files;
};
