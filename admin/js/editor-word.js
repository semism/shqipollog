// The Fjalor editor around the per-kind parts: kind, word, gender, std, noun cases, text fields.

import { TAXONOMY } from '/taxonomy.js';
import { el } from './core.js';
import { recorder } from './recording.js';
import { adverbKindsPicker, choose, lines, nounGrid, section, text } from './fields.js';
import { changeSub, WORD_SHAPE } from './editor-common.js';
import { verbEditor } from './editor-verb.js';
import { adjEditor } from './editor-adjective.js';

const GENDERS = [['', '—'], ['mashkullore', 'mashkullore'], ['femërore', 'femërore'], ['asnjanëse', 'asnjanëse']];
const NOUN_HINT = 'Plotëso së pari trajtën e shquar të njëjësit dhe trajtën e pashquar të shumësit; rasat e tjera mbushen vetë. '
    + 'Ndrysho një kuti vetëm nëse forma nuk duket e saktë.';
const ETYMOLOGY_HINT = 'Opsionale: prej ku vjen fjala. Një paragraf për kuti. '
    + 'Lidhje: [[fjala]] te një fjalë e fjalorit, [tekst](https://…) te një faqe tjetër.';
export const fjaleEditor = (e) => {
    const words = WORD_SHAPE[e.sub] === 'words';
    const grid = e.sub === 'emra' ? nounGrid(e) : null;
    const head = section('fjala',
            choose(e, 'sub', 'sub', TAXONOMY.dictionaryCategories.map((x) => [x.id, x.label]), (v) => changeSub(e, v)),
            words ? null : text(e, 'word', 'word'),
            e.sub === 'emra' ? choose(e, 'gender', 'gender', GENDERS) : null,
            e.sub === 'ndajfolje' ? adverbKindsPicker(e) : null,
            words ? null : text(e, 'std', 'std'),
            words ? null : recorder(e),
            text(e, 'pronunciation', 'pronunciation'));
    // the word and the gender feed the derived noun cases: refresh the grid's placeholders as they change
    if (grid) ['input', 'change'].forEach((t) => head.addEventListener(t, () => grid.refresh()));
    return [
        head,
        e.sub === 'folje' ? verbEditor(e) : null,
        e.sub === 'mbiemra' ? adjEditor(e) : null,
        grid ? section('declension', el('p', { class: 'hint' }, NOUN_HINT), grid) : null,
        section('teksti',
            lines(e, 'meaning', 'meaning'),
            lines(e, 'variants', 'variants', 'Variante të kësaj fjale (në faqe dalin nën “variacion”).', e),
            text(e, 'variantsNote', 'variantsNote'),
            lines(e, 'examples', 'examples'),
            e.sub === 'emra' ? lines(e, 'etymology', 'etymology', ETYMOLOGY_HINT) : null,
            lines(e, 'footnotes', 'footnotes'),
            lines(e, 'text', 'text')),
    ];
};
