// Gramatikë tense pages: mood chips, the grammar entry, and a verb table from a random (or searched) Fjalor verb;
// pjesorja and përcjellorja pages. wireVerbPicker() makes the verb search and "qetër" work.

import { TAXONOMY } from '../taxonomy.js';
import { LABEL, verbKey } from './labels.js';
import { asList, comboKey, COMBOS, ENTRIES, personsOf, VERBS } from './data.js';
import { esc, fmt, norm, slug, stdLine } from './format.js';
import { personBlock, table, verbClips } from './tables.js';
import { caption, chipRow, formsFor, missMsg, reviewNote, ruleLine, shareBtn } from './cards.js';
import { renderView, state, view } from './views.js';

// A tense page: mood chips, then the grammar entry. Its table shows a random Fjalor verb with this tense
// and the search above it swaps in any verb that has it.
export const TENSE_IDS = TAXONOMY.tenses.map((k) => k.id);
const pickState = { verb: null, rand: {}, shown: {} };
// Pjesorja and përcjellorja pose as tenses so they can share the picker; both need the verb's participle.
export const PARTICIPLE = { tense: 'pjesorja', mood: '' };
export const GERUND = { tense: 'percjellorja', mood: '' };
export const NON_FINITE = [PARTICIPLE.tense, GERUND.tense];
// the verbs a tense page can show: published ones that have that tense (or a participle)
const poolFor = (c) => VERBS.filter((v) => {
    if (v.e.draft) return false;
    return NON_FINITE.includes(c.tense) ? asList(v.w.participle).length : formsFor(v.w, c);
});
const pickerHtml = (pool, label) => (pool.length ? `
        <div class="vpick">
            <input type="search" class="vq" placeholder="kërko folje…" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="${label}">
            ${pool.length > 1 ? '<button type="button" class="vrand">qetër</button>' : ''}
        </div>
        <div class="vsug" hidden></div>` : '');
const gramEntryFor = (c) => ENTRIES.find((e) => e.type === 'gramatike' && e.tense === c.tense && e.mood === c.mood);
// A verb table for one tense + mood. heads: show each verb's word/std above its columns.
export const verbTable = (ws, c, heads = true) => {
    const columnsOf = (w) => {
        const forms = formsFor(w, c) || {};
        return { word: heads ? w.word : '', std: heads ? w.std : '', forms, variants: forms.variants, audios: verbClips(w) };
    };
    return table(personBlock(ws.map(columnsOf), personsOf(c.mood)));
};
const randomFrom = (pool, not) => {
    const others = pool.filter((v) => verbKey(v.w) !== not);
    const from = others.length ? others : pool;
    return from[Math.floor(Math.random() * from.length)];
};
const shownFor = (c) => {
    const key = comboKey(c);
    const pool = poolFor(c);
    const picked = pickState.verb && pool.find((v) => verbKey(v.w) === pickState.verb);
    if (picked) return { verbs: [picked.w], link: picked.e.id };
    if (!pool.length) return { verbs: [] };
    if (!pool.some((v) => verbKey(v.w) === pickState.rand[key])) pickState.rand[key] = verbKey(randomFrom(pool).w);
    const v = pool.find((x) => verbKey(x.w) === pickState.rand[key]);
    return { verbs: [v.w], link: v.e.id };
};
const toDictionary = (link) => (link ? `<p class="miss-key"><a href="#${link}">te fjalori →</a></p>` : '');
export const tensePage = (tense) => {
    const moods = COMBOS.filter((c) => c.tense === tense);
    const current = moods.find((c) => c.mood === state.v[tense]) || moods.find((c) => gramEntryFor(c)) || moods[0];
    const empty = (c) => !gramEntryFor(c) && !poolFor(c).length;
    const moodChip = (c) => ({ label: c.mood, attrs: `data-v="${esc(c.mood)}"`, pressed: c === current, empty: empty(c) });
    const pills = moods.length > 1 ? chipRow(moods.map(moodChip), { big: true, label: 'Mënyra' }) : '';
    const g = gramEntryFor(current);
    const rule = ruleLine(current.tense, current.mood);
    const shown = shownFor(current);
    pickState.shown[comboKey(current)] = shown.verbs.length === 1 ? verbKey(shown.verbs[0]) : null;
    const pool = poolFor(current);
    const picker = pickerHtml(pool, 'Kërko folje për kët koh');
    const body = shown.verbs.length
        ? verbTable(shown.verbs, current) + reviewNote(shown.verbs, current) + toDictionary(shown.link)
        : missMsg(current);
    const parts = [
        ...(g ? g.intro || [] : []).map((t) => `<p>${fmt(t)}</p>`),
        rule ? `<p class="std">${fmt(rule)}</p>` : '',
        picker,
        body,
        ...(g ? g.footnotes || [] : []).map((n) => `<p class="note">${fmt(n)}</p>`),
    ].join('');
    return `<section class="gview"><h2>${esc(LABEL[tense])}</h2>${pills}
        <article class="entry conjugate"${g ? ` id="${g.id}"` : ''} data-tense="${esc(current.tense)}" data-mood="${esc(current.mood)}">
            ${g ? stdLine(g.std) : ''}<div class="forms">${parts}</div>${g ? caption(g.text) : ''}
            ${shareBtn(g ? g.id : slug(LABEL[tense]), `${LABEL[tense]}${g ? ', ' + g.mood : ''}`)}
        </article></section>`;
};
// One verb's pjesore, or its përcjellore (TAXONOMY.gerund.pre + pjesore).
export const nonFiniteView = (c, title) => {
    const pres = c === GERUND ? asList((TAXONOMY.gerund || {}).pre) : [''];
    const pool = poolFor(c);
    const shown = shownFor(c);
    const w = shown.verbs[0];
    pickState.shown[comboKey(c)] = w ? verbKey(w) : null;
    const prefixes = pres.map((p) => `“${esc(p.trim())}”`).join(' ose ');
    const rule = c === GERUND ? `<p class="std">formimi: ${prefixes} + pjesore</p>` : '';
    let body = missMsg();
    if (w) {
        const std = w.std && w.std !== w.word ? stdLine(w.std) : '';
        const lemma = `<div class="lemma"><h4>${fmt(verbKey(w))}</h4>${std}</div>`;
        const line = (pre) => `<p class="pj">${asList(w.participle).map((p) => fmt(pre + p)).join(' / ')}</p>`;
        const forms = pres.map(line).join('');
        body = lemma + forms + toDictionary(shown.link);
    }
    const forms = `<div class="forms">${rule}${pickerHtml(pool, 'Kërko folje')}${body}</div>`;
    const card = `<article class="entry conjugate" data-tense="${c.tense}" data-mood="">${forms}${shareBtn(slug(title), title)}</article>`;
    return `<section class="gview"><h2>${title}</h2>${card}</section>`;
};

