// The page around the cards: tabs, the side panel (Gramatikë menu, Fjalor and Blog filters, sorting), pages,
// the list for the current tab and search, and redrawing one card in place. The wire…() functions hook up the clicks.

import { TAXONOMY } from '../taxonomy.js';
import { ITEMS, LABEL, TABS, variantRank } from './labels.js';
import { byId, comboKey, COMBOS, ENTRIES } from './data.js';
import { esc, norm, slug } from './format.js';
import { blogPost, chipRow, formsFor, gramCard, tenseChoice, wordCard } from './cards.js';
import { GERUND, NON_FINITE, nonFiniteView, PARTICIPLE, TENSE_IDS, tensePage } from './tense-pages.js';

export const state = { tab: 'fjalor', item: ITEMS[0].id, v: {}, fjalor: 'all', blog: 'all', by: 'date', dir: 'desc' };
const tabsEl = document.getElementById('tabs');
const panel = document.getElementById('panel');
export const view = document.getElementById('view');
const empty = document.getElementById('empty');
export const search = document.getElementById('q');

const words = () => norm(search.value).split(/\s+/).filter(Boolean);
const matches = (e, w) => w.every((x) => e.haystack.includes(x));
const TYPE_OF_TAB = { gramatike: 'gramatike', fjalor: 'fjale', blog: 'blog' };
export const TAB_OF_TYPE = { gramatike: 'gramatike', fjale: 'fjalor', blog: 'blog' };

// the tabs; while searching, each shows how many of its entries match
const renderTabs = () => {
    const w = words();
    const tab = (t) => {
        const n = w.length ? ENTRIES.filter((e) => e.type === TYPE_OF_TAB[t.id] && matches(e, w)).length : null;
        const count = n === null ? '' : `<span class="n">${n}</span>`;
        return `<button type="button" role="tab" data-tab="${t.id}" aria-selected="${t.id === state.tab}">${t.label}${count}</button>`;
    };
    tabsEl.innerHTML = TABS.map(tab).join('');
};

// "Kit" and one button per group, each with its count
const filterButtons = (groups, key, field, all) => {
    const btn = (id, label, n, sub) => {
        const cls = sub ? ' class="sub"' : '';
        return `<button type="button" data-filter="${id}"${cls} aria-pressed="${state[key] === id}">${label}<span class="n">${n}</span></button>`;
    };
    const groupBtn = (g) => btn(g.id, g.label, all.filter((e) => e[field] === g.id).length, key === 'fjalor');
    return `<div class="filter" data-key="${key}">${btn('all', 'Kit', all.length)}${groups.map(groupBtn).join('')}</div>`;
};

const grammarMenu = () => {
    const active = !words().length;
    const item = (x) => `<button type="button" data-item="${x.id}" aria-pressed="${active && state.item === x.id}">${x.label}</button>`;
    const group = (g) => `<p class="filter-label">${g.label}</p><div class="filter">${g.items.map(item).join('')}</div>`;
    return TAXONOMY.grammarMenu.map(group).join('');
};
const sortButtons = () => {
    const dateLabel = state.by === 'date' && state.dir === 'asc' ? 'Ma t’vjetrat' : 'Ma t’rejat';
    const alphaLabel = state.by === 'alpha' && state.dir === 'desc' ? 'Zh–A' : 'A–Zh';
    return `<div class="sort">
                <button type="button" data-by="date" aria-pressed="${state.by === 'date'}">${dateLabel}</button>
                <button type="button" data-by="alpha" aria-pressed="${state.by === 'alpha'}">${alphaLabel}</button>
            </div>`;
};
const renderPanel = () => {
    panel.dataset.tab = state.tab;
    if (state.tab === 'gramatike') {
        panel.innerHTML = grammarMenu();
    } else if (state.tab === 'fjalor') {
        const dictionary = ENTRIES.filter((e) => e.type === 'fjale');
        panel.innerHTML = filterButtons(TAXONOMY.dictionaryCategories, 'fjalor', 'sub', dictionary) + sortButtons();
    } else {
        panel.innerHTML = filterButtons(TAXONOMY.blog, 'blog', 'cat', ENTRIES.filter((e) => e.type === 'blog'));
    }
};

