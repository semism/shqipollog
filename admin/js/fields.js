// Building blocks of the editors: labelled rows, text boxes, dropdowns, lists, form boxes with mics, the persons grid,
// the adjective and noun grids, the ndajfolje types dropdown, sections.

import { TAXONOMY } from '/taxonomy.js';
import { SHARED } from '/shared.js';
import { asList, CASES, changed, el, PERSONS, PLABEL, set } from './core.js';
import { formMics } from './recording.js';

// ---------- field builders ----------
// Field labels in standard Albanian (the JSON panel on the right shows the data keys).
const KEY_LABEL = {
    word: 'fjala', std: 'standarde', pronunciation: 'shqiptimi', meaning: 'kuptimi', examples: 'shembuj',
    etymology: 'etimologjia', variants: 'variantet', variant: 'varianti', variantsNote: 'shënim për variantet',
    footnotes: 'shënime', text: 'koment', adverbKinds: 'lloji', sub: 'lloji i fjalës', gender: 'gjinia',
    date: 'data', place: 'vendi', id: 'id', title: 'titulli', body: 'teksti', intro: 'hyrja', cat: 'kategoria',
    tense: 'koha', pronoun: 'përemri', participle: 'pjesorja', head: 'nëntitulli', video: 'video', declension: 'lakimi',
};
export const labelFor = (label) => KEY_LABEL[label] || label;
export const row = (label, input) => el('div', { class: 'row' }, el('label', {}, labelFor(label)), input);
export const text = (obj, key, label = key, ph = '') => {
    const input = el('input', { type: 'text', value: obj[key] || '', placeholder: ph, oninput: (ev) => set(obj, key, ev.target.value) });
    return row(label, input);
};
export const choose = (obj, key, label, options, onchange) => {
    const picked = (ev) => {
        if (onchange) onchange(ev.target.value);
        else set(obj, key, ev.target.value);
    };
    const option = ([v, l]) => el('option', { value: v, selected: (obj[key] || '') === v }, l);
    return row(label, el('select', { onchange: picked }, options.map(option)));
};

// a list of strings, one box per item
export const lines = (obj, key, label = key, hint, owner = null) => {
    const box = el('div', { class: 'lines' });
    const draw = () => {
        const arr = obj[key] || [];
        const item = (t, i) => {
            const mics = owner ? formMics(owner, () => [arr[i] || '']) : null;
            const typed = (ev) => {
                arr[i] = ev.target.value;
                set(obj, key, arr);
                if (mics) mics.redraw();
            };
            const remove = () => {
                arr.splice(i, 1);
                set(obj, key, arr);
                draw();
            };
            return el('div', {},
                el('textarea', { rows: 1, value: t, oninput: typed }),
                mics,
                el('button', { class: 'x', type: 'button', title: 'Hiqe', onclick: remove }, '✕'));
        };
        const addOne = () => {
            obj[key] = [...arr, ''];
            changed();
            draw();
            box.querySelectorAll('textarea')[arr.length]?.focus();
        };
        box.replaceChildren(...arr.map(item), el('button', { class: 'btn small', type: 'button', onclick: addOne }, '+ Shto'));
    };
    draw();
    return row(label, el('div', {}, hint ? el('p', { class: 'hint' }, hint) : null, box));
};

// boxes the rules just filled: highlighted until you type in them or save
let autoMarks = new WeakMap();
// after a save, no box counts as just filled any more
export const clearAutoMarks = () => { autoMarks = new WeakMap(); };
export const mark = (obj, key) => {
    if (!autoMarks.has(obj)) autoMarks.set(obj, new Set());
    autoMarks.get(obj).add(key);
};
const marked = (obj, key) => !!(autoMarks.get(obj) && autoMarks.get(obj).has(key));

// one cell that can hold several forms (one per line)
const cellInput = (obj, key, after) => el('textarea', {
    rows: 1,
    class: marked(obj, key) ? 'auto' : null,
    value: asList(obj[key]).join('\n'),
    oninput: (ev) => {
        if (autoMarks.get(obj)) autoMarks.get(obj).delete(key);
        ev.target.classList.remove('auto');
        const parts = ev.target.value.split('\n').filter((l) => l.trim());
        set(obj, key, parts.length > 1 ? parts : parts[0] || '');
        if (after) after();
    },
});
// a form box with a mic per form; owner: the word whose `audios` holds the clips (none: no mics)
export const formCell = (obj, key, owner) => {
    if (!owner) return cellInput(obj, key);
    const mics = formMics(owner, () => asList(obj[key]));
    return el('div', { class: 'fcell' }, cellInput(obj, key, () => mics.redraw()), mics);
};

