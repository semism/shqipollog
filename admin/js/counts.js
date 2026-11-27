// The small tags on an entry: recordings (own / from pieces / none) and how many of a verb's tenses are filled.

import { SHARED } from '/shared.js';
import { asList, cached, CASES, el, PERSONS } from './core.js';
import { helper, progress } from './tenses.js';

// ---------- recording count: own clip / built from pieces (the linker) / nothing yet ----------
// Every distinct form of a Fjalor entry, with the word whose recordings it belongs to.
const formsOf = (e) => {
    const out = [];
    const add = (owner, v) => asList(v).forEach((f) => {
        const form = String(f).trim();
        if (form) out.push([owner, form]);
    });
    if (e.type !== 'fjale') return out;
    if (e.sub === 'folje') {
        (e.words || []).forEach((w) => {
            add(w, w.participle);
            const columns = (w.conjugation || []).flatMap((tenseMood) => [tenseMood, ...(tenseMood.variants || [])]);
            columns.forEach((o) => PERSONS.forEach((p) => add(w, o[p])));
        });
    } else if (e.sub === 'mbiemra') {
        (e.words || []).forEach((w) => [w, ...(w.variants || [])].forEach((v) => {
            add(w, SHARED.adjHead(v, w));
            ['njejes', 'shumes'].forEach((n) => ['m', 'f'].forEach((g) => add(w, SHARED.adjForm(v, n, g, w))));
        }));
    } else {
        add(e, e.word);
        const der = SHARED.nounDerived(e);
        SHARED.NOUN_COLS.forEach(([n, d]) => CASES.forEach(([k]) => add(e, (SHARED.nounCell(e, der, n, d, k) || {}).v)));
        (e.variants || []).forEach((v) => add(e, v));
    }
    return out;
};
export const audioStats = (e) => {
    const seen = new Set();
    const n = { own: 0, linked: 0, none: 0 };
    const aux = helper();
    formsOf(e).forEach(([owner, f]) => {
        const key = (owner.word || owner.std || '') + '\u0000' + f.replace(/'/g, '’');
        if (seen.has(key)) return;
        seen.add(key);
        // a headword's own clip is its `audio` (for verbs SHARED.clipsOf already maps it to the present's "un")
        let own = SHARED.clipsOf(owner);
        if (!owner.conjugation) {
            own = { ...(owner.audios || {}) };
            if (owner.audio && owner.word) own[owner.word] = owner.audio;
        }
        const chain = SHARED.clipChain(own, f, owner.conjugation ? aux : null);
        if (!chain) n.none += 1;
        else if (chain.linked) n.linked += 1;
        else n.own += 1;
    });
    return n;
};
// shown once anything of the entry can be heard
export const audioTag = (e) => {
    const n = cached(e, 'audio', () => audioStats(e));
    if (!n.own && !n.linked) return null;
    const title = `${n.own} me inçizim të vet, ${n.linked} nga pjesët (zëvendësoji me inçizim të vet), ${n.none} pa zë`;
    return el('span', { class: 'tag-audio', title }, `🎙 ${n.own}`, n.linked ? ` · pjesët ${n.linked}` : '', n.none ? ` · pa ${n.none}` : '');
};

export const progressTag = (e) => {
    if (e.type !== 'fjale' || e.sub !== 'folje') return null;
    const pr = cached(e, 'progress', () => progress(e));
    if (!pr) return null;
    if (pr.done === pr.total) return el('span', { class: 'tag-done', title: 'Të gjitha kohët janë plotësuar' }, 'plotë');
    return el('span', { class: 'tag-count', title: 'Mungojnë: ' + pr.missing.join(', ') }, `${pr.done}/${pr.total}`);
};
