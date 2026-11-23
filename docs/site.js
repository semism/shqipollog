const boot = (ALL, focus, withDrafts) => {
    // Drafts stay off the site, but hidden verbs can still be shown as a tense's examples.
    const ENTRIES = withDrafts ? ALL : ALL.filter((e) => !e.draft);
    const VERBS = ALL.filter((e) => e.type === 'fjale' && e.sub === 'folje').flatMap((e) => (e.words || []).map((w) => ({ w, e })));
    const vKey = (w) => w.word || w.std || '';
    const TABS = [
        { id: 'gramatike', label: 'Gramatikë' },
        { id: 'fjalor', label: 'Fjalor' },
        { id: 'blog', label: 'Blog' },
    ];
    const ITEMS = TAXONOMY.grammarMenu.flatMap((g) => g.items);
    const LABEL = Object.fromEntries([...TAXONOMY.tenses, ...TAXONOMY.dictionaryCategories, ...TAXONOMY.blog, ...ITEMS].map((x) => [x.id, x.label]));
    const vRank = (v) => (v ? TAXONOMY.variants.indexOf(v) : -1);

    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const fmt = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\{(.+?)\}/g, '<span class="hl">$1</span>');
    const { norm } = SHARED;
    const slug = (t) => norm(t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const std = (t) => (t ? `<p class="std">std: ${fmt(t)}</p>` : '');

    // a small ▶ after a form that has a recording (au: the owning word's `audios`, keyed by the form's spelling)
    // ▶ after a form that can be heard (see SHARED.clipChain). au: the owning word's recordings (`audios`), or for a verb
    // { verb } so the helper verb's recordings can fill in pieces.
    const helperWord = (VERBS.find((v) => SHARED.isHelper(v.w)) || {}).w;
    const verbClips = (w) => ({ verb: w });
    const playSm = (au, v) => {
        const c = !v || !au ? null : au.verb ? SHARED.clipChain(SHARED.clipsOf(au.verb), v, helperWord) : SHARED.clipChain(au, v);
        if (!c) return '';
        const tip = c.linked ? 'Dëgjo (nga pjesët)' : 'Dëgjo';
        return `<button type="button" class="play sm" data-audio="${esc(c.paths.join(' '))}" aria-label="${tip}: ${esc(v)}" title="${tip}">▶</button>`;
    };
    const list = (items, au) => `<ul>${items.map((t) => `<li>${t ? fmt(t) + playSm(au, t) : '&nbsp;'}</li>`).join('')}</ul>`;
    const headCell = (h) => {
        if (!h) return '';
        if (typeof h === 'string') return h === 'variant' ? `<span class="var">${h}</span>` : fmt(h);
        return `${h.word ? fmt(h.word) : ''}${h.std ? `<span class="hstd">std: ${fmt(h.std)}</span>` : ''}`;
    };
    const MISS = '\u0000';
    const cell = (v, au) => (v === MISS ? '<span class="miss" title="mungon e dhona">—</span>' : v ? fmt(v) + playSm(au, v) : '');
    const wrapTable = (t) => `<div class="table-wrap">${t}</div>${t.includes('class="miss"') ? '<p class="miss-key">— mungon e dhona</p>' : ''}`;
    const table = (b) => {
        const sep = (b.heads || []).map((h, i) => i > 0 && h && typeof h === 'object' && (h.word || h.std));
        const cls = (i) => (sep[i] ? ' class="gs"' : '');
        const head = b.heads ? `<thead><tr><th></th>${b.heads.map((h, i) => `<th${cls(i)}>${headCell(h)}</th>`).join('')}</tr></thead>` : '';
        const rows = (b.rows || TAXONOMY.persons).map((who, i) => `<tr><th class="p" scope="row">${who}</th>${b.table.map((c, j) => `<td${cls(j)}>${cell(c[i], (b.audios || [])[j])}</td>`).join('')}</tr>`).join('');
        return wrapTable(`<table class="conj">${head}<tbody>${rows}</tbody></table>`);
    };
    const block = (b) => {
        if (typeof b === 'string') return `<p>${fmt(b)}</p>`;
        if (b.table) return table(b);
        if (b.cols) return `<div class="cols">${b.cols.map((c, i) => `<div>${b.heads && b.heads[i] ? `<div class="colhead">${headCell(b.heads[i])}</div>` : ''}${list(c)}</div>`).join('')}</div>`;
        if (b.list) return list(b.list);
        if (b.note) return `<p class="note">${fmt(b.note)}</p>`;
        if (b.head) return `<div class="lemma"><h4>${fmt(b.head)}</h4>${std(b.std)}</div>`;
        if (b.label) return `<p class="std">${fmt(b.label)}</p>`;
        if (b.std) return std(b.std);
        return '';
    };
    const blocks = (arr, cls = 'forms') => (arr && arr.length ? `<div class="${cls}">${arr.map(block).join('')}</div>` : '');

    const { asList, day, PERSON_KEYS, PERSON_LABEL, personsOf, CASES, comboKey, COMBOS } = SHARED;

    const personBlock = (words, keys = PERSON_KEYS) => {
        const cols = [];
        words.forEach((w) => {
            cols.push({ head: w.word || w.std ? { word: w.word, std: w.std } : '', forms: w.forms || {}, main: true, audios: w.audios });
            (w.variants || []).forEach((v) => cols.push({ head: 'variant', forms: v, audios: w.audios }));
        });
        const extra = [...new Set(cols.flatMap((c) => Object.keys(c.forms).filter((k) => !PERSON_KEYS.includes(k) && !['word', 'std', 'variants', 'tense', 'mood', 'footnotes', 'participle', 'conjugation', 'review'].includes(k))))];
        const rows = [];
        const cells = cols.map(() => []);
        [...keys, ...extra].forEach((k) => {
            const n = Math.max(0, ...cols.map((c) => asList(c.forms[k]).length));
            for (let r = 0; r < n; r++) {
                rows.push(PERSON_LABEL[k] || k);
                cols.forEach((c, i) => cells[i].push(asList(c.forms[k])[r] || (c.main ? MISS : '')));
            }
        });
        const block = { rows, table: cells, audios: cols.map((c) => c.audios) };
        if (cols.some((c) => c.head)) block.heads = cols.map((c) => c.head);
        return block;
    };

    const gramForms = (e) => {
        const out = [...(e.intro || [])];
        const rule = e.tense && e.mood ? ruleLine(e.tense, e.mood) : '';
        if (rule) out.push({ label: rule });
        const words = e.words || [];
        if (words.some((w) => w.examples)) {
            words.forEach((w) => { out.push({ head: w.word, std: w.std }); out.push({ list: w.examples || [] }); });
        } else if (words.length) {
            out.push(personBlock(words.map((w) => ({ word: w.word, std: w.std, forms: w, variants: w.variants })), e.tense ? personsOf(e.mood) : PERSON_KEYS));
        }
        (e.footnotes || []).forEach((n) => out.push({ note: n }));
        return out;
    };

    ENTRIES.forEach((e) => {
        if (e.type !== 'gramatike') return;
        e.item = e.tense || e.pronoun;
        e.v = e.mood || e.case;
    });

    const texts = (x) => {
        if (!x) return [];
        if (typeof x === 'string') return [x];
        if (Array.isArray(x)) return x.flatMap(texts);
        return Object.values(x).flatMap(texts);
    };
    const wordTitle = (e) => e.word || (e.words || []).map((w) => w.word).join(', ');
    const titleOf = (e) => (e.type === 'gramatike' ? LABEL[e.item] : e.type === 'fjale' ? wordTitle(e) : e.title);

    const used = new Set([...TABS.map((t) => t.id), ...TAXONOMY.dictionaryCategories.map((x) => x.id), ...TAXONOMY.blog.map((x) => x.id)]);
    ENTRIES.forEach((e) => {
        const base = e.id || slug(e.type === 'gramatike' ? `${LABEL[e.item]} ${e.v || ''}` : e.type === 'fjale' ? wordTitle(e) : e.title);
        let id = base;
        for (let n = 2; used.has(id); n++) id = base + '-' + n;
        used.add(id);
        e.id = id;
        e.key = titleOf(e).toLowerCase().replace(/[“”"’']/g, '');
        e.haystack = norm(texts([titleOf(e), e, LABEL[e.sub], LABEL[e.cat]]).join(' '));
    });
    const byId = Object.fromEntries(ENTRIES.map((e) => [e.id, e]));

    const meta = (label, e, cls) => `<div class="head"><span class="tag ${cls}">${label}</span><span class="meta">${day(e.date)}${e.place ? ', ' + esc(e.place) : ''}</span></div>`;
    // A quiet "shpërndaj" link at the bottom of a card: the phone's share sheet where there is one, otherwise copy the link.
    const shareBtn = (hash, title) => `<p class="share-row"><button type="button" class="share" data-save="${esc(hash)}">ruaj</button><button type="button" class="share" data-share="${esc(hash)}" data-title="${esc(title || 'Shqipollog')}">shpërndaj</button></p>`;
    const caption = (t) => (t && t.length ? `<div class="caption">${t.map((x) => `<p>${fmt(x)}</p>`).join('')}</div>` : '');

    const formsFor = (w, c0) => {
        const link = TAXONOMY.sameForms[comboKey(c0)];
        const c = link ? { tense: link.split('|')[0], mood: link.split('|')[1] } : c0;
        const own = (w.conjugation || []).find((z) => z.tense === c.tense && z.mood === c.mood);
        return own || null;
    };
    const tenseChoice = {};
    // Forms filled in without a speaker's check yet carry review: true (see the README); say so under the table.
    const reviewNote = (ws, c) => (ws.some((w) => (formsFor(w, c) || {}).review) ? '<p class="miss-key">pa rishikuar</p>' : '');
    // Not used for these verbs: true only if it is unused for every one of them (checked per verb, see shared.js).
    const unused = (c, words) => (words.length ? words : [null]).every((w) => SHARED.unusedFor(w, comboKey(c)));

    // How a tense is built (shared.js), or which pair it shares its forms with.
    const missMsg = (c, words = []) => `<p class="miss-all">${c && unused(c, words) ? 'Nuk përdoret.' : 'Ende mungojn.'}</p>`;
    // A row of chips. items: { label, attrs (data-* string), pressed, empty }; big = the page-level mood/case row.
    const chipRow = (items, { big = false, label = '' } = {}) => `<div class="chips${big ? ' big' : ''}" role="group"${label ? ` aria-label="${esc(label)}"` : ''}>${items.map((x) => `<button type="button" ${x.attrs} aria-pressed="${!!x.pressed}"${x.empty ? ' class="empty"' : ''}>${esc(x.label)}</button>`).join('')}</div>`;
    const ruleLine = (tense, mood) => { const r = SHARED.ruleOf(tense, mood); return SHARED.linkText(tense, mood) || (r ? 'formimi: ' + SHARED.ruleText(r) : ''); };
    ENTRIES.forEach((e) => { if (e.type === 'gramatike') e.forms = gramForms(e); });

    // A tense page: mood chips, then the grammar entry. Its table shows a random Fjalor verb with this tense
    // and the search above it swaps in any verb that has it.
    const TENSE_IDS = TAXONOMY.tenses.map((k) => k.id);
    const pickState = { verb: null, rand: {}, shown: {} };
    // Pjesorja and përcjellorja pose as tenses so they can share the picker; both need the verb's participle.
    const PARTICIPLE = { tense: 'pjesorja', mood: '' };
    const GERUND = { tense: 'percjellorja', mood: '' };
    const NON_FINITE = [PARTICIPLE.tense, GERUND.tense];
    const poolFor = (c) => VERBS.filter((v) => !v.e.draft && (NON_FINITE.includes(c.tense) ? asList(v.w.participle).length : formsFor(v.w, c)));
    const pickerHtml = (pool, label) => (pool.length ? `
            <div class="vpick">
                <input type="search" class="vq" placeholder="kërko folje…" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="${label}">
                ${pool.length > 1 ? '<button type="button" class="vrand">qetër</button>' : ''}
            </div>
            <div class="vsug" hidden></div>` : '');
    const gOf = (c) => ENTRIES.find((e) => e.type === 'gramatike' && e.tense === c.tense && e.mood === c.mood);
    // A verb table for one tense + mood. heads: show each verb's word/std above its columns.
    const verbTable = (ws, c, heads = true) => table(personBlock(ws.map((w) => { const f = formsFor(w, c) || {}; return { word: heads ? w.word : '', std: heads ? w.std : '', forms: f, variants: f.variants, audios: verbClips(w) }; }), personsOf(c.mood)));
    const randomFrom = (pool, not) => { const o = pool.filter((v) => vKey(v.w) !== not); const l = o.length ? o : pool; return l[Math.floor(Math.random() * l.length)]; };
    const shownFor = (c) => {
        const key = comboKey(c);
        const pool = poolFor(c);
        const picked = pickState.verb && pool.find((v) => vKey(v.w) === pickState.verb);
        if (picked) return { verbs: [picked.w], link: picked.e.id };
        if (!pool.length) return { verbs: [] };
        if (!pool.some((v) => vKey(v.w) === pickState.rand[key])) pickState.rand[key] = vKey(randomFrom(pool).w);
        const v = pool.find((x) => vKey(x.w) === pickState.rand[key]);
        return { verbs: [v.w], link: v.e.id };
    };
    const tensePage = (tense) => {
        const moods = COMBOS.filter((c) => c.tense === tense);
        const cur = moods.find((c) => c.mood === state.v[tense]) || moods.find((c) => gOf(c)) || moods[0];
        const empty = (c) => !gOf(c) && !poolFor(c).length;
        const pills = moods.length > 1 ? chipRow(moods.map((c) => ({ label: c.mood, attrs: `data-v="${esc(c.mood)}"`, pressed: c === cur, empty: empty(c) })), { big: true, label: 'Mënyra' }) : '';
        const g = gOf(cur);
        const rule = ruleLine(cur.tense, cur.mood);
        const shown = shownFor(cur);
        pickState.shown[comboKey(cur)] = shown.verbs.length === 1 ? vKey(shown.verbs[0]) : null;
        const pool = poolFor(cur);
        const picker = pickerHtml(pool, 'Kërko folje për kët koh');
        const body = shown.verbs.length ? verbTable(shown.verbs, cur) + reviewNote(shown.verbs, cur) + (shown.link ? `<p class="miss-key"><a href="#${shown.link}">te fjalori →</a></p>` : '')
            : missMsg(cur);
        const parts = [
            ...(g ? g.intro || [] : []).map((t) => `<p>${fmt(t)}</p>`),
            rule ? `<p class="std">${fmt(rule)}</p>` : '',
            picker,
            body,
            ...(g ? g.footnotes || [] : []).map((n) => `<p class="note">${fmt(n)}</p>`),
        ].join('');
        return `<section class="gview"><h2>${esc(LABEL[tense])}</h2>${pills}
            <article class="entry conjugate"${g ? ` id="${g.id}"` : ''} data-tense="${esc(cur.tense)}" data-mood="${esc(cur.mood)}">
                ${g ? std(g.std) : ''}<div class="forms">${parts}</div>${g ? caption(g.text) : ''}
                ${shareBtn(g ? g.id : slug(LABEL[tense]), `${LABEL[tense]}${g ? ', ' + g.mood : ''}`)}
            </article></section>`;
    };
    // One verb's pjesore, or its përcjellore (TAXONOMY.gerund.pre + pjesore).
    const nonFiniteView = (c, title) => {
        const pres = c === GERUND ? asList((TAXONOMY.gerund || {}).pre) : [''];
        const pool = poolFor(c);
        const shown = shownFor(c);
        const w = shown.verbs[0];
        pickState.shown[comboKey(c)] = w ? vKey(w) : null;
        const rule = c === GERUND ? `<p class="std">formimi: ${pres.map((p) => `“${esc(p.trim())}”`).join(' ose ')} + pjesore</p>` : '';
        const body = w
            ? `<div class="lemma"><h4>${fmt(vKey(w))}</h4>${w.std && w.std !== w.word ? std(w.std) : ''}</div>${pres.map((pre) => `<p class="pj">${asList(w.participle).map((p) => fmt(pre + p)).join(' / ')}</p>`).join('')}${shown.link ? `<p class="miss-key"><a href="#${shown.link}">te fjalori →</a></p>` : ''}`
            : missMsg();
        return `<section class="gview"><h2>${title}</h2><article class="entry conjugate" data-tense="${c.tense}" data-mood=""><div class="forms">${rule}${pickerHtml(pool, 'Kërko folje')}${body}</div>${shareBtn(slug(title), title)}</article></section>`;
    };

    const verbSection = (e) => {
        const has = (c) => e.words.some((w) => formsFor(w, c));
        const cur = COMBOS.find((c) => comboKey(c) === tenseChoice[e.id]) || COMBOS.find(has) || COMBOS[0];
        const tenses = [...new Set(COMBOS.map((c) => c.tense))];
        const INDEFINITE = Object.fromEntries(TAXONOMY.tenses.map((k) => [k.id, k.indefinite]));
        const tagOf = (k) => { const cs = COMBOS.filter((c) => c.tense === k); return !cs.some(has) && cs.every((c) => unused(c, e.words)) ? ' — nuk përdoret' : ''; };
        const opts = tenses.map((k) => `<option value="${esc(k)}"${k === cur.tense ? ' selected' : ''}>${esc(INDEFINITE[k] || LABEL[k] || k)}${tagOf(k)}</option>`).join('');
        const moods = COMBOS.filter((c) => c.tense === cur.tense);
        const chips = moods.length > 1 ? chipRow(moods.map((c) => ({ label: c.mood, attrs: `data-zgm="${e.id}" data-combo="${esc(comboKey(c))}"`, pressed: c === cur, empty: !has(c) })), { label: 'Mënyra' }) : `<span>${esc(cur.mood)}</span>`;
        const body = has(cur) ? verbTable(e.words, cur, e.words.length > 1) + reviewNote(e.words, cur) : missMsg(cur, e.words);
        const notes = e.words.flatMap((w) => { const f = formsFor(w, cur); return f ? f.footnotes || [] : []; });
        const pj = e.words.map((w) => asList(w.participle).join(' / ')).filter(Boolean);
        const pjLine = pj.length ? `<p class="std">pjesore: ${e.words.flatMap((w) => asList(w.participle).map((p) => fmt(p) + playSm(verbClips(w), p))).join(' / ')}${e.words.some((w) => w.participleReview) ? ' (pa rishikuar)' : ''}</p>` : '';
        return `${pjLine}<div class="sect"><div class="zg"><label class="zg"><span>Koha</span><select data-zg="${e.id}" data-cur="${esc(comboKey(cur))}">${opts}</select></label>${chips}</div>${body}${notes.map((n) => `<p class="note">${fmt(n)}</p>`).join('')}</div>`;
    };

    const nounSection = (e) => {
        if (!e.declension) return `<div class="sect"><p class="sect-label">Lakimi</p>${missMsg()}</div>`;
        const L = e.declension;
        const cols = [['njejes', 'pashquar'], ['njejes', 'shquar'], ['shumes', 'pashquar'], ['shumes', 'shquar']];
        const val = (n, d, k) => (L[n] && L[n][d] && L[n][d][k]) || MISS;
        const head = `<thead><tr><th></th><th colspan="2">njëjës</th><th colspan="2" class="gs">shumës</th></tr><tr><th></th>${cols.map(([n, d], i) => `<th class="sub${i === 2 ? ' gs' : ''}">${d === 'shquar' ? 'e shquar' : 'e pashquar'}</th>`).join('')}</tr></thead>`;
        const rows = CASES.map(([k, label]) => `<tr><th class="p" scope="row">${label}</th>${cols.map(([n, d], i) => `<td${i === 2 ? ' class="gs"' : ''}>${cell(val(n, d, k), e.audios)}</td>`).join('')}</tr>`).join('');
        return `<div class="sect"><p class="sect-label">Lakimi</p>${wrapTable(`<table class="conj">${head}<tbody>${rows}</tbody></table>`)}</div>`;
    };

    const adjSection = (e) => {
        const cols = [];
        e.words.forEach((w) => {
            cols.push({ head: fmt(w.word) + playSm(w.audios, w.word), w, au: w.audios, first: true });
            (w.variants || []).forEach((v) => cols.push({ head: `<span class="var">variant</span> ${fmt(v.word || '')}${playSm(w.audios, v.word)}`, w: v, au: w.audios, first: true }));
        });
        const head = `<thead><tr><th></th>${cols.map((c, i) => `<th colspan="2"${i ? ' class="gs"' : ''}>${c.head}</th>`).join('')}</tr><tr><th></th>${cols.map((c, i) => `<th class="sub${i ? ' gs' : ''}">njëjës</th><th class="sub">shumës</th>`).join('')}</tr></thead>`;
        const rows = [['m', 'mashkullore'], ['f', 'femërore']].map(([g, label]) => `<tr><th class="p" scope="row">${label}</th>${cols.map((c, i) => `<td${i ? ' class="gs"' : ''}>${cell((c.w.njejes || {})[g] || MISS, c.au)}</td><td>${cell((c.w.shumes || {})[g] || MISS, c.au)}</td>`).join('')}</tr>`).join('');
        return `<div class="sect">${wrapTable(`<table class="conj">${head}<tbody>${rows}</tbody></table>`)}</div>`;
    };

    const posOf = (e) => e.pos || ({ folje: 'folje', emra: `emër${e.gender ? ', gjinia ' + e.gender : ''}`, mbiemra: 'mbiemër', ndajfolje: 'ndajfolje' }[e.sub]);
    const defOf = (e) => e.def || (e.declension && e.declension.njejes && e.declension.njejes.shquar && e.declension.njejes.shquar.emerore);
    const multiStd = (e) => (e.words && e.words.length === 1 ? e.words[0].std : null);

    // ▶ for each recording: the entry's own (emra, ndajfolje) or each word's (folje, mbiemra)
    const playBtns = (e) => [e, ...(e.words || [])].filter((x) => x.audio)
        .map((x) => `<button type="button" class="play" data-audio="${esc(x.audio)}" aria-label="Dëgjo${x.word ? ': ' + esc(x.word) : ''}" title="Dëgjo${x.word ? ': ' + esc(x.word) : ''}">▶</button>`).join('');
    const wordCard = (e) => `
        <article class="entry" id="${e.id}">
            ${meta(LABEL[e.sub] || 'Fjalë', e, 'fjala')}
            <h3><a href="#${e.id}">${fmt(wordTitle(e))}</a>${defOf(e) ? `<span class="def">${fmt(defOf(e))}</span>` : ''}${playBtns(e)}</h3>
            ${posOf(e) ? `<p class="pos">${fmt(posOf(e))}</p>` : ''}
            ${std(e.std || multiStd(e))}
            ${e.pronunciation ? `<p class="std">shqiptime kryesore: ${fmt(e.pronunciation)}</p>` : ''}
            ${e.meaning ? `<div class="forms">${e.meaning.map((t) => `<p>${fmt(t)}</p>`).join('')}</div>` : ''}
            ${e.variants ? `<div class="sect"><p class="sect-label">variacion${e.variantsNote ? ` <span class="sect-note">${fmt(e.variantsNote)}</span>` : ''}</p>${list(e.variants, e.audios)}</div>` : ''}
            ${e.sub === 'folje' ? verbSection(e) : e.sub === 'emra' ? nounSection(e) : e.sub === 'mbiemra' ? adjSection(e) : ''}
            ${e.examples ? `<ul class="examples">${e.examples.map((t) => `<li>${fmt(t)}</li>`).join('')}</ul>` : ''}
            ${(e.footnotes || []).map((n) => `<p class="note">${fmt(n)}</p>`).join('')}
            ${caption(e.text)}
            ${shareBtn(e.id, wordTitle(e))}
        </article>`;

    const gramCard = (e, withTitle) => `
        <article class="entry" id="${e.id}">
            ${withTitle ? `<h3><a href="#${e.id}">${fmt(LABEL[e.item])}</a>${e.v ? `<span class="def">${fmt(e.v)}</span>` : ''}</h3>` : ''}
            ${std(e.std)}
            ${blocks(e.forms)}
            ${caption(e.text)}
            ${shareBtn(e.id, `${LABEL[e.item]}${e.v ? ', ' + e.v : ''}`)}
        </article>`;

    const blogPost = (e) => `
        <article class="post" id="${e.id}">
            ${meta(LABEL[e.cat], e, e.cat)}
            <h2><a href="#${e.id}">${fmt(e.title)}</a></h2>
            ${e.sub ? `<p class="sub">${fmt(e.sub)}</p>` : ''}
            ${std(e.std)}
            ${e.video ? `<video class="clip" controls preload="none" playsinline poster="${e.video}.jpg" src="${e.video}.mp4"></video>` : ''}
            ${blocks(e.body, 'body')}
            ${shareBtn(e.id, e.title)}
        </article>`;

    const state = { tab: 'gramatike', item: ITEMS[0].id, v: {}, fjalor: 'all', blog: 'all', by: 'date', dir: 'desc' };
    const tabsEl = document.getElementById('tabs');
    const panel = document.getElementById('panel');
    const view = document.getElementById('view');
    const empty = document.getElementById('empty');
    const search = document.getElementById('q');

    const words = () => norm(search.value).split(/\s+/).filter(Boolean);
    const matches = (e, w) => w.every((x) => e.haystack.includes(x));
    const TYPE_OF_TAB = { gramatike: 'gramatike', fjalor: 'fjale', blog: 'blog' };
    const TAB_OF_TYPE = { gramatike: 'gramatike', fjale: 'fjalor', blog: 'blog' };

    const renderTabs = () => {
        const w = words();
        tabsEl.innerHTML = TABS.map((t) => {
            const n = w.length ? ENTRIES.filter((e) => e.type === TYPE_OF_TAB[t.id] && matches(e, w)).length : null;
            return `<button type="button" role="tab" data-tab="${t.id}" aria-selected="${t.id === state.tab}">${t.label}${n === null ? '' : `<span class="n">${n}</span>`}</button>`;
        }).join('');
    };

    const filterButtons = (groups, key, field, all) => {
        const btn = (id, label, n, sub) => `<button type="button" data-filter="${id}"${sub ? ' class="sub"' : ''} aria-pressed="${state[key] === id}">${label}<span class="n">${n}</span></button>`;
        return `<div class="filter" data-key="${key}">${btn('all', 'Kit', all.length)}${groups.map((g) => btn(g.id, g.label, all.filter((e) => e[field] === g.id).length, key === 'fjalor')).join('')}</div>`;
    };

    const renderPanel = () => {
        panel.dataset.tab = state.tab;
        if (state.tab === 'gramatike') {
            const active = !words().length;
            panel.innerHTML = TAXONOMY.grammarMenu.map((g) => `<p class="filter-label">${g.label}</p><div class="filter">${g.items.map((x) => `<button type="button" data-item="${x.id}" aria-pressed="${active && state.item === x.id}">${x.label}</button>`).join('')}</div>`).join('');
        } else if (state.tab === 'fjalor') {
            panel.innerHTML = filterButtons(TAXONOMY.dictionaryCategories, 'fjalor', 'sub', ENTRIES.filter((e) => e.type === 'fjale'))
                + `<div class="sort">
                    <button type="button" data-by="date" aria-pressed="${state.by === 'date'}">${state.by === 'date' && state.dir === 'asc' ? 'Ma t’vjetrat' : 'Ma t’rejat'}</button>
                    <button type="button" data-by="alpha" aria-pressed="${state.by === 'alpha'}">${state.by === 'alpha' && state.dir === 'desc' ? 'Zh–A' : 'A–Zh'}</button>
                </div>`;
        } else {
            panel.innerHTML = filterButtons(TAXONOMY.blog, 'blog', 'cat', ENTRIES.filter((e) => e.type === 'blog'));
        }
    };

    // Long lists are split into pages. Changing the tab, filter, sort or search goes back to page 1;
    // opening a link to an entry (pageTo) opens the page it is on.
    const PAGE_SIZE = { fjalor: 20, blog: 10 };
    let listKey = '';
    const paged = (list, key) => {
        const size = PAGE_SIZE[state.tab];
        if (state.restore && state.restore.list === key) { state.page = state.restore.page; state.pageTo = null; }
        else if (state.pageTo) { const i = list.findIndex((e) => e.id === state.pageTo); state.page = i < 0 ? 1 : Math.floor(i / size) + 1; state.pageTo = null; }
        else if (key !== listKey) state.page = 1;
        listKey = key;
        const pages = Math.max(1, Math.ceil(list.length / size));
        state.page = Math.min(Math.max(1, state.page || 1), pages);
        return { items: list.slice((state.page - 1) * size, state.page * size), pager: pagerHtml(state.page, pages) };
    };
    const pagerHtml = (cur, pages) => {
        if (pages < 2) return '';
        const show = [...new Set([1, cur - 1, cur, cur + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
        const btn = (n, label, aria) => `<button type="button" data-page="${n}"${aria ? ` aria-label="${aria}"` : ''}${n === cur && !aria ? ' aria-pressed="true" aria-current="page"' : ''}>${label}</button>`;
        const nums = show.map((n, i) => (i && n - show[i - 1] > 1 ? '<span class="gap">…</span>' : '') + btn(n, n)).join('');
        return `<nav class="chips pager" aria-label="Faqet">${cur > 1 ? btn(cur - 1, '‹', 'Faqja para') : ''}${nums}${cur < pages ? btn(cur + 1, '›', 'Faqja mbas') : ''}</nav>`;
    };

    const renderView = () => {
        const w = words();
        let html = '';
        if (state.tab === 'gramatike') {
            const all = ENTRIES.filter((e) => e.type === 'gramatike');
            if (w.length) {
                html = `<div class="list">${all.filter((e) => matches(e, w)).map((e) => gramCard(e, true)).join('')}</div>`;
            } else {
                const it = ITEMS.find((x) => x.id === state.item) || ITEMS[0];
                if (TENSE_IDS.includes(it.id)) { view.innerHTML = tensePage(it.id); empty.hidden = true; return; }
                if (it.id === PARTICIPLE.tense) { view.innerHTML = nonFiniteView(PARTICIPLE, 'Pjesorja'); empty.hidden = true; return; }
                if (it.id === GERUND.tense) { view.innerHTML = nonFiniteView(GERUND, 'Përcjellorja'); empty.hidden = true; return; }
                const cards = all.filter((e) => e.item === it.id).sort((a, b) => vRank(a.v) - vRank(b.v));
                const cur = cards.find((e) => e.v === state.v[it.id]) || cards[0];
                const pills = cards.some((e) => e.v) ? chipRow(cards.map((e) => ({ label: e.v, attrs: `data-v="${esc(e.v)}"`, pressed: e === cur })), { big: true }) : '';
                html = `<section class="gview"><h2>${it.label}</h2>${pills}${cur ? gramCard(cur, false) : ''}</section>`;
            }
        } else if (state.tab === 'fjalor') {
            const list = ENTRIES.filter((e) => e.type === 'fjale' && (state.fjalor === 'all' || e.sub === state.fjalor) && matches(e, w) && (!state.only || e.id === state.only));
            list.sort((a, b) => (state.by === 'alpha' ? a.key.localeCompare(b.key, 'sq') : a.date.localeCompare(b.date)));
            if (state.dir === 'desc') list.reverse();
            const pg = paged(list, ['fjalor', state.fjalor, state.by, state.dir, w.join(' ')].join('|'));
            html = `${pg.pager}<div class="list">${pg.items.map(wordCard).join('')}</div>${pg.pager}`;
        } else {
            const list = ENTRIES.filter((e) => e.type === 'blog' && (state.blog === 'all' || e.cat === state.blog) && matches(e, w) && (!state.only || e.id === state.only));
            list.sort((a, b) => b.date.localeCompare(a.date));
            const pg = paged(list, ['blog', state.blog, w.join(' ')].join('|'));
            html = `${pg.pager}<div class="blog">${pg.items.map(blogPost).join('')}</div>${pg.pager}`;
        }
        view.innerHTML = html;
        empty.hidden = !!view.querySelector('article');
    };

    const render = () => { renderTabs(); renderPanel(); renderView(); };

    const toTop = () => {
        const top = document.querySelector('.layout').getBoundingClientRect().top + window.scrollY - 8;
        if (window.scrollY > top) window.scrollTo({ top });
    };

    const setHash = (h) => history.replaceState(null, '', h ? '#' + h : location.pathname);

    tabsEl.addEventListener('click', (e) => {
        const b = e.target.closest('[data-tab]');
        if (!b) return;
        state.tab = b.dataset.tab;
        render();
        setHash(state.tab);
        toTop();
    });

    panel.addEventListener('click', (e) => {
        const it = e.target.closest('[data-item]');
        const f = e.target.closest('[data-filter]');
        const by = e.target.closest('[data-by]');
        if (it) {
            search.value = '';
            state.item = it.dataset.item;
            render();
            setHash(slug(LABEL[state.item]));
            toTop();
        } else if (f) {
            const key = f.closest('.filter').dataset.key;
            state[key] = f.dataset.filter;
            renderPanel(); renderView();
            setHash(state[key] === 'all' ? state.tab : state[key]);
            toTop();
        } else if (by) {
            if (state.by === by.dataset.by) state.dir = state.dir === 'asc' ? 'desc' : 'asc';
            else { state.by = by.dataset.by; state.dir = state.by === 'alpha' ? 'asc' : 'desc'; }
            renderPanel(); renderView();
        }
    });

    // keep: an element of the card that must stay in the page untouched (the tense <select>: replacing or even
    // moving it while iOS has its picker open leaves the picker stuck, and focusing a copy reopens it).
    // Everything around it is swapped for the fresh card's nodes, level by level up to the card.
    const redrawCard = (id, focusSel, keep) => {
        const card = document.getElementById(id);
        const entry = byId[id];
        if (!card || !entry) return;
        const tmp = document.createElement('div');
        tmp.innerHTML = wordCard(entry);
        const fresh = tmp.firstElementChild;
        const copy = keep && card.contains(keep) && fresh.querySelector(focusSel);
        if (copy) {
            keep.dataset.cur = copy.dataset.cur;
            for (let o = keep, n = copy; o !== card; o = o.parentElement, n = n.parentElement) {
                const kids = [...n.parentElement.childNodes];
                const at = kids.indexOf(n);
                [...o.parentElement.childNodes].forEach((c) => { if (c !== o) c.remove(); });
                o.before(...kids.slice(0, at));
                o.after(...kids.slice(at + 1));
            }
            return;
        }
        card.replaceWith(fresh);
        const again = document.querySelector(focusSel);
        if (again) again.focus({ preventScroll: true });
    };

    view.addEventListener('change', (e) => {
        const sel = e.target.closest('[data-zg]');
        if (!sel) return;
        const id = sel.dataset.zg;
        const entry = byId[id];
        if (!entry) return;
        const prev = (tenseChoice[id] || sel.dataset.cur || '').split('|')[1];
        const has = (c) => entry.words.some((w) => formsFor(w, c));
        const cs = COMBOS.filter((c) => c.tense === sel.value);
        const next = cs.find((c) => c.mood === prev) || cs.find(has) || cs[0];
        if (next) tenseChoice[id] = comboKey(next);
        redrawCard(id, `[data-zg="${id}"]`, sel);
    });

    document.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-share]');
        if (!b) return;
        const url = `${location.origin}${location.pathname}#${b.dataset.share}`;
        if (navigator.share && matchMedia('(pointer: coarse)').matches) {
            try { await navigator.share({ title: b.dataset.title, url }); } catch (err) { /* closed the share sheet */ }
            return;
        }
        try { await navigator.clipboard.writeText(url); b.textContent = 'u kopjau'; } catch (err) { b.textContent = url; }
        setTimeout(() => { b.textContent = 'shpërndaj'; }, 1600);
    });

    // ▶: one player for the page; pressing the playing one again stops it
    const player = new Audio();
    let playing = null;
    const playDone = () => { if (playing) { playing.setAttribute('aria-pressed', 'false'); playing.textContent = '▶'; } playing = null; };
    let queue = []; // the rest of a linked form's clips
    player.addEventListener('ended', () => { if (queue.length) { player.src = queue.shift(); player.play().catch(playDone); } else playDone(); });
    player.addEventListener('error', playDone);
    document.addEventListener('click', (e) => {
        const b = e.target.closest('[data-audio]');
        if (!b) return;
        const again = playing === b;
        player.pause();
        queue = [];
        playDone();
        if (again) return;
        [player.src, ...queue] = b.dataset.audio.split(' ');
        player.play().then(() => { playing = b; b.setAttribute('aria-pressed', 'true'); b.textContent = '■'; }).catch(playDone);
    });

    // "ruaj": the card as a PNG. html2canvas (docs/vendor, loaded on first use) draws it; it is then set on the page colour
    // with the card's slab edge and the site's name, and handed to the share sheet (phones) or downloaded.
    let h2c = null;
    const loadH2c = () => h2c || (h2c = new Promise((ok, fail) => {
        const s = document.createElement('script');
        s.src = 'vendor/html2canvas.min.js';
        s.onload = () => ok(window.html2canvas);
        s.onerror = () => { h2c = null; fail(new Error('html2canvas')); };
        document.head.append(s);
    }));
    const cardPng = async (card) => {
        const html2canvas = await loadH2c();
        await document.fonts.ready;
        const scale = Math.min(3, Math.max(2, window.devicePixelRatio || 1));
        // wide tables scroll inside the card: widen the copy so they show in full
        const extra = Math.max(0, ...[...card.querySelectorAll('.table-wrap')].map((t) => t.scrollWidth - t.clientWidth));
        const width = card.offsetWidth + extra;
        card.dataset.snap = '';
        let shot;
        try {
            shot = await html2canvas(card, {
                scale, backgroundColor: null, logging: false, windowWidth: Math.max(window.innerWidth, width + 64),
                onclone: (doc) => {
                    const c = doc.querySelector('[data-snap]');
                    // controls and links mean nothing in a picture
                    c.querySelectorAll('.share-row, .vpick, .vsug, .play').forEach((x) => x.remove());
                    c.querySelectorAll('.miss-key').forEach((x) => { if (x.querySelector('a')) x.remove(); });
                    // html2canvas draws the panel's stepped shadow as a frame: keep just the lighter panel
                    c.querySelectorAll('.table-wrap').forEach((x) => { x.style.overflow = 'visible'; x.style.boxShadow = 'none'; });
                    // a tense page's card has its title outside it: put the tense (and mood) on top
                    if (c.dataset.tense && !c.querySelector('h3')) {
                        const t = doc.createElement('h3');
                        t.textContent = (LABEL[c.dataset.tense] || '') + (c.dataset.mood ? ', ' + c.dataset.mood : '');
                        c.prepend(t);
                    }
                    Object.assign(c.style, { width: width + 'px', maxWidth: 'none', boxShadow: 'none', outline: 'none' });
                    if (c.classList.contains('post')) Object.assign(c.style, { borderTop: '0', paddingTop: '0' }); // no divider line above a lone post
                },
            });
        } finally { delete card.dataset.snap; }
        const css = getComputedStyle(card);
        const page = getComputedStyle(document.body);
        const pad = 28 * scale, edge = 6 * scale, foot = 24 * scale, r = 10 * scale;
        const out = document.createElement('canvas');
        out.width = shot.width + edge + pad * 2;
        out.height = shot.height + edge + pad * 2 + foot;
        const ctx = out.getContext('2d');
        ctx.fillStyle = page.backgroundColor;
        ctx.fillRect(0, 0, out.width, out.height);
        const slab = (x, y) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, shot.width, shot.height, r); else ctx.rect(x, y, shot.width, shot.height); ctx.fill(); };
        ctx.fillStyle = css.getPropertyValue('--card-side').trim() || '#000';
        if (card.classList.contains('entry')) slab(pad, pad + edge); // the solid side face, down-left like on the page (blog posts have no card)
        ctx.drawImage(shot, pad + edge, pad);
        ctx.font = `${11 * scale}px 'IBM Plex Mono', ui-monospace, monospace`;
        ctx.fillStyle = page.color;
        ctx.globalAlpha = 0.6;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('shqipollog.com', out.width - pad, out.height - pad * 0.7);
        return new Promise((ok) => out.toBlob(ok, 'image/png'));
    };
    const savePng = async (blob, name) => {
        const file = new File([blob], name, { type: 'image/png' });
        if (matchMedia('(pointer: coarse)').matches && navigator.canShare && navigator.canShare({ files: [file] })) {
            try { await navigator.share({ files: [file] }); return; } catch (err) { if (err.name === 'AbortError') return; /* no gesture left: download instead */ }
        }
        const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    };
    document.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-save]');
        if (!b || b.disabled) return;
        const card = b.closest('.entry, .post');
        if (!card) return;
        b.disabled = true;
        b.textContent = 'po ruhet…';
        try {
            await savePng(await cardPng(card), `shqipollog-${b.dataset.save || 'karta'}.png`);
            b.textContent = 'ruaj';
        } catch (err) {
            b.textContent = 's’u ruajt';
            setTimeout(() => { b.textContent = 'ruaj'; }, 1600);
        }
        b.disabled = false;
    });

    view.addEventListener('click', (e) => {
        const b = e.target.closest('[data-page]');
        if (!b) return;
        state.page = Number(b.dataset.page);
        renderView();
        toTop();
    });

    const comboOf = (el) => { const box = el.closest('.conjugate'); return box && { box, c: { tense: box.dataset.tense, mood: box.dataset.mood } }; };
    const showSug = (box, c) => {
        const sug = box.querySelector('.vsug');
        const q = norm(box.querySelector('.vq').value.trim());
        if (!q) { sug.hidden = true; sug.innerHTML = ''; return; }
        const hits = poolFor(c).filter((v) => norm([v.w.word, v.w.std].filter(Boolean).join(' ')).includes(q)).slice(0, 8);
        sug.innerHTML = hits.length
            ? hits.map((v) => `<button type="button" data-verb="${esc(vKey(v.w))}">${fmt(vKey(v.w))}${v.w.std && v.w.std !== v.w.word ? ` <span class="hstd">${fmt(v.w.std)}</span>` : ''}</button>`).join('')
            : `<p class="miss-key">${NON_FINITE.includes(c.tense) ? 'Asni folje me pjesore.' : 'Asni folje me kët koh.'}</p>`;
        sug.hidden = false;
    };
    view.addEventListener('input', (e) => {
        if (!e.target.classList.contains('vq')) return;
        const x = comboOf(e.target);
        if (x) showSug(x.box, x.c);
    });
    view.addEventListener('keydown', (e) => {
        if (!e.target.classList.contains('vq') || e.key !== 'Enter') return;
        const first = e.target.closest('.conjugate').querySelector('[data-verb]');
        if (first) { e.preventDefault(); first.click(); }
    });
    view.addEventListener('click', (e) => {
        const pick = e.target.closest('[data-verb]');
        const again = e.target.closest('.vrand');
        if (!pick && !again) return;
        const x = comboOf(e.target);
        if (!x) return;
        if (pick) pickState.verb = pick.dataset.verb;
        else { const v = randomFrom(poolFor(x.c), pickState.shown[comboKey(x.c)]); if (v) pickState.verb = vKey(v.w); }
        renderView();
        if (again) view.querySelector('.vrand')?.focus();
    });

    view.addEventListener('click', (e) => {
        const b = e.target.closest('[data-zgm]');
        if (!b) return;
        tenseChoice[b.dataset.zgm] = b.dataset.combo;
        redrawCard(b.dataset.zgm, `[data-zgm="${b.dataset.zgm}"][aria-pressed="true"]`);
    });

    view.addEventListener('click', (e) => {
        const b = e.target.closest('[data-v]');
        if (!b) return;
        state.v[state.item] = b.dataset.v;
        renderView();
        if (TENSE_IDS.includes(state.item)) { const g = ENTRIES.find((x) => x.type === 'gramatike' && x.tense === state.item && x.mood === b.dataset.v); setHash(g ? g.id : slug(LABEL[state.item])); return; }
        const cur = ENTRIES.find((x) => x.item === state.item && x.v === b.dataset.v);
        if (cur) setHash(cur.id);
    });

    // Redraw a moment after typing stops, so a long list doesn't re-render on every keystroke.
    let searchTimer = 0;
    search.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => { renderTabs(); if (state.tab === 'gramatike') renderPanel(); renderView(); }, 120);
    });

    const themeBtn = document.getElementById('theme');
    // Four palettes, from darkest page to lightest. The button shows the current one's icon (a small inline SVG
    // in the text colour, so it looks the same on every device) and its name sits next to it.
    const icon = (body) => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
    const THEMES = [
        ['dark', 'baltë', icon('<path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/>')],
        ['grass', 'bar', icon('<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/>')],
        ['soil', 'traull', icon('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12a8.5 8.5 0 0 0 17 0z" fill="currentColor"/>')],
        ['light', 'letër', icon('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>')],
    ];
    const themeName = document.getElementById('theme-name');
    const themeIndex = () => Math.max(0, THEMES.findIndex((t) => t[0] === document.documentElement.dataset.theme));
    const setThemeLabel = () => { const t = THEMES[themeIndex()]; themeBtn.innerHTML = t[2]; themeName.textContent = t[1]; themeBtn.title = 'Ndroe temën'; themeBtn.setAttribute('aria-label', `Tema: ${t[1]}. Ndroe temën`); };
    setThemeLabel();
    themeBtn.addEventListener('click', () => {
        const next = THEMES[(themeIndex() + 1) % THEMES.length][0];
        document.documentElement.dataset.theme = next;
        try { localStorage.setItem('shqipollog-theme', next); } catch (e) {}
        setThemeLabel();
    });

    const openHash = () => {
        const h = decodeURIComponent(location.hash.slice(1));
        let target = null;
        const item = ITEMS.find((x) => slug(x.label) === h);
        if (TABS.some((t) => t.id === h)) state.tab = h;
        else if (TAXONOMY.dictionaryCategories.some((x) => x.id === h)) { state.tab = 'fjalor'; state.fjalor = h; }
        else if (TAXONOMY.blog.some((x) => x.id === h)) { state.tab = 'blog'; state.blog = h; }
        else if (item) { state.tab = 'gramatike'; state.item = item.id; }
        else if (byId[h]) {
            const e = byId[h];
            search.value = '';
            state.tab = TAB_OF_TYPE[e.type];
            if (e.type === 'gramatike') { state.item = e.item; state.v[e.item] = e.v; }
            else { state[state.tab] = 'all'; state.pageTo = h; target = h; }
        }
        render();
        const el = target && !state.restore && document.getElementById(target);
        if (el) {
            el.classList.add('focus');
            el.scrollIntoView({ block: 'start' });
        }
    };

    if (focus !== undefined && ENTRIES[focus]) {
        state.only = ENTRIES[focus].id;
        history.replaceState(null, '', '#' + ENTRIES[focus].id);
    }
    // A refresh comes back to where you were: same #…, same list page, same scroll position.
    // (The browser can't restore the scroll by itself: the content is drawn only after entries.json loads.)
    const PLACE = 'shqipollog-place';
    const reloaded = (performance.getEntriesByType('navigation')[0] || {}).type === 'reload';
    let place = null;
    if (!PREVIEW) {
        if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
        try { place = reloaded ? JSON.parse(sessionStorage.getItem(PLACE) || 'null') : null; } catch (e) {}
        if (place && place.hash !== location.hash) place = null;
        window.addEventListener('pagehide', () => {
            try { sessionStorage.setItem(PLACE, JSON.stringify({ hash: location.hash, y: Math.round(scrollY), page: state.page, list: listKey })); } catch (e) {}
        });
    }
    // Phone: the sticky bar (search, tabs, filters) is a quarter of the screen. It slides away while
    // scrolling down and comes back on any scroll up. Never while typing in it.
    const side = document.querySelector('.side');
    const narrow = matchMedia('(max-width: 860px)');
    let lastY = scrollY;
    window.addEventListener('scroll', () => {
        const y = scrollY;
        const dy = y - lastY;
        if (Math.abs(dy) < 6) return;
        lastY = y;
        const stuck = narrow.matches && side.getBoundingClientRect().top <= 1 && y > side.parentElement.offsetTop;
        side.classList.toggle('tucked', stuck && dy > 0 && !side.contains(document.activeElement));
    }, { passive: true });

    if (place) state.restore = place;
    window.addEventListener('hashchange', openHash);
    openHash();
    if (place) { state.restore = null; window.scrollTo(0, place.y); }
};

const PREVIEW = new URLSearchParams(location.search).has('preview') && window.parent !== window;
if (PREVIEW) {
    document.documentElement.classList.add('preview');
    window.addEventListener('message', (m) => {
        if (m.origin !== location.origin || !m.data || !Array.isArray(m.data.entries)) return;
        boot(m.data.entries, m.data.focus, true);
    }, { once: true });
    window.parent.postMessage('ready', location.origin);
} else {
    fetch('entries.json')
        .then((r) => r.json())
        .then((list) => boot(list));
}
