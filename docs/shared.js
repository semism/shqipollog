// Logic used by both the site (docs/index.html) and the admin (admin/index.html). Load after taxonomy.js.
const SHARED = (() => {
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
    const sourceText = (src) => (src.aux ? `${TAXONOMY.auxiliary}, ${comboName(src.aux)}` : comboName(src.self)) + (src.strip ? ` pa “${src.strip.trim()}”` : '');
    const ruleText = (r) => [r.pre ? `“${r.pre.trim()}”` : null, sourcesOf(r).map(sourceText).join(', ose '), r.participle ? 'pjesore' : null].filter(Boolean).join(' + ');
    const ruleOf = (tense, mood) => (TAXONOMY.rules || []).find((r) => r.tense === tense && r.mood === mood);
    // Pairs in TAXONOMY.sameForms share another pair's forms: "njëlloj si e tashme (kushtore)"
    const linkText = (tense, mood) => { const l = (TAXONOMY.sameForms || {})[`${tense}|${mood}`]; return l ? `njëlloj si ${comboName(l.split('|'))}` : ''; };

    return { norm, isHelperWord, AUX_KEYS, helperOnly, unusedFor, comboName, sourcesOf, sourceText, ruleText, ruleOf, linkText };
})();
