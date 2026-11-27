// Logic used by both the site (docs/js/) and the admin (admin/js/): search matching, tense rules as text, the recordings
// linker, adjectives' articles and derived noun cases.

import { TAXONOMY } from './taxonomy.js';

export const SHARED = (() => {
    const asList = (v) => {
        if (v === undefined || v === null || v === '') return [];
        return Array.isArray(v) ? v : [v];
    };
    const day = (d) => {
        if (!d) return '';
        return new Date(d + 'T00:00:00').toLocaleDateString('sq-AL', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    // Persons (un … ato) with their labels; the persons a mood has (urdhërore: taj, ju); the five noun cases.
    const PERSON_KEYS = ['un', 'taj', 'aj', 'ne', 'ju', 'ato'];
    const PERSON_LABEL = Object.fromEntries(PERSON_KEYS.map((k, i) => [k, TAXONOMY.persons[i]]));
    const personsOf = (mood) => (TAXONOMY.moods.find((m) => m.id === mood) || {}).persons || PERSON_KEYS;
    const CASES = [
        ['emerore', 'emërore'],
        ['gjinore', 'gjinore'],
        ['dhanore', 'dhanore'],
        ['kallezore', 'kallëzore'],
        ['rrjedhore', 'rrjedhore'],
    ];

    // Every valid tense + mood pair, in order, from TAXONOMY.tenses / TAXONOMY.moods.
    const comboKey = (c) => `${c.tense}|${c.mood}`;
    const COMBOS = TAXONOMY.tenses.flatMap((tense) => TAXONOMY.moods
        .filter((mood) => mood.tenses.includes(tense.id))
        .map((mood) => ({ tense: tense.id, mood: mood.id, key: `${tense.id}|${mood.id}` })));

    // Text for search matching: no accents, lowercase, and no quotes/apostrophes or **bold** / {highlight} marks.
    const norm = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’'“”"*{}]/g, '');

    // "Nuk përdoret": the pair is in TAXONOMY.unused, except for the helper verb when a rule builds a tense from that pair of it.
    // kam / kom, the helper verb
    const isHelper = (w) => !!w && (w.std === TAXONOMY.auxiliary || w.word === TAXONOMY.auxiliary);
    const AUX_KEYS = (TAXONOMY.rules || []).filter((r) => r.aux).map((r) => r.aux.join('|'));
    const helperOnly = (w, key) => isHelper(w) && AUX_KEYS.includes(key);
    const unusedFor = (w, key) => (TAXONOMY.unused || []).includes(key) && !helperOnly(w, key);

    // How a tense is built, from TAXONOMY.rules: e.g. “t’” + kam, e tashme (lidhore) + pjesore
    const INDEFINITE = Object.fromEntries(TAXONOMY.tenses.map((k) => [k.id, k.indefinite || k.label]));
    const comboName = ([tense, mood]) => `${INDEFINITE[tense] || tense} (${mood})`;
    const sourcesOf = (r) => r.from || [{ aux: r.aux, self: r.self, strip: r.strip }];
    const sourceText = (src) => {
        const from = src.aux ? `${TAXONOMY.auxiliary}, ${comboName(src.aux)}` : comboName(src.self);
        const without = src.strip ? ` pa “${src.strip.trim()}”` : '';
        const thirdPerson = src.aj ? ' (aj/ajo: “un” + -e)' : '';
        return from + without + thirdPerson;
    };
    const ruleText = (r) => {
        const parts = [
            r.pre ? `“${r.pre.trim()}”` : null,
            sourcesOf(r).map(sourceText).join(', ose '),
            r.participle ? 'pjesore' : null,
        ];
        return parts.filter(Boolean).join(' + ');
    };
    const ruleOf = (tense, mood) => (TAXONOMY.rules || []).find((r) => r.tense === tense && r.mood === mood);
    // Pairs in TAXONOMY.sameForms share another pair's forms: "nisoj si e tashme (kushtore)"
    const linkText = (tense, mood) => {
        const sameAs = (TAXONOMY.sameForms || {})[`${tense}|${mood}`];
        return sameAs ? `nisoj si ${comboName(sameAs.split('|'))}` : '';
    };

    // A verb's headword is its e tashme (dëftore) "un", so that form's recording is the headword's own `audio`.
    const headForm = (w) => {
        const present = ((w && w.conjugation) || []).find((c) => c.tense === 'tashmja' && c.mood === 'dëftore');
        return present ? String(asList(present.un)[0] || '').trim() : '';
    };
    // every recorded form of a word: its `audios`, plus the headword's `audio` under its "un" form
    const clipsOf = (w) => {
        if (!w) return null;
        const un = headForm(w);
        if (w.audio && un) return { ...(w.audios || {}), [un]: w.audio };
        return w.audios || null;
    };

    // Linker: what plays for a form. Its own recording if it has one; otherwise recorded pieces of it one after another,
    // longest piece first ("dë kisha ardh" = "dë kisha" + "ardh"), looked up in the word's own recordings and, for verbs,
    // the helper verb's (helper: the kom word, whose kom, kisha, dë kisha… then serve every verb). t'kem = t’kem.
    // Returns { paths, linked } (linked: built from pieces) or null.
    const toCurlyApostrophe = (t) => String(t).trim().replace(/'/g, '’');
    const clipsByForm = (clips) => {
        if (!clips) return {};
        return Object.fromEntries(Object.entries(clips).map(([form, path]) => [toCurlyApostrophe(form), path]));
    };
    const clipChain = (own, form, helper = null) => {
        const maps = [clipsByForm(own), clipsByForm(helper ? clipsOf(helper) : null)];
        const find = (t) => maps.map((m) => m[t]).find(Boolean);
        const parts = toCurlyApostrophe(form || '').split(/\s+/).filter(Boolean);
        if (!parts.length) return null;
        const paths = [];
        for (let i = 0; i < parts.length;) {
            let j = parts.length;
            while (j > i && !find(parts.slice(i, j).join(' '))) j--;
            if (j === i) return null;
            paths.push(find(parts.slice(i, j).join(' ')));
            i = j;
        }
        return { paths, linked: !maps[0][parts.join(' ')] };
    };

    // Adjectives: forms (and the word) are stored without their article. A nyjshëm adjective (the default; panyjshem: true
    // on the word turns it off) shows i (njëjës m, and the word), e (njëjës f), t’ (shumës) in front. A variant follows its word.
    const ADJ_ARTICLES = { njejes: { m: 'i', f: 'e' }, shumes: { m: 't’', f: 't’' } };
    const adjArticle = (n, g) => ADJ_ARTICLES[n][g] + (n === 'njejes' ? ' ' : '');   // i majr, but t’majr
    // the article in front of every form: of a list, and of each line of a box with several forms
    const withArticle = (v, article) => {
        if (Array.isArray(v)) return v.map((x) => withArticle(x, article));
        return String(v).split('\n').map((line) => (line.trim() ? article + line.trim() : line)).join('\n');
    };
    const adjForm = (w, n, g, owner = w) => {
        const form = (w[n] || {})[g];
        if (!form || owner.panyjshem) return form;
        return withArticle(form, adjArticle(n, g));
    };
    const adjHead = (w, owner = w) => (!w.word || owner.panyjshem ? w.word : withArticle(w.word, 'i '));
    const adjStd = (w) => (!w.std || w.panyjshem ? w.std : withArticle(w.std, 'i '));   // std: mirë → i mirë

    // ndajfolje types: "mënyre, kohe"
    const adverbKindLabel = (id) => (TAXONOMY.adverbKinds.find((x) => x.id === id) || { label: id }).label;
    const adverbKindsText = (e) => (e.adverbKinds || []).map(adverbKindLabel).join(', ');

    // Noun cases worked out from three typed forms: the word, the definite singular (njëjës e shquar emërore, or e.def)
    // and the plural (shumës e pashquar emërore). Nothing derived is stored: a typed box always wins, an empty one shows this.
    // A box with several forms (one per line) is derived line by line.
    const NOUN_COLS = [['njejes', 'pashquar'], ['njejes', 'shquar'], ['shumes', 'pashquar'], ['shumes', 'shquar']];
    const perLine = (src, f) => String(src).split('\n').map((s) => s.trim()).filter(Boolean).map(f).filter(Boolean).join('\n');
    const nounDerived = (e) => {
        const decl = e.declension || {};
        const typed = (n, d, k) => ((decl[n] || {})[d] || {})[k];
        const word = e.word;
        const defSg = typed('njejes', 'shquar', 'emerore') || e.def;
        const plural = typed('shumes', 'pashquar', 'emerore');
        const out = { njejes: { pashquar: {}, shquar: {} }, shumes: { pashquar: {}, shquar: {} } };
        const put = (n, d, forms) => Object.entries(forms).forEach(([k, v]) => { if (v) out[n][d][k] = v; });
        const withGjinore = (s) => 'i/e ' + s;
        const withPi = (s) => 'pi ' + s;
        // indefinite singular: the article is optional, written (ni), as standard writes (një)
        const ni = (s) => '(ni) ' + s;

        // definite singular: -i → -it/-in, -u → -ut/-un (masculine), -a → -ës/-ën (feminine)
        const splitDef = (s) => s.match(/^(.+)([iua])$/);
        const defOblique = (s) => {
            const m = splitDef(s);
            return m && m[1] + (m[2] === 'a' ? 'ës' : m[2] + 't');
        };
        const defAccusative = (s) => {
            const m = splitDef(s);
            return m && m[1] + (m[2] === 'a' ? 'ën' : m[2] + 'n');
        };
        const fem = e.gender ? e.gender === 'femërore' : !!defSg && /a$/.test(defSg.split('\n')[0].trim());

        if (word) put('njejes', 'pashquar', { emerore: perLine(word, ni), kallezore: perLine(word, ni) });
        if (defSg) {
            const oblique = perLine(defSg, defOblique);
            put('njejes', 'shquar', {
                emerore: defSg,
                gjinore: perLine(oblique, withGjinore),
                dhanore: oblique,
                kallezore: perLine(defSg, defAccusative),
                rrjedhore: perLine(oblique, withPi),
            });
            // indefinite oblique: vdorë → vdore (feminine, from the word), çeni → çeni (masculine, = the definite)
            let indefOblique;
            if (fem) indefOblique = word ? perLine(word, (s) => s.replace(/ë$/, '') + 'e') : '';
            else indefOblique = perLine(defSg, (s) => (splitDef(s) ? s : ''));
            if (indefOblique) {
                put('njejes', 'pashquar', {
                    gjinore: perLine(indefOblique, (s) => withGjinore(ni(s))),
                    dhanore: perLine(indefOblique, ni),
                    rrjedhore: perLine(indefOblique, (s) => withPi(ni(s))),
                });
            }
        }
        if (plural) {
            // emna → emnave, çen → çenve: the same for indefinite and definite
            const plOblique = perLine(plural, (s) => s + 've');
            const defPl = typed('shumes', 'shquar', 'emerore') || perLine(plural, (s) => s + 't');   // vdora → vdorat
            put('shumes', 'pashquar', {
                emerore: plural,
                kallezore: plural,
                gjinore: perLine(plOblique, withGjinore),
                dhanore: plOblique,
                rrjedhore: perLine(plural, (s) => `pi ${s}ve / ${s}sh`),   // pi luleve / lulesh (as in çaj lulesh)
            });
            put('shumes', 'shquar', {
                emerore: defPl,
                kallezore: defPl,
                gjinore: perLine(plOblique, withGjinore),
                dhanore: plOblique,
                rrjedhore: perLine(plOblique, withPi),
            });
        }
        return out;
    };
    // Every box: the typed form, else the derived one. auto: true when it was derived.
    const nounCell = (e, der, n, d, k) => {
        const typedForm = (((e.declension || {})[n] || {})[d] || {})[k];
        if (typedForm) return { v: typedForm, auto: false };
        const derivedForm = der[n][d][k];
        return derivedForm ? { v: derivedForm, auto: true } : null;
    };

    return {
        asList, day, norm,
        PERSON_KEYS, PERSON_LABEL, personsOf, CASES,
        comboKey, COMBOS, helperOnly, unusedFor, isHelper,
        sourcesOf, sourceText, ruleText, ruleOf, linkText,
        headForm, clipsOf, clipChain,
        ADJ_ARTICLES, adjForm, adjHead, adjStd, adverbKindsText,
        NOUN_COLS, nounDerived, nounCell,
    };
})();
