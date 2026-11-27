// Logic used by both the site (docs/index.html) and the admin (admin/index.html). Load after taxonomy.js.
const SHARED = (() => {
    const asList = (v) => (v === undefined || v === null || v === '' ? [] : Array.isArray(v) ? v : [v]);
    const day = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('sq-AL', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

    // Persons (un … ato) with their labels; the persons a mood has (urdhërore: taj, ju); the five noun cases.
    const PERSON_KEYS = ['un', 'taj', 'aj', 'ne', 'ju', 'ato'];
    const PERSON_LABEL = Object.fromEntries(PERSON_KEYS.map((k, i) => [k, TAXONOMY.persons[i]]));
    const personsOf = (mood) => (TAXONOMY.moods.find((m) => m.id === mood) || {}).persons || PERSON_KEYS;
    const CASES = [['emerore', 'emërore'], ['gjinore', 'gjinore'], ['dhanore', 'dhanore'], ['kallezore', 'kallëzore'], ['rrjedhore', 'rrjedhore']];

    // Every valid tense + mood pair, in order, from TAXONOMY.tenses / TAXONOMY.moods.
    const comboKey = (c) => `${c.tense}|${c.mood}`;
    const COMBOS = TAXONOMY.tenses.flatMap((k) => TAXONOMY.moods.filter((m) => m.tenses.includes(k.id)).map((m) => ({ tense: k.id, mood: m.id, key: `${k.id}|${m.id}` })));

    // Text for search matching: no accents, lowercase, and no quotes/apostrophes or **bold** / {highlight} marks.
    const norm = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’'“”"*{}]/g, '');

    // "Nuk përdoret": the pair is in TAXONOMY.unused, except for the helper verb when a rule builds a tense from that pair of it.
    const isHelperWord = (w) => !!w && (w.std === TAXONOMY.auxiliary || w.word === TAXONOMY.auxiliary);
    const AUX_KEYS = (TAXONOMY.rules || []).filter((r) => r.aux).map((r) => r.aux.join('|'));
    const helperOnly = (w, key) => isHelperWord(w) && AUX_KEYS.includes(key);
    const unusedFor = (w, key) => (TAXONOMY.unused || []).includes(key) && !helperOnly(w, key);

    // How a tense is built, from TAXONOMY.rules: e.g. “t’” + kam, e tashme (lidhore) + pjesore
    const INDEFINITE = Object.fromEntries(TAXONOMY.tenses.map((k) => [k.id, k.indefinite || k.label]));
    const comboName = ([tense, mood]) => `${INDEFINITE[tense] || tense} (${mood})`;
    const sourcesOf = (r) => r.from || [{ aux: r.aux, self: r.self, strip: r.strip }];
    const sourceText = (src) => (src.aux ? `${TAXONOMY.auxiliary}, ${comboName(src.aux)}` : comboName(src.self)) + (src.strip ? ` pa “${src.strip.trim()}”` : '') + (src.aj ? ' (aj/ajo: “un” + -e)' : '');
    const ruleText = (r) => [r.pre ? `“${r.pre.trim()}”` : null, sourcesOf(r).map(sourceText).join(', ose '), r.participle ? 'pjesore' : null].filter(Boolean).join(' + ');
    const ruleOf = (tense, mood) => (TAXONOMY.rules || []).find((r) => r.tense === tense && r.mood === mood);
    // Pairs in TAXONOMY.sameForms share another pair's forms: "nisoj si e tashme (kushtore)"
    const linkText = (tense, mood) => { const l = (TAXONOMY.sameForms || {})[`${tense}|${mood}`]; return l ? `nisoj si ${comboName(l.split('|'))}` : ''; };

    // A verb's headword is its e tashme (dëftore) "un", so that form's recording is the headword's own `audio`.
    const headForm = (w) => {
        const z = (w && w.conjugation || []).find((c) => c.tense === 'tashmja' && c.mood === 'dëftore');
        return z ? String(asList(z.un)[0] || '').trim() : '';
    };
    // every recorded form of a word: its `audios`, plus the headword's `audio` under its "un" form
    const clipsOf = (w) => {
        const un = headForm(w);
        return w && w.audio && un ? { ...(w.audios || {}), [un]: w.audio } : (w && w.audios) || null;
    };

    // Linker: what plays for a form. Its own recording if it has one; otherwise recorded pieces of it one after another,
    // longest piece first ("dë kisha ardh" = "dë kisha" + "ardh"), looked up in the word's own recordings and, for verbs,
    // the helper verb's (helper: the kom word, whose kom, kisha, dë kisha… then serve every verb). t'kem = t’kem.
    // Returns { paths, linked } (linked: built from pieces) or null.
    const apos = (t) => String(t).trim().replace(/'/g, '’');
    const byForm = (m) => (m ? Object.fromEntries(Object.entries(m).map(([k, p]) => [apos(k), p])) : {});
    const clipChain = (own, form, helper = null) => {
        const maps = [byForm(own), byForm(helper ? clipsOf(helper) : null)];
        const find = (t) => maps.map((m) => m[t]).find(Boolean);
        const parts = apos(form || '').split(/\s+/).filter(Boolean);
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
    const isHelper = (w) => !!w && (w.std === TAXONOMY.auxiliary || w.word === TAXONOMY.auxiliary);

    // Noun cases worked out from three typed forms: the word, the definite singular (njëjës e shquar emërore, or e.def)
    // and the plural (shumës e pashquar emërore). Nothing derived is stored: a typed box always wins, an empty one shows this.
    // A box with several forms (one per line) is derived line by line.
    const NOUN_COLS = [['njejes', 'pashquar'], ['njejes', 'shquar'], ['shumes', 'pashquar'], ['shumes', 'shquar']];
    const perLine = (src, f) => String(src).split('\n').map((s) => s.trim()).filter(Boolean).map(f).filter(Boolean).join('\n');
    const nounDerived = (e) => {
        const L = e.declension || {};
        const typed = (n, d, k) => ((L[n] || {})[d] || {})[k];
        const W = e.word, D = typed('njejes', 'shquar', 'emerore') || e.def, P = typed('shumes', 'pashquar', 'emerore');
        const out = { njejes: { pashquar: {}, shquar: {} }, shumes: { pashquar: {}, shquar: {} } };
        const put = (n, d, o) => Object.entries(o).forEach(([k, v]) => { if (v) out[n][d][k] = v; });
        // definite singular: -i → -it/-in, -u → -ut/-un (masculine), -a → -ës/-ën (feminine)
        const def = (s) => s.match(/^(.+)([iua])$/);
        const fem = e.gender ? e.gender === 'femërore' : !!D && /a$/.test(D.split('\n')[0].trim());
        // indefinite singular: the article is optional, written (ni), as standard writes (një)
        const ni = (s) => '(ni) ' + s;
        if (W) put('njejes', 'pashquar', { emerore: perLine(W, ni), kallezore: perLine(W, ni) });
        if (D) {
            const obl = (s) => { const m = def(s); return m && m[1] + (m[2] === 'a' ? 'ës' : m[2] + 't'); };
            const acc = (s) => { const m = def(s); return m && m[1] + (m[2] === 'a' ? 'ën' : m[2] + 'n'); };
            put('njejes', 'shquar', { emerore: D, gjinore: perLine(D, (s) => obl(s) && 'i/e ' + obl(s)), dhanore: perLine(D, obl), kallezore: perLine(D, acc), rrjedhore: perLine(D, (s) => obl(s) && 'pi ' + obl(s)) });
            // indefinite oblique: vdorë → vdore (feminine, from the word), çeni → çeni (masculine, = the definite)
            const io = fem ? (W ? perLine(W, (s) => s.replace(/ë$/, '') + 'e') : '') : perLine(D, (s) => (def(s) ? s : ''));
            if (io) put('njejes', 'pashquar', { gjinore: perLine(io, (s) => 'i/e ' + ni(s)), dhanore: perLine(io, ni), rrjedhore: perLine(io, (s) => 'pi ' + ni(s)) });
        }
        if (P) {
            const dobl = perLine(P, (s) => s + 've');                                 // emna → emnave, çen → çenve (indefinite and definite alike)
            const PD = typed('shumes', 'shquar', 'emerore') || perLine(P, (s) => s + 't');   // vdora → vdorat
            put('shumes', 'pashquar', { emerore: P, kallezore: P, gjinore: perLine(dobl, (s) => 'i/e ' + s), dhanore: dobl, rrjedhore: perLine(P, (s) => `pi ${s}ve / ${s}sh`) });   // pi luleve / lulesh (as in çaj lulesh)
            put('shumes', 'shquar', { emerore: PD, kallezore: PD, gjinore: perLine(dobl, (s) => 'i/e ' + s), dhanore: dobl, rrjedhore: perLine(dobl, (s) => 'pi ' + s) });
        }
        return out;
    };
    // Every box: the typed form, else the derived one. auto: true when it was derived.
    const nounCell = (e, der, n, d, k) => {
        const t = (((e.declension || {})[n] || {})[d] || {})[k];
        if (t) return { v: t, auto: false };
        const v = der[n][d][k];
        return v ? { v, auto: true } : null;
    };

    return { headForm, clipsOf, clipChain, isHelper, asList, day, PERSON_KEYS, PERSON_LABEL, personsOf, CASES, comboKey, COMBOS, norm, helperOnly, unusedFor, sourcesOf, sourceText, ruleText, ruleOf, linkText, NOUN_COLS, nounDerived, nounCell };
})();
