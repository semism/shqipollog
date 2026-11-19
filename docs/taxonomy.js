// Every tense a verb can have, in order (used by the Koha dropdown and the admin). indefinite: the form shown in the site's dropdown.
const KOHET = [
    { id: 'tashmja', label: 'E tashmja', indefinite: 'e tashme' },
    { id: 'pakryera', label: 'E pakryera', indefinite: 'e pakryer' },
    { id: 'kryera-thjeshte', label: 'E kryera e thjeshtë', indefinite: 'e kryer e thjeshtë' },
    { id: 'kryera-perbere', label: 'E kryera e përbërë', indefinite: 'e kryer e përbërë' },
    { id: 'mese-kryera', label: 'Më se e kryera', indefinite: 'më se e kryer' },
    { id: 'kryera-tejshkuar', label: 'E kryera e tejshkuar', indefinite: 'e kryer e tejshkuar' },
    { id: 'ardhmja', label: 'E ardhmja', indefinite: 'e ardhme' },
    { id: 'ardhmja-perparme', label: 'E ardhmja e përparme', indefinite: 'e ardhme e përparme' },
    { id: 'ardhmja-shkuar', label: 'E ardhmja e së shkuarës', indefinite: 'e ardhme e së shkuarës' },
    { id: 'ardhmja-perparme-shkuar', label: 'E ardhmja e përparme e së shkuarës', indefinite: 'e ardhme e përparme e së shkuarës' },
];

const TAXONOMY = {
    tenses: KOHET,
    persons: ['un', 'taj', 'aj/ajo', 'ne', 'ju', 'ato'],
    variants: [
        'dëftore',
        'habitore',
        'urdhërore',
        'lidhore',
        'kushtore',
        'dëshirore',
        'emërore',
        'gjinore',
        'dhanore',
        'kallëzore',
        'rrjedhore',
    ],
    grammarMenu: [
        {
            label: 'Kohët',
            items: KOHET.map(({ id, label }) => ({ id, label })),
        },
        // pjesorja is built from each verb's participle; paskajorja is a normal entry
        { label: 'Trajtat e pashtjelluara', items: [{ id: 'pjesorja', label: 'Pjesorja' }, { id: 'paskajorja', label: 'Paskajorja' }] },
        {
            label: 'Përemra',
            items: [{ id: 'vetore', label: 'Përemrat vetorë' }, { id: 'pronore', label: 'Përemrat pronorë' }],
        },
    ],
    // Which tenses each mood has, and which persons (default: all six).
    moods: [
        { id: 'dëftore', tenses: ['tashmja', 'pakryera', 'kryera-thjeshte', 'kryera-perbere', 'mese-kryera', 'kryera-tejshkuar', 'ardhmja', 'ardhmja-perparme', 'ardhmja-shkuar', 'ardhmja-perparme-shkuar'] },
        { id: 'habitore', tenses: ['tashmja', 'pakryera', 'kryera-perbere', 'mese-kryera'] },
        { id: 'urdhërore', tenses: ['tashmja'], persons: ['taj', 'ju'] },
        { id: 'lidhore', tenses: ['tashmja', 'pakryera', 'kryera-perbere', 'mese-kryera'] },
        { id: 'kushtore', tenses: ['tashmja', 'kryera-perbere'] },
        { id: 'dëshirore', tenses: ['tashmja', 'kryera-perbere'] },
    ],
    // Pairs with the same forms. Stored once, under the key on the right; the site shows them for both.
    sameForms: {
        'ardhmja-shkuar|dëftore': 'tashmja|kushtore',
        'ardhmja-perparme-shkuar|dëftore': 'kryera-perbere|kushtore',
    },
    // Pairs the dialect doesn't use: the site says "nuk përdoret" instead of "mungojnë hyrje".
    // The helper verb (auxiliary, kam) is exempt only for pairs a rule below takes from it (aux).
    unused: ['kryera-perbere|dëshirore', 'pakryera|habitore'],
    // Compound tenses the admin can fill in (it never overwrites what is typed).
    // aux: take that tense of the helper verb (the folje whose std is `auxiliary`); self: take it from the verb itself.
    // pre: particle in front (a leading t’ on the source form is dropped first); participle: add the verb's participle (pjesore) after.
    // from: several sources tried in order; strip: particle removed from the source form first.
    auxiliary: 'kam',
    // kam as the auxiliary, where it differs from kom's own table (taj ke, not kie). Used instead of kom's forms for that tense.
    auxiliaryForms: {
        'tashmja|dëftore': {
            un: 'kom', taj: 'ke', aj: 'ka', ne: 'kina', ju: 'kini', ato: 'kan',
            variants: [{ ne: 'kimi', ato: 'kajn' }, { ato: 'kën' }],
        },
    },
    rules: [
        { tense: 'kryera-perbere', mood: 'dëftore', aux: ['tashmja', 'dëftore'], participle: true },
        { tense: 'mese-kryera', mood: 'dëftore', aux: ['pakryera', 'dëftore'], participle: true },
        { tense: 'kryera-tejshkuar', mood: 'dëftore', aux: ['kryera-thjeshte', 'dëftore'], participle: true },
        // lidhore e tashme: from the future without "dë" (exact), otherwise from the dëftore (check aj/ajo)
        { tense: 'tashmja', mood: 'lidhore', from: [{ self: ['ardhmja', 'dëftore'], strip: 'dë ' }, { self: ['tashmja', 'dëftore'] }], pre: 't’' },
        { tense: 'ardhmja', mood: 'dëftore', self: ['tashmja', 'lidhore'], pre: 'dë ' },
        { tense: 'ardhmja-perparme', mood: 'dëftore', aux: ['tashmja', 'lidhore'], pre: 'dë ', participle: true },
        { tense: 'tashmja', mood: 'kushtore', self: ['pakryera', 'dëftore'], pre: 'dë ' },
        { tense: 'kryera-perbere', mood: 'kushtore', aux: ['pakryera', 'dëftore'], pre: 'dë ', participle: true },
        { tense: 'pakryera', mood: 'lidhore', self: ['pakryera', 'dëftore'], pre: 't’' },
        { tense: 'kryera-perbere', mood: 'lidhore', aux: ['tashmja', 'lidhore'], pre: 't’', participle: true },
        { tense: 'mese-kryera', mood: 'lidhore', aux: ['pakryera', 'dëftore'], pre: 't’', participle: true },
        { tense: 'kryera-perbere', mood: 'habitore', aux: ['tashmja', 'habitore'], participle: true },
        { tense: 'mese-kryera', mood: 'habitore', aux: ['pakryera', 'habitore'], participle: true },
        { tense: 'kryera-perbere', mood: 'dëshirore', aux: ['tashmja', 'dëshirore'], participle: true },
    ],
    dictionaryCategories: [
        { id: 'folje', label: 'Folje' },
        { id: 'emra', label: 'Emra' },
        { id: 'mbiemra', label: 'Mbiemra' },
        { id: 'ndajfolje', label: 'Ndajfolje' },
    ],
    blog: [
        { id: 'shprehje', label: 'Shprehje dhe përdorim' },
        { id: 'shqiptim', label: 'Shqiptim' },
        { id: 'lista', label: 'Lista' },
    ],
};
