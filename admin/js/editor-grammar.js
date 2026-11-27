// The Gramatikë editor: which tense or pronoun page, mood or case, intro, the words' tables, notes.

import { TAXONOMY } from '/taxonomy.js';
import { changed, el, PRONOUNS } from './core.js';
import { choose, lines, personGrid, removeBtn, row, section, text } from './fields.js';
import { draw } from './form-list.js';

export const gramEditor = (e) => {
    const pron = !!e.pronoun;
    const itemId = e.tense || e.pronoun || '';
    const setItem = (id) => {
        const v = e.mood || e.case;
        ['tense', 'pronoun', 'mood', 'case'].forEach((k) => delete e[k]);
        // a pronoun page has cases, a tense page has moods
        if (PRONOUNS.includes(id)) {
            e.pronoun = id;
            if (v) e.case = v;
        } else {
            e.tense = id;
            if (v) e.mood = v;
        }
        changed();
        draw();
    };
    const moodOrCaseKey = pron ? 'case' : 'mood';
    const tense = TAXONOMY.tenses.some((k) => k.id === e.tense);
    const box = el('div');
    // Tense entries hold no forms: those live in the Fjalor verbs.
    if (tense && !(e.words || []).length) {
        delete e.words;
        const hint = 'Format e kësaj kohe plotësohen te foljet në Fjalor; faqja tregon një folje të rastit.';
        box.append(el('p', { class: 'hint' }, hint));
        return gramParts(e, pron, itemId, setItem, moodOrCaseKey, box);
    }
    e.words = e.words || [];
    const again = () => {
        changed();
        redraw();
    };
    const wordSection = (w, wi) => {
        const useExamples = (ev) => {
            if (ev.target.checked) w.examples = w.examples || [];
            else delete w.examples;
            again();
        };
        const examplesBox = el('label', { class: 'check' },
            el('input', { type: 'checkbox', checked: !!w.examples, onchange: useExamples }), 'shembuj në vend të tabelës');
        return section(
            [`fjala ${wi + 1}`, removeBtn('Hiqe', () => { e.words.splice(wi, 1); again(); })],
            el('div', { class: 'inline' }, text(w, 'word', 'word'), text(w, 'std', 'std'), examplesBox),
            w.examples ? lines(w, 'examples', 'examples') : personGrid(w, redraw),
        );
    };
    const addWord = () => {
        e.words.push({});
        again();
    };
    const redraw = () => box.replaceChildren(
        ...e.words.map(wordSection),
        el('button', { class: 'btn small', type: 'button', onclick: addWord }, '+ Fjalë'));
    redraw();
    return gramParts(e, pron, itemId, setItem, moodOrCaseKey, box);
};
const gramParts = (e, pron, itemId, setItem, moodOrCaseKey, box) => {
    // every Gramatikë item but pjesorja and përcjellorja, which have no entries of their own
    const option = (x) => el('option', { value: x.id, selected: x.id === itemId }, x.label);
    const hasEntries = (x) => !['pjesorja', 'percjellorja'].includes(x.id);
    const group = (g) => el('optgroup', { label: g.label }, g.items.filter(hasEntries).map(option));
    const item = el('select', { onchange: (ev) => setItem(ev.target.value) }, TAXONOMY.grammarMenu.map(group));
    const moodOrCase = choose(e, moodOrCaseKey, moodOrCaseKey, [['', '—'], ...TAXONOMY.variants.map((v) => [v, v])]);
    return [
        section('gramatika',
            el('div', { class: 'inline' }, row(pron ? 'pronoun' : 'tense', item), moodOrCase),
            lines(e, 'intro', 'intro', 'Shpjegim mbi tabelë.')),
        box,
        section('teksti', lines(e, 'footnotes', 'footnotes'), lines(e, 'text', 'text')),
    ];
};
