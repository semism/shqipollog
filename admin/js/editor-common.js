// Fields every entry has (date, place, hidden, link id) and switching a Fjalor entry's kind.

import { changed, el, set } from './core.js';
import { row } from './fields.js';
import { draw } from './form-list.js';

// ---------- per-type editors ----------
export const metaFields = (e) => {
    const date = el('input', { type: 'date', value: e.date || '', oninput: (ev) => set(e, 'date', ev.target.value) });
    const place = el('input', { type: 'text', value: e.place || '', oninput: (ev) => set(e, 'place', ev.target.value) });
    const hidden = el('input', { type: 'checkbox', checked: e.draft, onchange: (ev) => set(e, 'draft', ev.target.checked || '') });
    // the link id is shown, not edited
    const id = el('input', { type: 'text', value: e.id || '', placeholder: 'automatike, nga titulli', readOnly: true, tabIndex: -1 });
    return el('div', {},
        el('div', { class: 'inline' }, row('date', date), row('place', place), el('label', { class: 'check draft' }, hidden, 'fshehur (nuk del në faqe)')),
        el('details', {}, el('summary', { class: 'hint' }, 'id-ja e lidhjes'), row('id', id)));
};

export const WORD_SHAPE = { folje: 'words', mbiemra: 'words', emra: 'word', ndajfolje: 'word' };
export const changeSub = (e, sub) => {
    if (WORD_SHAPE[sub] !== WORD_SHAPE[e.sub]) {
        const hasForms = e.declension || (e.words || []).some((w) => Object.keys(w).some((k) => k !== 'word' && k !== 'std'));
        // switching between one word and a list of words drops the forms table
        if (hasForms && !confirm('Ky ndryshim e fshin tabelën e formave. Vazhdo?')) return draw();
        if (WORD_SHAPE[sub] === 'words') {
            e.words = [{ word: e.word || '', std: e.std }];
            ['word', 'std', 'declension', 'gender'].forEach((k) => delete e[k]);
        } else {
            e.word = (e.words || []).map((w) => w.word).filter(Boolean).join(', ');
            const s = (e.words || [])[0] && e.words[0].std;
            if (s) e.std = s;
            delete e.words;
        }
    }
    e.sub = sub;
    changed();
    draw();
};
