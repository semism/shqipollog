// Names of things from taxonomy.js that every part of the site uses: the tabs, the Gramatikë menu items, labels by id.

import { TAXONOMY } from '../taxonomy.js';

export const verbKey = (w) => w.word || w.std || '';
// in the order they show; soon: a tab with nothing in it yet ("Së shpejti.")
export const TABS = [
    { id: 'fjalor', label: 'Fjalor' },
    { id: 'gramatike', label: 'Gramatikë' },
    { id: 'blog', label: 'Blog' },
    { id: 'lojera', label: 'Lojëra', soon: true },
];
export const ITEMS = TAXONOMY.grammarMenu.flatMap((g) => g.items);
export const LABEL = Object.fromEntries(
    [...TAXONOMY.tenses, ...TAXONOMY.dictionaryCategories, ...TAXONOMY.blog, ...ITEMS].map((x) => [x.id, x.label]));
export const variantRank = (v) => (v ? TAXONOMY.variants.indexOf(v) : -1);
