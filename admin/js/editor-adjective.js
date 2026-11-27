// The mbiemra editor: each adjective, its nyjshëm box, its forms and its variants.

import { SHARED } from '/shared.js';
import { changed, el, set } from './core.js';
import { formMics, recorder } from './recording.js';
import { adjGrid, adjWordField, removeBtn, row, section, swap, withArticleLabel } from './fields.js';

export const adjEditor = (e) => {
    e.words = e.words || [{}];
    const box = el('div');
    // after any change that reshuffles the editor
    const again = () => {
        changed();
        redraw();
    };
    const variantBox = (w) => (v, vi) => {
        const removeVariant = () => {
            w.variants.splice(vi, 1);
            set(w, 'variants', w.variants);
            redraw();
        };
        const up = el('button', { class: 'x', type: 'button', title: 'Lart', disabled: vi === 0, onclick: () => { swap(w.variants, vi, vi - 1); again(); } }, '↑');
        const down = el('button', {
            class: 'x', type: 'button', title: 'Poshtë', disabled: vi === w.variants.length - 1,
            onclick: () => { swap(w.variants, vi, vi + 1); again(); },
        }, '↓');
        return el('div', { class: 'sub-box' },
            el('div', { class: 'inline' }, adjWordField(v, 'variant', w), formMics(w, () => [SHARED.adjHead(v, w) || '']), up, down,
                removeBtn('Hiqe variantin', removeVariant)),
            adjGrid(v, w));
    };
    const adjSection = (w, wi) => {
        const several = e.words.length > 1;
        const std = el('input', { type: 'text', value: w.std || '', placeholder: 'mirë', oninput: (ev) => set(w, 'std', ev.target.value) });
        const toggleArticle = (ev) => {
            set(w, 'panyjshem', ev.target.checked ? undefined : true);
            redraw();
        };
        const articleTitle = 'Nyjat i/e/t’ shtohen vetë para formave. Hiqe shenjën për mbiemër të panyjshëm.';
        const articleBox = el('label', { class: 'check', title: articleTitle },
            el('input', { type: 'checkbox', checked: !w.panyjshem, onchange: toggleArticle }), 'nyjshëm');
        const addVariant = () => {
            w.variants = [...(w.variants || []), {}];
            again();
        };
        return section(
            [`mbiemri ${several ? wi + 1 : ''}`, several ? removeBtn('Hiqe', () => { e.words.splice(wi, 1); again(); }) : null],
            el('div', { class: 'inline' }, adjWordField(w, 'word', w), row('std', withArticleLabel(std, w.panyjshem ? null : 'i')), articleBox),
            recorder(w),
            adjGrid(w),
            (w.variants || []).map(variantBox(w)),
            el('button', { class: 'btn small', type: 'button', onclick: addVariant }, '+ Variant'),
        );
    };
    const addAdjective = () => {
        e.words.push({});
        again();
    };
    const redraw = () => box.replaceChildren(
        ...e.words.map(adjSection),
        el('button', { class: 'btn small', type: 'button', onclick: addAdjective }, '+ Mbiemër tjetër në këtë kartë'));
    redraw();
    return box;
};