// Long lists are split into pages. Changing the tab, filter, sort or search goes back to page 1;
// opening a link to an entry (pageTo) opens the page it is on.
const PAGE_SIZE = { fjalor: 20, blog: 10 };
export let listKey = '';
const paged = (list, key) => {
    const size = PAGE_SIZE[state.tab];
    if (state.restore && state.restore.list === key) {
        state.page = state.restore.page;
        state.pageTo = null;
    } else if (state.pageTo) {
        const i = list.findIndex((e) => e.id === state.pageTo);
        state.page = i < 0 ? 1 : Math.floor(i / size) + 1;
        state.pageTo = null;
    } else if (key !== listKey) {
        state.page = 1;
    }
    listKey = key;
    const pages = Math.max(1, Math.ceil(list.length / size));
    state.page = Math.min(Math.max(1, state.page || 1), pages);
    return { items: list.slice((state.page - 1) * size, state.page * size), pager: pagerHtml(state.page, pages) };
};
// page buttons: the first, the last and the ones around the current page, with … between gaps
const pagerHtml = (current, pages) => {
    if (pages < 2) return '';
    const show = [...new Set([1, current - 1, current, current + 1, pages])]
        .filter((n) => n >= 1 && n <= pages)
        .sort((a, b) => a - b);
    const btn = (n, label, aria) => {
        const ariaLabel = aria ? ` aria-label="${aria}"` : '';
        const isCurrent = n === current && !aria ? ' aria-pressed="true" aria-current="page"' : '';
        return `<button type="button" data-page="${n}"${ariaLabel}${isCurrent}>${label}</button>`;
    };
    const nums = show.map((n, i) => (i && n - show[i - 1] > 1 ? '<span class="gap">…</span>' : '') + btn(n, n)).join('');
    const prev = current > 1 ? btn(current - 1, '‹', 'Faqja para') : '';
    const next = current < pages ? btn(current + 1, '›', 'Faqja mbas') : '';
    return `<nav class="chips pager" aria-label="Faqet">${prev}${nums}${next}</nav>`;
};

// Gramatikë without a search: a tense page, pjesorja / përcjellorja, or another item's cards with chips to switch
const grammarItemView = () => {
    const it = ITEMS.find((x) => x.id === state.item) || ITEMS[0];
    if (TENSE_IDS.includes(it.id)) return tensePage(it.id);
    if (it.id === PARTICIPLE.tense) return nonFiniteView(PARTICIPLE, 'Pjesorja');
    if (it.id === GERUND.tense) return nonFiniteView(GERUND, 'Përcjellorja');
    const cards = ENTRIES
        .filter((e) => e.type === 'gramatike' && e.item === it.id)
        .sort((a, b) => variantRank(a.v) - variantRank(b.v));
    const current = cards.find((e) => e.v === state.v[it.id]) || cards[0];
    const chip = (e) => ({ label: e.v, attrs: `data-v="${esc(e.v)}"`, pressed: e === current });
    const pills = cards.some((e) => e.v) ? chipRow(cards.map(chip), { big: true }) : '';
    return `<section class="gview"><h2>${it.label}</h2>${pills}${current ? gramCard(current, false) : ''}</section>`;
};
// the Fjalor or Blog list after the filter, the search and (in the admin's preview) the one entry shown
const listOf = (type, filterKey, field, w) => ENTRIES.filter((e) => e.type === type
    && (state[filterKey] === 'all' || e[field] === state[filterKey])
    && matches(e, w)
    && (!state.only || e.id === state.only));
export const renderView = () => {
    const w = words();
    if (state.tab === 'gramatike' && !w.length) {
        const page = grammarItemView();
        view.innerHTML = page;
        // tense, pjesore and përcjellore pages are never "empty"
        const it = ITEMS.find((x) => x.id === state.item) || ITEMS[0];
        const isVerbPage = TENSE_IDS.includes(it.id) || NON_FINITE.includes(it.id);
        empty.hidden = isVerbPage || !!view.querySelector('article');
        return;
    }
    let html;
    if (state.tab === 'gramatike') {
        const hits = ENTRIES.filter((e) => e.type === 'gramatike' && matches(e, w));
        html = `<div class="list">${hits.map((e) => gramCard(e, true)).join('')}</div>`;
    } else if (state.tab === 'fjalor') {
        const list = listOf('fjale', 'fjalor', 'sub', w);
        list.sort((a, b) => (state.by === 'alpha' ? a.key.localeCompare(b.key, 'sq') : a.date.localeCompare(b.date)));
        if (state.dir === 'desc') list.reverse();
        const pg = paged(list, ['fjalor', state.fjalor, state.by, state.dir, w.join(' ')].join('|'));
        html = `${pg.pager}<div class="list">${pg.items.map(wordCard).join('')}</div>${pg.pager}`;
    } else {
        const list = listOf('blog', 'blog', 'cat', w);
        list.sort((a, b) => b.date.localeCompare(a.date));
        const pg = paged(list, ['blog', state.blog, w.join(' ')].join('|'));
        html = `${pg.pager}<div class="blog">${pg.items.map(blogPost).join('')}</div>${pg.pager}`;
    }
    view.innerHTML = html;
    empty.hidden = !!view.querySelector('article');
};

export const render = () => {
    renderTabs();
    renderPanel();
    renderView();
};