// the tense page (or pjesore / përcjellore view) a control is in
const comboOf = (el) => {
    const box = el.closest('.conjugate');
    return box && { box, c: { tense: box.dataset.tense, mood: box.dataset.mood } };
};
// the verb picker's suggestions while typing
const showSug = (box, c) => {
    const sug = box.querySelector('.vsug');
    const q = norm(box.querySelector('.vq').value.trim());
    if (!q) {
        sug.hidden = true;
        sug.innerHTML = '';
        return;
    }
    const hits = poolFor(c).filter((v) => norm([v.w.word, v.w.std].filter(Boolean).join(' ')).includes(q)).slice(0, 8);
    const suggestion = (v) => {
        const std = v.w.std && v.w.std !== v.w.word ? ` <span class="hstd">${fmt(v.w.std)}</span>` : '';
        return `<button type="button" data-verb="${esc(verbKey(v.w))}">${fmt(verbKey(v.w))}${std}</button>`;
    };
    const none = NON_FINITE.includes(c.tense) ? 'Asni folje me pjesore.' : 'Asni folje me kët koh.';
    sug.innerHTML = hits.length ? hits.map(suggestion).join('') : `<p class="miss-key">${none}</p>`;
    sug.hidden = false;
};
// the verb search above a tense table, its suggestions, and "qetër" for another random verb
export const wireVerbPicker = () => {
    view.addEventListener('input', (e) => {
        if (!e.target.classList.contains('vq')) return;
        const x = comboOf(e.target);
        if (x) showSug(x.box, x.c);
    });
    view.addEventListener('keydown', (e) => {
        if (!e.target.classList.contains('vq') || e.key !== 'Enter') return;
        const first = e.target.closest('.conjugate').querySelector('[data-verb]');
        if (first) {
            e.preventDefault();
            first.click();
        }
    });
    view.addEventListener('click', (e) => {
        const pick = e.target.closest('[data-verb]');
        const again = e.target.closest('.vrand');
        if (!pick && !again) return;
        const x = comboOf(e.target);
        if (!x) return;
        if (pick) {
            pickState.verb = pick.dataset.verb;
        } else {
            const v = randomFrom(poolFor(x.c), pickState.shown[comboKey(x.c)]);
            if (v) pickState.verb = verbKey(v.w);
        }
        renderView();
        if (again) view.querySelector('.vrand')?.focus();
    });
};
