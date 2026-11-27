// Starting the site: boot() prepares the entries, hooks up every control, then opens what the address (#…) points to.
// Also: coming back to the same place after a refresh, and the phone's sliding search bar.

import { TAXONOMY } from '../taxonomy.js';
import { ITEMS, TABS } from './labels.js';
import { byId, ENTRIES, prepareEntries } from './data.js';
import { slug } from './format.js';
import { wireVerbPicker } from './tense-pages.js';
import {
    listKey, render, search, state, TAB_OF_TYPE, wireCardChips, wirePager, wireSearch, wireTabsAndPanel,
    wireTenseSelect,
} from './views.js';
import { wirePlayer } from './audio.js';
import { wireSave, wireShare } from './share-save.js';
import { wireTheme } from './theme.js';

// #… in the address: a tab, a Fjalor or Blog group, a Gramatikë item, or one entry
const openHash = () => {
    const h = decodeURIComponent(location.hash.slice(1));
    let target = null;
    const item = ITEMS.find((x) => slug(x.label) === h);
    if (TABS.some((t) => t.id === h)) {
        state.tab = h;
    } else if (TAXONOMY.dictionaryCategories.some((x) => x.id === h)) {
        state.tab = 'fjalor';
        state.fjalor = h;
    } else if (TAXONOMY.blog.some((x) => x.id === h)) {
        state.tab = 'blog';
        state.blog = h;
    } else if (item) {
        state.tab = 'gramatike';
        state.item = item.id;
    } else if (byId[h]) {
        const e = byId[h];
        search.value = '';
        state.tab = TAB_OF_TYPE[e.type];
        if (e.type === 'gramatike') {
            state.item = e.item;
            state.v[e.item] = e.v;
        } else {
            state[state.tab] = 'all';
            state.pageTo = h;
            target = h;
        }
    }
    render();
    const el = target && !state.restore && document.getElementById(target);
    if (el) {
        el.classList.add('focus');
        el.scrollIntoView({ block: 'start' });
    }
};

const boot = (ALL, focus, withDrafts) => {
    prepareEntries(ALL, withDrafts);
    // in the order they were always hooked up
    wireTabsAndPanel();
    wireTenseSelect();
    wireShare();
    wirePlayer();
    wireSave();
    wirePager();
    wireVerbPicker();
    wireCardChips();
    wireSearch();
    wireTheme();

    if (focus !== undefined && ENTRIES[focus]) {
        state.only = ENTRIES[focus].id;
        history.replaceState(null, '', '#' + ENTRIES[focus].id);
    }
    // A refresh comes back to where you were: same #…, same list page, same scroll position.
    // (The browser can't restore the scroll by itself: the content is drawn only after entries.json loads.)
    const PLACE = 'shqipollog-place';
    const reloaded = (performance.getEntriesByType('navigation')[0] || {}).type === 'reload';
    let place = null;
    if (!PREVIEW) {
        if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
        try { place = reloaded ? JSON.parse(sessionStorage.getItem(PLACE) || 'null') : null; } catch (e) {}
        if (place && place.hash !== location.hash) place = null;
        window.addEventListener('pagehide', () => {
            const where = { hash: location.hash, y: Math.round(scrollY), page: state.page, list: listKey };
            try { sessionStorage.setItem(PLACE, JSON.stringify(where)); } catch (e) {}
        });
    }
    // Phone: the sticky bar (search, tabs, filters) is a quarter of the screen. It slides away while
    // scrolling down and comes back on any scroll up. Never while typing in it.
    const side = document.querySelector('.side');
    const narrow = matchMedia('(max-width: 860px)');
    let lastY = scrollY;
    window.addEventListener('scroll', () => {
        const y = scrollY;
        const dy = y - lastY;
        if (Math.abs(dy) < 6) return;
        lastY = y;
        const stuck = narrow.matches && side.getBoundingClientRect().top <= 1 && y > side.parentElement.offsetTop;
        side.classList.toggle('tucked', stuck && dy > 0 && !side.contains(document.activeElement));
    }, { passive: true });

    if (place) state.restore = place;
    window.addEventListener('hashchange', openHash);
    openHash();
    if (place) {
        state.restore = null;
        window.scrollTo(0, place.y);
    }
};

const PREVIEW = new URLSearchParams(location.search).has('preview') && window.parent !== window;
if (PREVIEW) {
    document.documentElement.classList.add('preview');
    window.addEventListener('message', (m) => {
        if (m.origin !== location.origin || !m.data || !Array.isArray(m.data.entries)) return;
        boot(m.data.entries, m.data.focus, true);
    }, { once: true });
    window.parent.postMessage('ready', location.origin);
} else {
    fetch('entries.json')
        .then((r) => r.json())
        .then((list) => boot(list));
}