const toTop = () => {
    const top = document.querySelector('.layout').getBoundingClientRect().top + window.scrollY - 8;
    if (window.scrollY > top) window.scrollTo({ top });
};

const setHash = (h) => history.replaceState(null, '', h ? '#' + h : location.pathname);

// clicks on the tabs and in the side panel
export const wireTabsAndPanel = () => {
    tabsEl.addEventListener('click', (e) => {
        const b = e.target.closest('[data-tab]');
        if (!b) return;
        state.tab = b.dataset.tab;
        render();
        setHash(state.tab);
        toTop();
    });

    panel.addEventListener('click', (e) => {
        const it = e.target.closest('[data-item]');
        const f = e.target.closest('[data-filter]');
        const by = e.target.closest('[data-by]');
        if (it) {
            search.value = '';
            state.item = it.dataset.item;
            render();
            setHash(slug(LABEL[state.item]));
            toTop();
        } else if (f) {
            const key = f.closest('.filter').dataset.key;
            state[key] = f.dataset.filter;
            renderPanel();
            renderView();
            setHash(state[key] === 'all' ? state.tab : state[key]);
            toTop();
        } else if (by) {
            if (state.by === by.dataset.by) {
                state.dir = state.dir === 'asc' ? 'desc' : 'asc';
            } else {
                state.by = by.dataset.by;
                state.dir = state.by === 'alpha' ? 'asc' : 'desc';
            }
            renderPanel();
            renderView();
        }
    });
};

// keep: an element of the card that must stay in the page untouched (the tense <select>: replacing or even
// moving it while iOS has its picker open leaves the picker stuck, and focusing a copy reopens it).
// Everything around it is swapped for the fresh card's nodes, level by level up to the card.
const redrawCard = (id, focusSel, keep) => {
    const card = document.getElementById(id);
    const entry = byId[id];
    if (!card || !entry) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = wordCard(entry);
    const fresh = tmp.firstElementChild;
    const copy = keep && card.contains(keep) && fresh.querySelector(focusSel);
    if (copy) {
        keep.dataset.cur = copy.dataset.cur;
        for (let o = keep, n = copy; o !== card; o = o.parentElement, n = n.parentElement) {
            const kids = [...n.parentElement.childNodes];
            const at = kids.indexOf(n);
            [...o.parentElement.childNodes].forEach((c) => { if (c !== o) c.remove(); });
            o.before(...kids.slice(0, at));
            o.after(...kids.slice(at + 1));
        }
        return;
    }
    card.replaceWith(fresh);
    const again = document.querySelector(focusSel);
    if (again) again.focus({ preventScroll: true });
};

// a verb card's Koha dropdown
export const wireTenseSelect = () => {
    view.addEventListener('change', (e) => {
        const sel = e.target.closest('[data-zg]');
        if (!sel) return;
        const id = sel.dataset.zg;
        const entry = byId[id];
        if (!entry) return;
        const prev = (tenseChoice[id] || sel.dataset.cur || '').split('|')[1];
        const has = (c) => entry.words.some((w) => formsFor(w, c));
        const moods = COMBOS.filter((c) => c.tense === sel.value);
        const next = moods.find((c) => c.mood === prev) || moods.find(has) || moods[0];
        if (next) tenseChoice[id] = comboKey(next);
        redrawCard(id, `[data-zg="${id}"]`, sel);
    });
};

// the page buttons
export const wirePager = () => {
    view.addEventListener('click', (e) => {
        const b = e.target.closest('[data-page]');
        if (!b) return;
        state.page = Number(b.dataset.page);
        renderView();
        toTop();
    });
};

// a verb card's mood chips, and a Gramatikë page's mood / case chips
export const wireCardChips = () => {
    view.addEventListener('click', (e) => {
        const b = e.target.closest('[data-zgm]');
        if (!b) return;
        tenseChoice[b.dataset.zgm] = b.dataset.combo;
        redrawCard(b.dataset.zgm, `[data-zgm="${b.dataset.zgm}"][aria-pressed="true"]`);
    });

    view.addEventListener('click', (e) => {
        const b = e.target.closest('[data-v]');
        if (!b) return;
        state.v[state.item] = b.dataset.v;
        renderView();
        if (TENSE_IDS.includes(state.item)) {
            const g = ENTRIES.find((x) => x.type === 'gramatike' && x.tense === state.item && x.mood === b.dataset.v);
            setHash(g ? g.id : slug(LABEL[state.item]));
            return;
        }
        const current = ENTRIES.find((x) => x.item === state.item && x.v === b.dataset.v);
        if (current) setHash(current.id);
    });
};

// Redraw a moment after typing stops, so a long list doesn't re-render on every keystroke.
let searchTimer = 0;
// the search box
export const wireSearch = () => {
    search.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            renderTabs();
            if (state.tab === 'gramatike') renderPanel();
            renderView();
        }, 120);
    });
};
