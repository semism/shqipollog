const TAXONOMY = {
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
    gramatike: [
        {
            label: 'Kohët',
            items: [
                { id: 'tashmja', label: 'E tashmja' },
                { id: 'pakryera', label: 'E pakryera' },
                { id: 'kryera-thjeshte', label: 'E kryera e thjeshtë' },
                { id: 'kryera-perbere', label: 'E kryera e përbërë' },
                { id: 'ardhmja', label: 'E ardhmja' },
            ],
        },
        { label: 'Trajtat e pashtjelluara', items: [{ id: 'paskajorja', label: 'Paskajorja' }] },
        {
            label: 'Përemra',
            items: [{ id: 'vetore', label: 'Përemrat vetorë' }, { id: 'pronore', label: 'Përemrat pronorë' }],
        },
    ],
    // Every tense a verb can have, in order (used by the Koha dropdown and the admin). pa: indefinite form, shown in the site's dropdown.
    kohet: [
        { id: 'tashmja', label: 'E tashmja', pa: 'e tashme' },
        { id: 'pakryera', label: 'E pakryera', pa: 'e pakryer' },
        { id: 'kryera-thjeshte', label: 'E kryera e thjeshtë', pa: 'e kryer e thjeshtë' },
        { id: 'kryera-perbere', label: 'E kryera e përbërë', pa: 'e kryer e përbërë' },
        { id: 'mese-kryera', label: 'Më se e kryera', pa: 'më se e kryer' },
        { id: 'kryera-tejshkuar', label: 'E kryera e tejshkuar', pa: 'e kryer e tejshkuar' },
        { id: 'ardhmja', label: 'E ardhmja', pa: 'e ardhme' },
        { id: 'ardhmja-perparme', label: 'E ardhmja e përparme', pa: 'e ardhme e përparme' },
        { id: 'ardhmja-shkuar', label: 'E ardhmja e së shkuarës', pa: 'e ardhme e së shkuarës' },
        { id: 'ardhmja-perparme-shkuar', label: 'E ardhmja e përparme e së shkuarës', pa: 'e ardhme e përparme e së shkuarës' },
    ],
    // Which tenses each mood has, and which persons (default: all six).
    menyrat: [
        { id: 'dëftore', kohet: ['tashmja', 'pakryera', 'kryera-thjeshte', 'kryera-perbere', 'mese-kryera', 'kryera-tejshkuar', 'ardhmja', 'ardhmja-perparme', 'ardhmja-shkuar', 'ardhmja-perparme-shkuar'] },
        { id: 'habitore', kohet: ['tashmja', 'pakryera', 'kryera-perbere', 'mese-kryera'] },
        { id: 'urdhërore', kohet: ['tashmja'], persons: ['taj', 'ju'] },
        { id: 'lidhore', kohet: ['tashmja', 'pakryera', 'kryera-perbere', 'mese-kryera'] },
        { id: 'kushtore', kohet: ['tashmja', 'kryera-perbere'] },
        { id: 'dëshirore', kohet: ['tashmja', 'kryera-perbere'] },
    ],
    // Pairs with the same forms. Stored once, under the key on the right; the site shows them for both.
    njejta: {
        'ardhmja-shkuar|dëftore': 'tashmja|kushtore',
        'ardhmja-perparme-shkuar|dëftore': 'kryera-perbere|kushtore',
    },
    // Pairs the dialect doesn't use: the site says "nuk përdoret" instead of "mungojnë hyrje".
    // The helper verb (ndihmese, kam) is exempt only for pairs a rule below takes from it (aux).
    nukPerdoret: ['kryera-perbere|dëshirore', 'pakryera|habitore'],
    // Compound tenses the admin can fill in (it never overwrites what is typed).
    // aux: take that tense of the helper verb (the folje whose std is `ndihmese`); self: take it from the verb itself.
    // pre: particle in front (a leading t’ on the source form is dropped first); pjesore: add the verb's pjesore after.
    // from: several sources tried in order; strip: particle removed from the source form first.
    ndihmese: 'kam',
    // kam as the auxiliary, where it differs from kom's own table (taj ke, not kie). Used instead of kom's forms for that tense.
    ndihmeseForms: {
        'tashmja|dëftore': {
            un: 'kom', taj: 'ke', aj: 'ka', ne: 'kina', ju: 'kini', ato: 'kan',
            variants: [{ ne: 'kimi', ato: 'kajn' }, { ato: 'kën' }],
        },
    },
    rregullat: [
        { koha: 'kryera-perbere', menyra: 'dëftore', aux: ['tashmja', 'dëftore'], pjesore: true },
        { koha: 'mese-kryera', menyra: 'dëftore', aux: ['pakryera', 'dëftore'], pjesore: true },
        { koha: 'kryera-tejshkuar', menyra: 'dëftore', aux: ['kryera-thjeshte', 'dëftore'], pjesore: true },
        // lidhore e tashme: from the future without "dë" (exact), otherwise from the dëftore (check aj/ajo)
        { koha: 'tashmja', menyra: 'lidhore', from: [{ self: ['ardhmja', 'dëftore'], strip: 'dë ' }, { self: ['tashmja', 'dëftore'] }], pre: 't’' },
        { koha: 'ardhmja', menyra: 'dëftore', self: ['tashmja', 'lidhore'], pre: 'dë ' },
        { koha: 'ardhmja-perparme', menyra: 'dëftore', aux: ['tashmja', 'lidhore'], pre: 'dë ', pjesore: true },
        { koha: 'tashmja', menyra: 'kushtore', self: ['pakryera', 'dëftore'], pre: 'dë ' },
        { koha: 'kryera-perbere', menyra: 'kushtore', aux: ['pakryera', 'dëftore'], pre: 'dë ', pjesore: true },
        { koha: 'pakryera', menyra: 'lidhore', self: ['pakryera', 'dëftore'], pre: 't’' },
        { koha: 'kryera-perbere', menyra: 'lidhore', aux: ['tashmja', 'lidhore'], pre: 't’', pjesore: true },
        { koha: 'mese-kryera', menyra: 'lidhore', aux: ['pakryera', 'dëftore'], pre: 't’', pjesore: true },
        { koha: 'kryera-perbere', menyra: 'habitore', aux: ['tashmja', 'habitore'], pjesore: true },
        { koha: 'mese-kryera', menyra: 'habitore', aux: ['pakryera', 'habitore'], pjesore: true },
        { koha: 'kryera-perbere', menyra: 'dëshirore', aux: ['tashmja', 'dëshirore'], pjesore: true },
    ],
    fjalor: [
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