export const swap = (arr, i, j) => { [arr[i], arr[j]] = [arr[j], arr[i]]; };

// persons grid: main forms plus variant columns
export const personGrid = (target, redraw, persons = PERSONS, owner = null) => {
    const vars = target.variants || [];
    const empty = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    // Columns are variant 0 (the main forms) and variant 1..n, which only hold the persons that differ.
    // Moving one fills every column in full, swaps, then strips each variant back to what differs from variant 0.
    const move = (i, j) => {
        const full = [target, ...vars].map((o, k) => Object.fromEntries(PERSONS
            .map((p) => [p, k === 0 || empty(o[p]) ? target[p] : o[p]])
            .filter(([, v]) => !empty(v))));
        swap(full, i, j);
        PERSONS.forEach((p) => {
            delete target[p];
            if (!empty(full[0][p])) target[p] = full[0][p];
        });
        vars.forEach((v, k) => PERSONS.forEach((p) => {
            delete v[p];
            const f = full[k + 1][p];
            if (!empty(f) && !same(f, target[p])) v[p] = f;
        }));
        changed();
        redraw();
    };
    const arrows = (i) => [
        el('button', { class: 'x', type: 'button', title: 'Majtas', disabled: i === 0, onclick: () => move(i, i - 1) }, '←'),
        el('button', { class: 'x', type: 'button', title: 'Djathtas', disabled: i === vars.length, onclick: () => move(i, i + 1) }, '→'),
    ];
    const removeVariant = (i) => {
        vars.splice(i, 1);
        set(target, 'variants', vars);
        redraw();
    };
    const addVariant = () => {
        target.variants = [...vars, {}];
        changed();
        redraw();
    };
    const variantHead = (v, i) => el('th', { class: 'gs' }, `variant ${i + 1} `, arrows(i + 1),
        el('button', { class: 'x', type: 'button', title: 'Hiqe variantin', onclick: () => removeVariant(i) }, '✕'));
    const head = el('tr', {}, el('th'), el('th', {}, 'variant 0 ', arrows(0)), vars.map(variantHead),
        el('th', {}, el('button', { class: 'btn small', type: 'button', onclick: addVariant }, '+ Variant')));
    const personRow = (p) => el('tr', {},
        el('th', {}, PLABEL[p]),
        el('td', {}, formCell(target, p, owner)),
        vars.map((v) => el('td', { class: 'gs' }, formCell(v, p, owner))),
        el('td'));
    const hint = 'Enter brenda një kutie = formë tjetër për të njëjtin person. '
        + 'Variantet 1, 2… mbushen vetëm aty ku ndryshojnë nga varianti 0.';
    const grid = el('table', { class: 'grid' }, el('thead', {}, head), el('tbody', {}, persons.map(personRow)));
    return el('div', { class: 'scroll' }, grid, el('p', { class: 'hint' }, hint));
};

// m/f × njëjës/shumës grid for adjectives
// a nyjshëm adjective's article (i / e / t’), shown left of its box; the box holds the form without it
export const withArticleLabel = (box, art) => {
    if (!art) return box;
    return el('div', { class: 'art-wrap' }, el('span', { class: 'art' }, art), box);
};
export const adjWordField = (obj, label, owner) => {
    const input = el('input', { type: 'text', value: obj.word || '', placeholder: 'majr', oninput: (ev) => set(obj, 'word', ev.target.value) });
    return row(label, withArticleLabel(input, owner.panyjshem ? null : 'i'));
};
export const adjGrid = (w, owner = w) => {
    const put = (n, g, val) => {
        w[n] = w[n] || {};
        set(w[n], g, val);
        if (!Object.keys(w[n]).length) delete w[n];
    };
    const inp = (n, g) => {
        // recordings go by the form as shown, with its article
        const mics = formMics(owner, () => asList(SHARED.adjForm(w, n, g, owner)));
        const typed = (ev) => {
            put(n, g, ev.target.value);
            mics.redraw();
        };
        const box = el('textarea', { rows: 1, value: (w[n] || {})[g] || '', oninput: typed });
        const article = owner.panyjshem ? null : SHARED.ADJ_ARTICLES[n][g];
        return el('div', { class: 'fcell' }, withArticleLabel(box, article), mics);
    };
    const genderRow = ([g, label]) => el('tr', {}, el('th', {}, label), el('td', {}, inp('njejes', g)), el('td', {}, inp('shumes', g)));
    return el('table', { class: 'grid' },
        el('thead', {}, el('tr', {}, el('th'), el('th', {}, 'njëjës'), el('th', {}, 'shumës'))),
        el('tbody', {}, [['m', 'mashkullore'], ['f', 'femërore']].map(genderRow)));
};

