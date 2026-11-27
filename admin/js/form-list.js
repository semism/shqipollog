// The middle form (draw), the entry list on the left with its filters, search and keyboard moves, new / duplicate / delete.

import { TAXONOMY } from '/taxonomy.js';
import {
    cached, changed, current, day, el, entries, filter, groupOf, kindOf, needsReview, norm, preview, setCurrent,
    setFilter, titleOf, today,
} from './core.js';
import { renderJson } from './json-panel.js';
import { metaFields, WORD_SHAPE } from './editor-common.js';
import { audioStats, audioTag, progressTag } from './counts.js';
import { fjaleEditor } from './editor-word.js';
import { gramEditor } from './editor-grammar.js';
import { blogEditor } from './editor-blog.js';

// the headword at the top of the form, editable in place (word, or the first word, or the blog title)
export const headOf = (e) => {
    if (e.type === 'blog') return { get: () => e.title || '', set: (v) => { e.title = v; } };
    if (e.type !== 'fjale') return null;
    if (WORD_SHAPE[e.sub] === 'words') {
        e.words = e.words && e.words.length ? e.words : [{}];
        return { get: () => e.words[0].word || '', set: (v) => { e.words[0].word = v; } };
    }
    return { get: () => e.word || '', set: (v) => { e.word = v; } };
};

// ---------- form, list ----------
export const formEl = document.getElementById('form');
// redraw the form without jumping to its top
export const redrawForm = () => {
    const y = formEl.scrollTop;
    draw();
    formEl.scrollTop = y;
};
export const draw = () => {
    const e = entries[current];
    renderJson();
    if (!e) {
        formEl.replaceChildren(el('p', { class: 'empty' }, 'Zgjidh një hyrje majtas, ose krijo një të re.'));
        return;
    }
    // the headword, editable in place where there is one; otherwise the entry's title
    let title = el('h2', { id: 'title' }, titleOf(e));
    if (headOf(e)) {
        const typed = (ev) => {
            headOf(e).set(ev.target.value);
            changed();
        };
        title = el('input', {
            id: 'title', class: 'headword', type: 'text', value: headOf(e).get(), placeholder: 'fjala', 'aria-label': 'Fjala',
            oninput: typed, onchange: redrawForm,
        });
    }
    let editor = blogEditor;
    if (e.type === 'fjale') editor = fjaleEditor;
    if (e.type === 'gramatike') editor = gramEditor;
    formEl.replaceChildren(
        title,
        el('p', { class: 'hint' }, kindOf(e), e.sub === 'folje' ? progressTag(e) : null, audioTag(e)),
        el('div', { class: 'actions' },
            el('button', { class: 'btn small', type: 'button', onclick: duplicate }, 'Dupliko'),
            el('button', { class: 'btn small danger', type: 'button', onclick: remove }, 'Fshi')),
        metaFields(e),
        ...[editor(e)].flat(Infinity).filter(Boolean),
    );
};

const FILTERS = [
    ['all', 'Të gjitha'],
    ['gramatike', 'Gramatikë'],
    ...TAXONOMY.dictionaryCategories.map((x) => [x.id, x.label]),
    ['blog', 'Blog'],
    ['draft', 'Fshehur'],
    ['review', 'Rishikim'],
    ['linked', 'Pjesët'],
];
const filtersEl = document.getElementById('filters');
const itemsEl = document.getElementById('items');
const qEl = document.getElementById('q');
const TYPE_RANK = { gramatike: 0, fjale: 1, blog: 2 };
// Which entries the list shows for the chosen filter and search, newest first within each type.
// Recording counts are worked out only for the "Pjesët" filter (and for the open entry's header), not for every line.
const matchesFilter = (e) => {
    if (filter === 'all') return true;
    if (filter === 'draft') return !!e.draft;
    if (filter === 'review') return needsReview(e);
    if (filter === 'linked') return cached(e, 'audio', () => audioStats(e)).linked > 0;
    return groupOf(e) === filter;
};
const matchesSearch = (e, q) => !q || cached(e, 'search', () => norm(JSON.stringify(e))).includes(q);
const byTypeThenNewest = (a, b) => {
    const byType = TYPE_RANK[entries[a].type] - TYPE_RANK[entries[b].type];
    return byType || (entries[b].date || '').localeCompare(entries[a].date || '');
};

