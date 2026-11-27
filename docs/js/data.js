// The entries the site shows, and what every entry gets once it is loaded: its link id, its search text,
// a Gramatikë entry's item and forms. prepareEntries() fills ENTRIES, VERBS, byId and helperWord; boot() calls it first.

import { TAXONOMY } from '../taxonomy.js';
import { SHARED } from '../shared.js';
import { LABEL, TABS } from './labels.js';
import { norm, slug } from './format.js';
import { gramForms } from './tables.js';

export let ENTRIES = [];
export let VERBS = [];
export let byId = {};
export let helperWord = null;   // the helper verb (kom), whose recordings fill in other verbs' compound tenses


export const { asList, day, PERSON_KEYS, PERSON_LABEL, personsOf, CASES, comboKey, COMBOS } = SHARED;

const texts = (x) => {
    if (!x) return [];
    if (typeof x === 'string') return [x];
    if (Array.isArray(x)) return x.flatMap(texts);
    return Object.values(x).flatMap(texts);
};
export const wordTitle = (e) => {
    if (e.word) return e.word;
    return (e.words || []).map((w) => (e.sub === 'mbiemra' ? SHARED.adjHead(w) : w.word)).join(', ');
};
const titleOf = (e) => {
    if (e.type === 'gramatike') return LABEL[e.item];
    return e.type === 'fjale' ? wordTitle(e) : e.title;
};

// Every entry's link id (#vdore): fixed by e.id, else from its title; a taken one gets -2, -3…
// what a link id is made from
const idSource = (e) => {
    if (e.type === 'gramatike') return `${LABEL[e.item]} ${e.v || ''}`;
    return e.type === 'fjale' ? wordTitle(e) : e.title;
};

export const prepareEntries = (ALL, withDrafts) => {
    // Drafts stay off the site, but hidden verbs can still be shown as a tense's examples.
    ENTRIES = withDrafts ? ALL : ALL.filter((e) => !e.draft);
    VERBS = ALL
        .filter((e) => e.type === 'fjale' && e.sub === 'folje')
        .flatMap((e) => (e.words || []).map((w) => ({ w, e })));
    helperWord = (VERBS.find((v) => SHARED.isHelper(v.w)) || {}).w;

    ENTRIES.forEach((e) => {
        if (e.type !== 'gramatike') return;
        e.item = e.tense || e.pronoun;
        e.v = e.mood || e.case;
    });

    // Every entry's link id (#vdore): fixed by e.id, else from its title; a taken one gets -2, -3…
    const used = new Set([...TABS, ...TAXONOMY.dictionaryCategories, ...TAXONOMY.blog].map((x) => x.id));
    ENTRIES.forEach((e) => {
        const base = e.id || slug(idSource(e));
        let id = base;
        for (let n = 2; used.has(id); n++) id = base + '-' + n;
        used.add(id);
        e.id = id;
        e.key = titleOf(e).toLowerCase().replace(/[“”"’']/g, '');
        const searchable = [titleOf(e), e, LABEL[e.sub], LABEL[e.cat], e.sub === 'emra' ? SHARED.nounDerived(e) : null];
        e.haystack = norm(texts(searchable).join(' '));
    });
    byId = Object.fromEntries(ENTRIES.map((e) => [e.id, e]));
    ENTRIES.forEach((e) => { if (e.type === 'gramatike') e.forms = gramForms(e); });
};
