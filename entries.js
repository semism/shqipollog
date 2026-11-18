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
    fjalor: [
        { id: 'folje', label: 'Folje' },
        { id: 'emra', label: 'Emra' },
        { id: 'mbiemra', label: 'Mbiemra' },
        { id: 'ndajfolje', label: 'Ndajfolje' },
        { id: 'numerore', label: 'Numërorë' },
    ],
    blog: [{ id: 'shprehje', label: 'Shprehje dhe përdorim' }, { id: 'shqiptim', label: 'Shqiptim' }],
};

const ENTRIES = [
    {
        type: 'gramatike',
        item: 'tashmja',
        v: 'dëftore',
        date: '2025-05-27',
        forms: [
            { head: 'ngjoj', std: 'dëgjoj' },
            {
                heads: ['', 'variant', 'variant'],
                table: [
                    ['ngjoj', 'ngjojsh', 'ngjon', 'ngjojm', 'ngjoni', 'ngjojn'],
                    ['', 'ngjon', '', 'ngjojna', '', ''],
                    ['nëgoj', 'nëgon', 'nëgon', 'nëgojm', 'nëgoni', 'nëgojn'],
                ],
            },
            {
                note: 'shumica e folsve, ke veta e dit njëjës foljet i zgjedhojn ndrajshe pi vetës tret njëjës. (p.sh. taj shkojsh, aj shkon)',
            },
            {
                note: 'ni numër nga fshatrat jugore nuk bojn dallim midis ktine di vetave, (taj shkon, ajo shkon)',
            },
            { head: 'ngjohem', std: 'dëgjohem' },
            {
                heads: ['', 'variant'],
                table: [
                    ['ngjohem', 'ngjohesh', 'ngjohet', 'ngjohena', 'ngjoheni', 'ngjohen'],
                    ['', '', '', 'ngjona', 'ngjoni', ''],
                ],
            },
        ],
        text: ['Kohë e tashme -> Vakët i shtajshëm'],
    },

    {
        type: 'gramatike',
        item: 'tashmja',
        v: 'habitore',
        date: '2025-05-29',
        forms: [
            {
                heads: ['laj', 'lahem'],
                table: [
                    ['lajkam', 'lajke', 'lajka', 'lajkim', 'lajki(t)*', 'lajkan'],
                    ['u lajkam', 'u lajke', 'u lajka', 'u lajkim', 'u lajki(t)*', 'u lajkin'],
                ],
            },
            { note: '*t-ja vërehet te pak folës, shaum folës nuk e përdorin' },
            {
                note: 'pjesëza “{u}” këtu e merr rolin e njejtë që e ka në përcjellore me folje joveprore “qenka duke {u} larë”(“kona tu {u} la”)',
            },
        ],
        text: [
            'Flasim për kohën e tashme të habitores. Joveprorja e përafërt me gjuhën standarde “laheshkam” gjithashtu shfaqet, është e paqartë nëse kjo paraqitet si thjesht ndikim i gjuhës standarde.',
        ],
    },

    {
        type: 'gramatike',
        item: 'tashmja',
        v: 'urdhërore',
        date: '2025-05-26',
        forms: [
            {
                heads: [{ std: 'fik' }, { std: 'shkym/shemb' }],
                cols: [
                    ['taj fajke', 'ju fajknja', 'asaj fajkjani', 'atine fajkvani'],
                    ['taj shime', 'ju shimnja', 'atij shimjani', 'atine shimvani'],
                ],
            },
            {
                note: 'Ekuivalent të foljeve “fik” dhe “shkym/shemb”. Folësit e përdorin ose njërën ose tjetrën, jo të dyja. E dyta përdoret nga me pak folës, vetëm nga rradha e fshatrave deri në kufirin e Kosovës',
            },
        ],
    },

    {
        type: 'gramatike',
        item: 'pakryera',
        v: 'dëftore',
        date: '2025-05-26',
        forms: [
            {
                heads: [
                    { word: 'shkruj/shkrauj', std: 'shkruaj' },
                    { word: 'vaj', std: 'vij' },
                    { word: 'çeshi', std: 'qesh' },
                    { word: 'jom', std: 'jam' },
                ],
                table: [
                    ['shkrujsha', 'shkrujshe', 'shkrunte', 'shkrujshim', 'shkrujshit', 'shkrujshin'],
                    ['vajsha', 'vajshe', 'vajnte', 'vajshim', 'vajshit', 'vajshin'],
                    ['çeshsha', 'çeshshe', 'çeshte', 'çeshshim', 'çeshshit', 'çeshshin'],
                    ['isha', 'ishe', 'aj isht/ajo ishte', 'ishim', 'ishit', 'ishin'],
                ],
            },
            {
                note: 'disa folës e zdrojn t-jën pi n’fund t’vetës dit shumës (shkrujshi, vajshi, çeshshi, ishi)',
            },
        ],
    },

    {
        type: 'gramatike',
        item: 'kryera-thjeshte',
        v: 'dëftore',
        date: '2025-05-27',
        forms: [
            { head: 'ndaj', std: 'ndiej, geg: nij' },
            {
                heads: ['', 'variant'],
                table: [
                    ['ndajva', 'ndajve', 'ndajv', 'ndajvëm', 'ndajvët', 'ndajvën'],
                    ['ndajta', 'ndajte', 'ndajti', 'ndajtëm', 'ndajtët', 'ndajtën'],
                ],
            },
            { note: 'te disa folës bie “d”-ja mbas “n”-jës → najva / najta' },
            { note: 'sicëlla “a” e par nkët folje paraqet diftong → nd{ea}jva / nd{ea}jta' },
        ],
    },

    {
        type: 'gramatike',
        item: 'kryera-perbere',
        v: 'dëftore',
        date: '2025-05-26',
        forms: [
            { head: 'kom', std: 'kam' },
            {
                heads: ['', 'variant', 'variant'],
                table: [
                    ['kom kon', 'ke kon', 'ka kon', 'kina kon', 'kini kon', 'kan kon'],
                    ['', '', '', 'kimi kon', '', 'kajn kon'],
                    ['', '', '', '', '', 'kën kon'],
                ],
            },
            {
                note: 'e tashmja e foljes ndihmëse “kam”, n’kataundet jugore (ka Gostivari) n’vetën e tret merr variant ma tosk (kimi). Gegësohet (kina) nëpër kataundet veriore (ka Kosova)',
            },
        ],
    },

    {
        type: 'gramatike',
        item: 'ardhmja',
        v: 'dëftore',
        date: '2025-05-25',
        forms: [
            { head: 'shkoj' },
            'pjesëza “dë” para foljes + menyra lidhore e foljes pa pjesezën “të”',
            { table: [['dë shkoj', 'dë shkojsh', 'dë shkoje', 'dë shkojm', 'dë shkoni', 'dë shkojn']] },
        ],
        text: [
            'përkurdër motrave gege xhi e perdorin foljen ndihmëse “kam”, kjo e folme e ka ni qasje pak ma ndrajshe kur vajn puna t’folim për t’ardhmen.',
        ],
    },

    {
        type: 'gramatike',
        item: 'paskajorja',
        date: '2025-09-10',
        forms: [
            { head: '-për t-' },
            { list: ['për tu bo', 'për ta vazhdau', 'për t’shku'] },
            { head: '-me-' },
            { list: ['para se me hongër, laj durët (e vetmja mbijetesë e paskajores me “me”)'] },
        ],
        text: [
            '*Korigjim n’koment',
            'Ndoshta njo pi fenomeneve ma di-ansore e ksaj tfolme. Ni letër nostalgjie, letër dashnoje ndamjes proto-shipes n’di cop. Shajfet se si paskajorja a zhduk njug. Kur motrat gege sot e ksaj dite i rujn kit format e paskajores me “me”. Kjo e folme u lakmohet tezakeve toske xhi e kan lon mbas. Megjithatë mbijeton, (ose tpaktën a mxhall prap) paskajorja xhi na mundson pregaditje. Para se **me** e hup paskajoren, a desht ta hupim çat “para se”. Majr xhi sën e kina hup :)',
        ],
    },

    {
        type: 'gramatike',
        item: 'vetore',
        date: '2025-05-28',
        forms: [
            {
                heads: [{ rasa: 'dhanore' }, { rasa: 'kallëzore' }],
                table: [
                    [
                        'mu / m’',
                        'taj / t’',
                        'atij / asaj / i / e',
                        'neve / na',
                        'juve / vu ose ju',
                        'atine / u',
                    ],
                    ['mu / m’', 'taj / t’', 'at / e', 'neve / na', 'juve / vu ose ju', 'ato / i'],
                ],
            },
        ],
    },

    {
        type: 'gramatike',
        item: 'pronore',
        v: 'emërore',
        date: '2025-05-25',
        forms: [
            {
                heads: ['mashkullore', 'femërore'],
                table: [
                    ['i jemi', 'i joti', 'i atij*/asaj', 'i joni', 'i juji', 'i atine'],
                    ['e jemja', 'e jotja', 'e atij*/asaj', 'e jona', 'e juja', 'e atine'],
                ],
            },
            { note: '*te disa folës ene si diftong i → aë atij → ataj (lexohet ataëj)' },
        ],
    },

    {
        type: 'gramatike',
        item: 'pronore',
        v: 'dhanore',
        date: '2025-05-28',
        forms: [
            't’kujt ose t’kujve va ke dhon?',
            {
                heads: ['mashkullore', 'femërore'],
                table: [
                    ['t’temit', 't’tondit', 't’atij/t’asaj', 't’tonve', 't’tujve', 't’atinve'],
                    ['t’temes', 't’tondes', 't’atij/t’asaj', 't’tonave', 't’tujave', 't’atinve'],
                ],
            },
        ],
    },

    {
        type: 'fjale',
        sub: 'folje',
        date: '2026-02-09',
        head: 'rrshes',
        pos: 'folje',
        std: 'rrëshqas',
        forms: [
            {
                table: [
                    [
                        'rrshes/rrëshes/rrishes',
                        'rr(ë/i)shet/rr(ë/i)shesësh',
                        'rr(ë/i)shet',
                        'rr(ë/i)shes(ë/i)m',
                        'rr(ë/i)sh(i/aj)tni',
                        'rr(ë/i)shes(ë/i)n',
                    ],
                ],
            },
        ],
        text: ['A bon tvendosim si rrëshitet për termo?'],
    },

    {
        type: 'fjale',
        sub: 'folje',
        date: '2025-12-13',
        place: 'Sellcë',
        pos: 'folje',
        forms: [
            { head: 'heci', std: 'ec' },
            { table: [['heci', 'hecish/hecën', 'hecën', 'hecim', 'hecni', 'hecin']] },
            { head: 'ngares', std: 'vrapoj' },
            {
                table: [
                    [
                        'ngares / ngarendi',
                        'ngaresësh / ngarendish',
                        'ngaret / ngarendën',
                        'ngaresëm / ngarendim',
                        'ngarendni',
                        'ngaresën / ngarendin',
                    ],
                ],
            },
            { head: 'fjaroj', std: 'fluturoj' },
            {
                table: [
                    ['fjaroj', 'fjarojsh/fjaron', 'fjaron', 'fjarojm', 'fjarojni', 'fjarojn'],
                    ['fjataroj', 'fjataron', 'fjataron', 'fjatarojm', 'fjataroni', 'fjatarojn'],
                ],
            },
        ],
        text: ['Hapi fjetat, fjaro! 🪽🏃🏻‍♀️🚶🏼'],
    },

    {
        type: 'fjale',
        sub: 'folje',
        date: '2025-09-11',
        head: 'jom',
        pos: 'folje',
        std: 'jam',
        forms: [{ table: [['jom', 'ije/ie', 'o/osht/oshte', 'ina/imi', 'ini', 'jon']] }],
    },

    {
        type: 'fjale',
        sub: 'ndajfolje',
        date: '2025-09-10',
        head: 'shtaj',
        pos: 'ndajfolje kohe',
        std: 'tash',
        forms: [
            'variacion: shtahi',
            'Ndajfolje kohe xhi e kallxon veprim xhi ndodhën n’momentin e t’folmes',
            'Rrall shajfet ene n’form mbiemri: i shtajshëm/e shtajshme',
        ],
    },

    {
        type: 'fjale',
        sub: 'emra',
        date: '2025-09-10',
        head: 'shaj',
        def: 'shajvi',
        pos: 'emër, gjinia mashkullore',
        std: 'shi',
        forms: [
            'shqiptime kryesore: shæj/shaj/shoj',
            { list: ['shaj (pashquar)', 'shajvi (shquar)', 'shajvit (dhan/gjinore)', 'shajvin (kallëzore)'] },
        ],
        text: ['Në disa fshatra në kahje të Kosovës haset dhe si “shajni/shajnit” ne trajtën e shquar.'],
    },

    {
        type: 'fjale',
        sub: 'emra',
        date: '2025-08-28',
        head: 'macë',
        def: 'maca',
        pos: 'emër, gjinia femërore',
        std: 'mace',
        forms: ['maca e zez'],
        text: ['ka gjasa tjet ene Maçor/Maçok/Dac 🐈‍⬛'],
    },

    {
        type: 'fjale',
        sub: 'emra',
        date: '2025-08-20',
        head: 'çen',
        def: 'çeni',
        pos: 'emër, gjinia mashkullore',
        std: 'qen',
        forms: ['klishi i çenit'],
    },

    {
        type: 'fjale',
        sub: 'numerore',
        date: '2025-06-03',
        head: 'Numrat',
        pos: 'numërorë',
        forms: [
            {
                cols: [
                    [
                        '1. njo',
                        '2. di',
                        '3. tre',
                        '4. katër',
                        '5. pes',
                        '6. xhash',
                        '7. shtat',
                        '8. tet',
                        '9. nont',
                        '10. dhajt',
                        '11. nimdhajt',
                        '12. dimdhajt',
                        '13. tremdhajt',
                        '14. katërm(dh)ajt',
                        '15. pesm(dh)ajt',
                        '16. xhashmajt',
                        '17. shtatmajt',
                        '18. tetmajt',
                        '19. nonmajt',
                        '20. nizet',
                    ],
                    [
                        '22. nistedi',
                        '30. tredhajt',
                        '33. trethtetre',
                        '40. katërdhajt',
                        '44. katërthtekatër',
                        '50. pezdhajt',
                        '55. pestepes',
                        '60. xhazhdhajt',
                        '66. xhashtexhash',
                        '70. shtadhajt',
                        '77. shtathteshtat',
                        '80. tedhajt',
                        '88. tethtetet',
                        '90. nodhajt',
                        '99. nothtenont',
                    ],
                    [
                        '100. niçin',
                        '200. diçin',
                        '300. treçin',
                        '400. katërçin',
                        '500. pesçin (pesshin)',
                        '600. xhashçin (xhashshin)',
                        '700. shtatçin',
                        '800. tetçin',
                        '900. nonçin',
                        '1000. nimi',
                        '1001111. nimilon e nimi e niçin e nimdhajt',
                    ],
                ],
            },
        ],
        text: [
            'Kjo ke pak ma rond për ta përpilau se gjajti asniher nuk përdoren germa për ti shkruj numrat, shifrat jon ma shkurt.',
        ],
    },

    {
        type: 'fjale',
        sub: 'emra',
        date: '2025-06-02',
        head: 'vdorë',
        def: 'vdora',
        pos: 'emër, gjinia femërore',
        std: 'borë',
        forms: [
            {
                cols: [
                    ['vdora', 'i/e vdorës', 'vdorës', 'vdorën', 'pi vdore'],
                    ['vdorat', 'i/e vdorave', 'vdorave', 'vdorët', 'pi vdorve'],
                ],
            },
            'Ene sa vakët dë shkrohet vdora?',
        ],
        text: ['Pi atine t’Kilimanxharos'],
    },

    {
        type: 'fjale',
        sub: 'emra',
        date: '2025-05-29',
        head: 'Ditët e javës',
        pos: 'emra',
        forms: [
            {
                cols: [
                    [
                        'e hon',
                        'e mart',
                        'e mërkur',
                        'e enjte (e injte)',
                        'e premte',
                        'e shtun (e shtaun)',
                        'e dell (e djell)',
                    ],
                    [
                        't’honën',
                        't’martën',
                        't’mërkurën',
                        't’enjten (t’ijten) (t’injten)',
                        't’premten',
                        't’shtaunën (t’shtunën)',
                        't’dellën (t’djellën)',
                    ],
                ],
            },
        ],
        text: [
            'ë-jat n’fund qëllimisht zgjedh mos i shkruj, xhi t’i pasqyroje ma majr regullat e pashkrume xhi “shkrujtsit” e ksaj t’folme i respektojn. Përndrajshe, t’i kishim shkrujt ë-jat n’fund dë e kishin pas tnjejtin efekt xhi e kan shom tfolme qera, ku ë-ja n’vend xhi vet tshqiptohet, e zgjatën zanoren paraprake.',
        ],
    },

    {
        type: 'fjale',
        sub: 'ndajfolje',
        date: '2025-05-26',
        head: 'mapa',
        pos: 'ndajfolje kohe',
        std: 'pastaj',
        forms: [
            'Fjalë që kanë kuptimin e njejtë me fjalën “pastaj”. Radhitur sipas shpeshtësisë.',
            { list: ['mapa', 'ma mrapa', 'ma mbrapa', 'masaj', 'masanej', 'masani'] },
        ],
    },

    {
        type: 'fjale',
        sub: 'mbiemra',
        date: '2025-05-26',
        head: 'i vogël, i madh',
        pos: 'mbiemra',
        std: 'i vogël, i madh',
        forms: [
            {
                cols: [['e vogël', 'e madhe', 't’vogla', 't’mdhoja'], ['i vogël', 'i madh', 't’vogli', 't’mdhi']],
            },
            { label: 'variacion' },
            'gjajti n’zhdukje:',
            { list: ['i/e vëjl', 't’vëjl/t’vëjla'] },
        ],
    },

    {
        type: 'fjale',
        sub: 'ndajfolje',
        date: '2025-05-25',
        head: 'Ndajfolje vendi',
        pos: 'ndajfolje vendi',
        forms: [
            {
                cols: [
                    [
                        'nalt',
                        'posht',
                        'ntgjatht',
                        'ntmajsht',
                        'perjasht',
                        'mbrenda*',
                        'dikund',
                        'asku',
                        'kanauk',
                        'kahmos',
                    ],
                    ['agje', 'çagje', 'ktau', 'çektau', 'ataj', 'çataj', 'erfujti', 'sajpri', 'karshaj'],
                ],
            },
            { note: '*do folës e zdrojn “b”- jën kur vajn mbas “m” - jës. → mrenda**' },
            { note: '**do folës shkojn ene çat “d”- jën e zdrojn → mrena' },
        ],
    },

    {
        type: 'blog',
        cat: 'shprehje',
        date: '2026-01-04',
        title: 'e madhe/i madh',
        sub: 'si rrethanor sasie',
        body: [
            { list: ['~ binte shom shaj 👍🏻', '~ binte shajvi madh 👌🏻'] },
            { list: ['~ kina këndau shaum 👍🏻', '~ ka kon e këndaumja madhe 👌🏻'] },
            '~ Gje kem n’darsëm, e lujtmja e këndaumja madhe.',
            '~ Ktau kona tajm i madh, su mirrka frajm.',
            '~ Shajfe ene ni park na dul. Nkët qytet kona jeshillajki madh.',
        ],
    },

    {
        type: 'blog',
        cat: 'shprehje',
        date: '2025-12-20',
        title: '“di thom”',
        sub: 'sarkazëm',
        std: 'do ti them',
        body: [
            'përdoret për t’kallxau se',
            { list: ['- puna n’pytje nuk bohet', '- gjykimi n’pytje nuk o i vërtet'] },
            'Shpesh, i thujsh dikujt, ti those dikujt dënise. Dikushi atij dikushit qetër nuk i thot asnise.',
            '“Oni, di thom!” çaç xhi smban uj, merr kuptim kaeprapa.',
            'Shembuj qer:',
            'Si jo - Nesër - Nesër n’saba - Ka sabahi kuç',
        ],
    },

    {
        type: 'blog',
        cat: 'shprehje',
        date: '2025-06-04',
        title: 'E kryera e thjeshtë ene e kryera e përbërë',
        sub: 'përdorim',
        body: [
            {
                cols: [
                    ['“Mbretnesha tha“', '[isha prezent ene e ndajva tu thon]'],
                    ['“Mbretnesha ka thon”', '[e morra vesht se ka thon]'],
                ],
            },
            {
                cols: [
                    ['“Nuk msova”', '[fakti se s’msova pat pasoja]'],
                    ['“Nuk kom msau”', '[fakti se skom msau dë kese pasoja]'],
                ],
            },
            'kan kalu tani (ka lidhje hala)',
            'nuk u bë atëherë (ska lidhje mo)',
        ],
    },

    {
        type: 'blog',
        cat: 'shqiptim',
        date: '2025-05-31',
        title: 'video log 2',
        video: 'videos/video-log-2',
        body: ['tu zdrip pi majës Pllatit'],
    },

    {
        type: 'blog',
        cat: 'shqiptim',
        date: '2025-05-31',
        title: 'video log 1',
        video: 'videos/video-log-1',
        body: ['Kolt/Kolzit'],
    },

    {
        type: 'blog',
        cat: 'shqiptim',
        date: '2025-05-28',
        place: 'Kamjan',
        title: 'Diftongi ea',
        sub: 'zanore rreshqitëse',
        body: [
            'zanorja e rrishet ka zanorja a për ta formau zanoren ea (shkruhet a)',
            'Nuk dë v{a}je saunde, dë r{a}je der nesër.',
            'Ki diftong o bajgji rond për ta paraqit me alfabet latin. Po nëse e ngjoni vitin tu e thon mund ta dalloni se a-ja te llafi vaj, dallon pi a-jes te llafi ftajr/majr. Mund ene ta mendoni si dallimi midis si e thuni llafin shpaj në “vaj nshpaj” ene “boj ni shpaj”.',
            'Fotoja e prapavijes o pi ke Ujvarat e Kamjanit.',
        ],
    },

    {
        type: 'blog',
        cat: 'shqiptim',
        date: '2025-05-25',
        title: 'Diftongi ae',
        sub: 'zanore rrëshqitëse',
        body: [
            'zanorja “a” rrishet ka zanorja “e” për ta formau zanoren “æ”',
            'shkruhet me “a”',
            'm{a}jr e paske bo spata ft{a}jr ti thom',
        ],
    },
];
