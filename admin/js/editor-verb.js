// The folje editor: each verb's word, std, pjesore and its tenses.

import { changed, el, personsOf, reviewBox } from './core.js';
import { recorder } from './recording.js';
import { formCell, labelFor, lines, personGrid, removeBtn, section, text } from './fields.js';
import { autoFill, comboSelect, deriveAny, describe, fill, freeCombo, isPresentIndicative, ruleFor } from './tenses.js';

// one tense of a verb: its koha/mood picker, Mbush, its rule, its persons grid and its notes
const tenseBox = (w, tenseMood, index, redraw) => {
    const rule = ruleFor(tenseMood, w);
    const d = rule ? deriveAny(rule, w, tenseMood) : null;
    // the present is filled from its own "un" box, which may be typed after this was drawn: work the rule out on click
    const fillNow = () => {
        const r = ruleFor(tenseMood, w);
        if (r) fill(tenseMood, deriveAny(r, w, tenseMood));
        changed();
        redraw();
    };
    const fillBtn = rule ? el('button', {
        class: 'btn small', type: 'button', disabled: !!d.missing && !isPresentIndicative(tenseMood),
        title: 'Mbush kutitë bosh sipas rregullit', onclick: fillNow,
    }, 'Mbush') : null;
    const removeTense = () => {
        w.conjugation.splice(index, 1);
        changed();
        redraw();
    };
    let ruleHint = null;
    if (rule) {
        const missing = d.missing ? ' Mungon: ' + d.missing + '.' : '';
        const note = d.note ? ' ' + d.note + '.' : '';
        ruleHint = el('p', { class: 'hint' }, `Rregull: ${describe(rule, w, tenseMood)}.${missing}${note}`);
    }
    return el('div', { class: 'sub-box' },
        el('div', { class: 'inline' }, comboSelect(w, tenseMood, redraw), fillBtn, reviewBox(tenseMood, 'review'), removeBtn('Hiqe këtë kohë', removeTense)),
        ruleHint,
        personGrid(tenseMood, redraw, personsOf(tenseMood.mood), w),
        lines(tenseMood, 'footnotes', 'footnotes', 'Shënime vetëm për këtë kohë. Dalin nën tabelë.'));
};
export const verbEditor = (e) => {
    e.words = e.words || [{}];
    const box = el('div');
    const verbSection = (w, wi) => {
        const removeVerb = () => {
            e.words.splice(wi, 1);
            changed();
            redraw();
        };
        const addTense = () => {
            const next = freeCombo(w);
            const tenseMood = { tense: next.tense, mood: next.mood };
            w.conjugation.push(tenseMood);
            autoFill(tenseMood, w);
            changed();
            redraw();
        };
        const several = e.words.length > 1;
        const participle = el('div', { class: 'row' }, el('label', {}, labelFor('participle')), el('div', {}, formCell(w, 'participle', w)));
        w.conjugation = w.conjugation || [];
        return section(
            [`folja ${several ? wi + 1 : ''}`, several ? removeBtn('Hiqe foljen', removeVerb) : null],
            el('div', { class: 'inline' }, text(w, 'word', 'word'), text(w, 'std', 'std'), participle, reviewBox(w, 'participleReview')),
            recorder(w),
            el('p', { class: 'hint' }, 'Pjesorja: një për rresht nëse ka variacione. Përdoret për t’i mbushur kohët e përbëra.'),
            w.conjugation.map((tenseMood, i) => tenseBox(w, tenseMood, i, redraw)),
            el('div', { class: 'adds sub-box' }, el('button', { class: 'btn small', type: 'button', disabled: !freeCombo(w), onclick: addTense }, '+ Kohë')),
            el('p', { class: 'hint' }, 'Kohët që mungojnë këtu, faqja i merr vetë nga Gramatika nëse folja është atje (me të njëjtin word ose std).'),
        );
    };
    const addVerb = () => {
        e.words.push({ conjugation: [] });
        changed();
        redraw();
    };
    const redraw = () => box.replaceChildren(
        ...e.words.map(verbSection),
        el('button', { class: 'btn small', type: 'button', onclick: addVerb }, '+ Folje tjetër në këtë kartë'));
    redraw();
    return box;
};