// declension grid for nouns; each case's question (in dialect) under its label, as a reminder for contributors
const CASE_QUESTIONS = {
    emerore: 'kush? xhi?',
    gjinore: 'i/e kujt?',
    dhanore: 'kujt?',
    kallezore: 'kën? cëllin? cëllen?',
    rrjedhore: 'pi kujt?',
};
export const nounGrid = (e) => {
    const cols = SHARED.NOUN_COLS;
    const get = (n, d, k) => (((e.declension || {})[n] || {})[d] || {})[k] || '';
    const put = (n, d, k, val) => {
        e.declension = e.declension || {};
        const decl = e.declension;
        decl[n] = decl[n] || {};
        decl[n][d] = decl[n][d] || {};
        if (val.trim()) decl[n][d][k] = val;
        else delete decl[n][d][k];
        // drop whatever is left empty
        if (!Object.keys(decl[n][d]).length) delete decl[n][d];
        if (!Object.keys(decl[n]).length) delete decl[n];
        if (!Object.keys(decl).length) delete e.declension;
        changed();
    };
    // Empty boxes show the derived form (SHARED.nounDerived) as a grey placeholder; it is never stored. Typing overrides it,
    // clearing the box brings it back. Typing the word, the definite singular or the plural updates every placeholder.
    let der = SHARED.nounDerived(e);
    const auto = (n, d, k) => der[n][d][k] || '';
    const cells = [];
    const refresh = () => {
        der = SHARED.nounDerived(e);
        cells.forEach((c) => {
            c.ta.placeholder = auto(c.n, c.d, c.k);
            c.mics.redraw();
        });
    };
    const sep = (i) => (i === 2 ? 'gs' : null);   // a line between njëjës and shumës
    const caseCell = (k) => ([n, d], i) => {
        const mics = formMics(e, () => [get(n, d, k) || auto(n, d, k)]);
        const typed = (ev) => {
            put(n, d, k, ev.target.value);
            refresh();
        };
        const ta = el('textarea', { rows: 1, value: get(n, d, k), placeholder: auto(n, d, k), oninput: typed });
        cells.push({ n, d, k, ta, mics });
        return el('td', { class: sep(i) }, el('div', { class: 'fcell' }, ta, mics));
    };
    const caseRow = ([k, label]) => el('tr', {}, el('th', {}, label, el('small', {}, CASE_QUESTIONS[k])), cols.map(caseCell(k)));
    const definiteness = ([, d], i) => el('th', { class: sep(i) }, d === 'shquar' ? 'e shquar' : 'e pashquar');
    const head = el('thead', {},
        el('tr', {}, el('th'), el('th', { colspan: 2 }, 'njëjës'), el('th', { colspan: 2, class: 'gs' }, 'shumës')),
        el('tr', {}, el('th'), cols.map(definiteness)));
    const box = el('div', { class: 'scroll' }, el('table', { class: 'grid' }, head, el('tbody', {}, CASES.map(caseRow))));
    box.refresh = refresh;
    return box;
};

// ndajfolje types: a dropdown of checkboxes (TAXONOMY.adverbKinds), any number of them, kept in taxonomy order
export const adverbKindsPicker = (e) => {
    const all = TAXONOMY.adverbKinds;
    const summary = el('summary');
    const show = () => { summary.textContent = SHARED.adverbKindsText(e) || '—'; };
    show();
    const ticked = (x) => (ev) => {
        const on = new Set(e.adverbKinds || []);
        if (ev.target.checked) on.add(x.id);
        else on.delete(x.id);
        set(e, 'adverbKinds', all.map((y) => y.id).filter((id) => on.has(id)));
        show();
    };
    const choice = (x) => el('label', { class: 'check' },
        el('input', { type: 'checkbox', checked: (e.adverbKinds || []).includes(x.id), onchange: ticked(x) }), x.label);
    return row('adverbKinds', el('details', { class: 'multi' }, summary, el('div', { class: 'multi-list' }, all.map(choice))));
};

// close an open adverbKinds dropdown on a click outside it or on Esc
const openDropdowns = () => document.querySelectorAll('details.multi[open]');
document.addEventListener('click', (ev) => openDropdowns().forEach((d) => { if (!d.contains(ev.target)) d.open = false; }));
document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    openDropdowns().forEach((d) => {
        d.open = false;
        d.querySelector('summary').focus();
    });
});

export const section = (legend, ...kids) => el('fieldset', {}, el('legend', {}, labelFor(legend)), ...kids);
export const removeBtn = (label, fn) => el('button', { class: 'x', type: 'button', title: label, onclick: fn }, '✕');