const listItem = (i) => {
    const e = entries[i];
    return el('button', { class: 'item', type: 'button', 'data-i': i, 'aria-current': String(i === current), onclick: () => select(i) },
        el('b', {}, titleOf(e)),
        e.draft ? el('span', { class: 'tag-draft' }, 'fshehur') : null,
        needsReview(e) ? el('span', { class: 'tag-review' }, 'rishikim') : null,
        progressTag(e),
        el('small', {}, `${kindOf(e)}, ${day(e.date)}`));
};
// after an edit, only the open entry's line changes
export const refreshListItem = (i) => {
    const old = itemsEl.querySelector(`.item[data-i="${i}"]`);
    if (old) old.replaceWith(listItem(i));
};
const filterButton = ([id, label]) => {
    const pick = () => {
        setFilter(id);
        renderList();
    };
    return el('button', { type: 'button', 'aria-pressed': String(filter === id), onclick: pick }, label);
};

export const renderList = () => {
    filtersEl.replaceChildren(...FILTERS.map(filterButton));
    const q = norm(qEl.value.trim());
    const shown = entries.map((e, i) => i)
        .filter((i) => matchesFilter(entries[i]) && matchesSearch(entries[i], q))
        .sort(byTypeThenNewest);
    itemsEl.replaceChildren(...shown.map(listItem));
};
qEl.addEventListener('input', renderList);

// keyboard: from the search, ↓ / Tab go to the results (Enter opens the first one); in the results ↑ ↓ move,
// Enter opens and keeps focus on it, ↑ on the first one or Esc goes back to the search
const listItems = () => [...itemsEl.querySelectorAll('.item')];
qEl.addEventListener('keydown', (ev) => {
    const first = listItems()[0];
    if (!first) return;
    if (ev.key === 'ArrowDown' || (ev.key === 'Tab' && !ev.shiftKey)) { ev.preventDefault(); first.focus(); }
    else if (ev.key === 'Enter') { ev.preventDefault(); select(+first.dataset.i); }
});
itemsEl.addEventListener('keydown', (ev) => {
    const all = listItems(), at = all.indexOf(document.activeElement);
    if (at < 0) return;
    if (ev.key === 'ArrowDown') { ev.preventDefault(); (all[at + 1] || all[at]).focus(); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); (at ? all[at - 1] : qEl).focus(); }
    else if (ev.key === 'Escape') { ev.preventDefault(); qEl.focus(); }
    else if (ev.key === 'Enter') {
        ev.preventDefault();
        select(+all[at].dataset.i);
        const now = itemsEl.querySelector('.item[aria-current="true"]');
        if (now) now.focus();
    }
});

const select = (i) => { setCurrent(i); renderList(); draw(); preview(); formEl.scrollTop = 0; };

const TEMPLATES = {
    folje: () => ({ type: 'fjale', sub: 'folje', date: today(), words: [{ word: '', conjugation: [{ tense: 'tashmja', mood: 'dëftore' }] }] }),
    emra: () => ({ type: 'fjale', sub: 'emra', date: today(), word: '', gender: 'mashkullore' }),
    mbiemra: () => ({ type: 'fjale', sub: 'mbiemra', date: today(), words: [{ word: '' }] }),
    ndajfolje: () => ({ type: 'fjale', sub: 'ndajfolje', date: today(), word: '' }),
    gramatike: () => ({ type: 'gramatike', tense: 'tashmja', mood: 'dëftore', date: today() }),
    blog: () => ({ type: 'blog', cat: 'shprehje', date: today(), title: '', body: [''] }),
};
document.getElementById('new').addEventListener('change', (ev) => {
    const make = TEMPLATES[ev.target.value];
    ev.target.value = '';
    if (!make) return;
    entries.unshift(make());
    setFilter('all');
    changed();
    select(0);
    formEl.querySelector('input[type="text"]')?.focus();
});
function duplicate() {
    const copy = structuredClone(entries[current]);
    delete copy.id;
    copy.date = today();
    entries.splice(current, 0, copy);
    changed();
    select(current);
}
function remove() {
    if (!confirm(`Të fshihet “${titleOf(entries[current])}”?`)) return;
    entries.splice(current, 1);
    setCurrent(Math.min(current, entries.length - 1));
    changed();
    draw();
}
