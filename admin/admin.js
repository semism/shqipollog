const SERVED = !TOKEN.startsWith('__');

const ITEMS = TAXONOMY.grammarMenu.flatMap((g) => g.items.map((x) => ({ ...x, group: g.label })));
const PRONOUNS = ITEMS.filter((x) => x.group === 'Përemra').map((x) => x.id);
const LABEL = Object.fromEntries([...TAXONOMY.dictionaryCategories, ...TAXONOMY.blog, ...ITEMS].map((x) => [x.id, x.label]));
const { PERSON_KEYS: PERSONS, PERSON_LABEL: PLABEL, CASES, asList, day, personsOf } = SHARED;
const ORDER = ['id', 'type', 'sub', 'cat', 'tense', 'mood', 'pronoun', 'case', 'date', 'place', 'draft', 'review', 'title', 'word', 'gender', 'pos',
    'std', 'pronunciation', 'audio', 'audios', 'video', 'intro', 'meaning', ...PERSONS, 'm', 'f', 'njejes', 'shumes', 'pashquar', 'shquar', ...CASES.map((c) => c[0]),
    'participle', 'participleReview', 'variants', 'variantsNote', 'declension', 'words', 'conjugation', 'examples', 'footnotes', 'text', 'body'];
// true/false flags that are left out of the file when false
const REVIEW_KEYS = ['draft', 'review', 'participleReview'];
// filled in without a speaker's check yet: a tense with review: true, or a verb with participleReview: true
const needsReview = (e) => (e.words || []).some((w) => w.participleReview || (w.conjugation || []).some((z) => z.review));
const reviewBox = (obj, key) => h('label', { class: 'check review', title: 'Format u mbushën pa u kontrollu nga një folës. Hiqe kur t’i kesh kontrollu.' },
    h('input', { type: 'checkbox', checked: !!obj[key], onchange: (ev) => { if (ev.target.checked) obj[key] = true; else delete obj[key]; changed(); } }), 'pret rishikim');
const today = () => new Date().toLocaleDateString('sv');
const { norm } = SHARED;

let entries = [];
let cur = -1;
let dirty = false;
let filter = 'all';

// ---------- small DOM helper ----------
const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (v === undefined || v === null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'value') el.value = v;
        else if (k === 'checked') el.checked = !!v;
        else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
    }
    kids.flat(Infinity).forEach((c) => { if (c !== null && c !== undefined && c !== false) el.append(c.nodeType ? c : document.createTextNode(c)); });
    return el;
};

// ---------- data cleanup (for save and preview) ----------
const order = (o) => {
    const keys = Object.keys(o);
    const rank = (k) => { const i = ORDER.indexOf(k === 'sub' && o.type === 'blog' ? 'title' : k) + (k === 'sub' && o.type === 'blog' ? 0.5 : 0); return i < 0 ? ORDER.length + keys.indexOf(k) : i; };
    return Object.fromEntries(keys.sort((a, b) => rank(a) - rank(b)).map((k) => [k, o[k]]));
};
const clean = (v, key, top) => {
    if (typeof v === 'string') { const t = v.trim(); return t === '' ? undefined : t; }
    if (typeof v === 'boolean') return REVIEW_KEYS.includes(key) && !v ? undefined : v;
    if (Array.isArray(v)) {
        const out = v.map((x) => clean(x, key)).filter((x) => x !== undefined);
        return out.length ? out : undefined;
    }
    if (v && typeof v === 'object') {
        const out = {};
        for (const [k, x] of Object.entries(v)) { const c = clean(x, k); if (c !== undefined) out[k] = c; }
        return Object.keys(out).length || top ? order(out) : undefined;
    }
    return v;
};
const cleaned = () => entries.map((e) => clean(e, null, true));

// ---------- titles ----------
const titleOf = (e) => {
    if (e.type === 'gramatike') return `${LABEL[e.tense || e.pronoun] || '(pa kohë)'}${e.mood || e.case ? ', ' + (e.mood || e.case) : ''}`;
    if (e.type === 'fjale') return e.word || (e.words || []).map((w) => w.word).filter(Boolean).join(', ') || '(pa fjalë)';
    return e.title || '(pa titull)';
};
const kindOf = (e) => (e.type === 'gramatike' ? 'Gramatikë' : e.type === 'fjale' ? LABEL[e.sub] : 'Blog, ' + (LABEL[e.cat] || ''));
const groupOf = (e) => (e.type === 'fjale' ? e.sub : e.type);

// ---------- status, preview ----------
const statusEl = document.getElementById('status');
const setStatus = (text, cls = '') => { statusEl.textContent = text; statusEl.className = cls; };
const iframe = document.getElementById('preview');
let previewTimer = 0;
const preview = () => {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => { iframe.src = '/index.html?preview&t=' + Date.now(); }, 250);
};
window.addEventListener('message', (m) => {
    if (m.origin !== location.origin || m.source !== iframe.contentWindow || m.data !== 'ready') return;
    iframe.contentWindow.postMessage({ entries: cleaned(), focus: cur >= 0 ? cur : undefined }, location.origin);
});

const changed = () => {
    dirty = true;
    setStatus('Ndryshime të paruajtura', 'dirty');
    renderList();
    const t = document.getElementById('title');
    if (t && entries[cur]) { if (t.tagName === 'INPUT') { if (document.activeElement !== t) t.value = headOf(entries[cur]).get(); } else t.textContent = titleOf(entries[cur]); }
    preview();
};
const set = (obj, key, val) => {
    if (val === '' || val === undefined || val === null || (Array.isArray(val) && !val.length)) delete obj[key];
    else obj[key] = val;
    changed();
};

// ---------- recordings ----------
// ● records from the microphone; ■ stops and sends it to serve.py, which stores it in docs/audio/ (as .mp3) and returns the path.
// A headword's clip goes in its `audio`. A single form's (a table cell, a variant) goes in `audios` of the word that owns it,
// keyed by the form's spelling, so one form in several tenses shares one clip. Recording any form is optional.
// Old files are deleted only when a save no longer points to them (see serve.py), so leaving without saving loses nothing.
const RECORD_TYPES = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm'];
const slugAscii = (t) => norm(t || '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'fjale';
let recording = null; // one at a time: { stop }
// Records one clip. ui: tick(seconds), saving(), done(path, error). Resolves true once recording has started.
const startRecording = async (name, ui) => {
    if (recording) return false;
    recording = { stop: () => {} }; // taken while the browser asks for the microphone
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true } }); }
    catch (err) { recording = null; ui.done(null, 'S’ka qasje te mikrofoni'); return false; }
    const type = RECORD_TYPES.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || '';
    const rec = new MediaRecorder(stream, type ? { mimeType: type } : {});
    const chunks = [];
    rec.ondataavailable = (ev) => { if (ev.data.size) chunks.push(ev.data); };
    const t0 = Date.now();
    const timer = setInterval(() => ui.tick(Math.round((Date.now() - t0) / 1000)), 250);
    rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(timer);
        recording = null;
        ui.saving();
        const blob = new Blob(chunks, { type: rec.mimeType || type || 'audio/webm' });
        try {
            const r = await fetch('/api/audio', { method: 'POST', headers: { 'Content-Type': blob.type, 'X-Token': TOKEN, 'X-Name': name }, body: blob });
            const res = await r.json();
            if (!r.ok) throw new Error(res.error || r.status);
            ui.done(res.path);
        } catch (err) { ui.done(null, 'Nuk u ruajt: ' + err.message); }
    };
    recording = { stop: () => { if (rec.state !== 'inactive') rec.stop(); } };
    rec.start();
    ui.tick(0);
    return true;
};
const playClip = (path) => new Audio('/' + path).play().catch(() => {});
// several clips one after another (a form the linker builds from pieces)
const playChain = (paths) => {
    const a = new Audio();
    const rest = [...paths];
    const next = () => { if (rest.length) { a.src = '/' + rest.shift(); a.play().catch(() => {}); } };
    a.onended = next;
    next();
};
const redrawForm = () => { const y = formEl.scrollTop; draw(); formEl.scrollTop = y; };
// the e tashme (dëftore) "un" form of a verb shares the headword's recording (`audio`), not an `audios` entry
const linkedToHead = (owner, form) => !!owner.conjugation && form === SHARED.headForm(owner);
// a saved clip's length ("1.4 s"), read from the file itself, so older clips show it too
const clipLength = (path) => {
    const tag = h('span', { class: 'clip-len' });
    const a = new Audio();
    a.preload = 'metadata';
    a.onloadedmetadata = () => { if (isFinite(a.duration)) tag.textContent = `${a.duration.toFixed(1)} s`; };
    a.onerror = () => { tag.textContent = 'mungon skedari'; tag.title = path; };
    a.src = '/' + path;
    return tag;
};

// The headword's `audio` row. The ● button stays the same element while recording, so ■ can be pressed anywhere on it.
const recorder = (obj) => {
    let live = false;
    const btn = h('button', { class: 'btn small', type: 'button', disabled: !SERVED });
    const tools = h('span', { class: 'rec-tools' });
    const status = h('span', { class: 'hint' });
    const draw = (msg) => {
        btn.textContent = live ? '■ ndalo' : '● inçizo';
        btn.title = live ? 'Ndalo dhe ruaje' : 'Inçizo (mikrofoni)';
        btn.classList.toggle('live', live);
        tools.replaceChildren(...(obj.audio && !live ? [
            h('button', { class: 'btn small', type: 'button', title: obj.audio, onclick: () => playClip(obj.audio) }, '▶'),
            clipLength(obj.audio),
            removeBtn('Hiqe inçizimin', () => { set(obj, 'audio', ''); redrawForm(); })] : []));
        status.textContent = msg !== undefined ? msg : obj.audio ? obj.audio.replace('audio/', '') : SERVED ? '' : 'vetëm me serve.py';
    };
    btn.onclick = async () => {
        if (live) { recording.stop(); return; }
        const started = await startRecording(slugAscii(obj.word || obj.std), {
            tick: (sec) => { status.textContent = `● ${sec} s`; },
            saving: () => { live = false; draw('Po ruhet…'); },
            done: (path, err) => { live = false; if (path) { set(obj, 'audio', path); return redrawForm(); } draw(err); },
        });
        if (started) { live = true; draw('● 0 s'); }
    };
    draw();
    return h('div', { class: 'rec' }, h('label', {}, 'audio'), btn, tools, status);
};

// A small ● for one form; once recorded, ▶ and ✕. The clip goes in owner.audios[form].
const formMic = (owner, form) => {
    let live = false;
    const box = h('span', { class: 'mic' });
    const msg = h('span', { class: 'mic-msg' });
    const head = linkedToHead(owner, form);
    const clip = () => (head ? owner.audio : owner.audios && owner.audios[form]);
    const forget = () => {
        if (head) { set(owner, 'audio', ''); return redrawForm(); }
        delete owner.audios[form]; if (!Object.keys(owner.audios).length) delete owner.audios; changed(); redrawForm();
    };
    const toggle = async () => {
        if (live) { recording.stop(); return; }
        const started = await startRecording(slugAscii(form), {
            tick: (sec) => { msg.textContent = `${sec}s`; },
            saving: () => { msg.textContent = '…'; },
            done: (path, err) => {
                live = false;
                msg.textContent = err ? '!' : '';
                msg.title = err || '';
                if (path && head) { set(owner, 'audio', path); return redrawForm(); }
                if (path) { owner.audios = { ...(owner.audios || {}), [form]: path }; changed(); return redrawForm(); }
                draw();
            },
        });
        if (started) { live = true; draw(); }
    };
    const draw = () => {
        const has = clip();
        // no recording of its own, but the site can build it from recorded pieces (SHARED.clipChain): show and play that
        const chain = !has && !live ? SHARED.clipChain(owner.conjugation ? SHARED.clipsOf(owner) : owner.audios, form, owner.conjugation ? helper() : null) : null;
        box.replaceChildren(...[ // replaceChildren would print null as "null": drop the empty slots
            chain ? h('button', { class: 'm linked', type: 'button', title: `Dëgjo nga pjesët (${chain.paths.length}): ${form}. Inçizimi i vet e zëvendëson.`, onclick: () => playChain(chain.paths) }, '▶ pjesët') : null,
            has && !live ? h('button', { class: 'm', type: 'button', title: `Dëgjo: ${form}`, onclick: () => playClip(has) }, '▶')
                : h('button', { class: 'm' + (live ? ' live' : ''), type: 'button', disabled: !SERVED, title: live ? 'Ndalo dhe ruaje' : `Inçizo: ${form}`, onclick: toggle }, live ? '■' : '●'),
            has && !live ? clipLength(has) : null,
            has && !live ? h('button', { class: 'm', type: 'button', title: `Hiqe inçizimin: ${form}`, onclick: forget }, '✕') : null,
            msg].filter(Boolean));
    };
    draw();
    return box;
};
// One mic per form in a box (a box can hold several forms, one per line). redraw() after the text changes.
const formMics = (owner, getForms) => {
    const box = h('div', { class: 'mics' });
    box.redraw = () => {
        const forms = [...new Set(getForms().map((f) => String(f).trim()).filter(Boolean))];
        box.replaceChildren(...forms.map((f) => h('span', { class: 'mic-form' }, forms.length > 1 ? h('span', { class: 'mic-label' }, f) : null, formMic(owner, f))));
    };
    box.redraw();
    return box;
};

// ---------- field builders ----------
const row = (label, input) => h('div', { class: 'row' }, h('label', {}, label), input);
const text = (obj, key, label = key, ph = '') => row(label, h('input', { type: 'text', value: obj[key] || '', placeholder: ph, oninput: (ev) => set(obj, key, ev.target.value) }));
const choose = (obj, key, label, options, onchange) => row(label, h('select', {
    onchange: (ev) => { if (onchange) onchange(ev.target.value); else set(obj, key, ev.target.value); },
}, options.map(([v, l]) => h('option', { value: v, selected: (obj[key] || '') === v }, l))));

// a list of strings, one box per item
const lines = (obj, key, label = key, hint, owner = null) => {
    const box = h('div', { class: 'lines' });
    const draw = () => {
        const arr = obj[key] || [];
        box.replaceChildren(
            ...arr.map((t, i) => {
                const mics = owner ? formMics(owner, () => [arr[i] || '']) : null;
                return h('div', {},
                h('textarea', { rows: 1, value: t, oninput: (ev) => { arr[i] = ev.target.value; set(obj, key, arr); if (mics) mics.redraw(); } }),
                mics,
                h('button', { class: 'x', type: 'button', title: 'Hiqe', onclick: () => { arr.splice(i, 1); set(obj, key, arr); draw(); } }, '✕'));
            }),
            h('button', { class: 'btn small', type: 'button', onclick: () => { obj[key] = [...arr, '']; changed(); draw(); box.querySelectorAll('textarea')[arr.length]?.focus(); } }, '+ shto'),
        );
    };
    draw();
    return row(label, h('div', {}, hint ? h('p', { class: 'hint' }, hint) : null, box));
};

// boxes the rules just filled: highlighted until you type in them or save
let autoMarks = new WeakMap();
const mark = (obj, key) => { if (!autoMarks.has(obj)) autoMarks.set(obj, new Set()); autoMarks.get(obj).add(key); };
const marked = (obj, key) => !!(autoMarks.get(obj) && autoMarks.get(obj).has(key));

// one cell that can hold several forms (one per line)
const cellInput = (obj, key, after) => h('textarea', {
    rows: 1,
    class: marked(obj, key) ? 'auto' : null,
    value: asList(obj[key]).join('\n'),
    oninput: (ev) => {
        if (autoMarks.get(obj)) autoMarks.get(obj).delete(key);
        ev.target.classList.remove('auto');
        const parts = ev.target.value.split('\n').filter((l) => l.trim());
        set(obj, key, parts.length > 1 ? parts : parts[0] || '');
        if (after) after();
    },
});
// a form box with a mic per form; owner: the word whose `audios` holds the clips (none: no mics)
const formCell = (obj, key, owner) => {
    if (!owner) return cellInput(obj, key);
    const mics = formMics(owner, () => asList(obj[key]));
    return h('div', { class: 'fcell' }, cellInput(obj, key, () => mics.redraw()), mics);
};

const swap = (arr, i, j) => { [arr[i], arr[j]] = [arr[j], arr[i]]; };

// persons grid: main forms plus variant columns
const personGrid = (target, redraw, persons = PERSONS, owner = null) => {
    const vars = target.variants || [];
    const empty = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    // Columns are variant 0 (the main forms) and variant 1..n, which only hold the persons that differ.
    // Moving one fills every column in full, swaps, then strips each variant back to what differs from variant 0.
    const move = (i, j) => {
        const full = [target, ...vars].map((o, k) => Object.fromEntries(PERSONS
            .map((p) => [p, k === 0 || empty(o[p]) ? target[p] : o[p]])
            .filter(([, v]) => !empty(v))));
        swap(full, i, j);
        PERSONS.forEach((p) => { delete target[p]; if (!empty(full[0][p])) target[p] = full[0][p]; });
        vars.forEach((v, k) => PERSONS.forEach((p) => {
            delete v[p];
            const f = full[k + 1][p];
            if (!empty(f) && !same(f, target[p])) v[p] = f;
        }));
        changed(); redraw();
    };
    const arrows = (i) => [
        h('button', { class: 'x', type: 'button', title: 'Majtas', disabled: i === 0, onclick: () => move(i, i - 1) }, '←'),
        h('button', { class: 'x', type: 'button', title: 'Djathtas', disabled: i === vars.length, onclick: () => move(i, i + 1) }, '→'),
    ];
    const head = h('tr', {}, h('th'), h('th', {}, 'variant 0 ', arrows(0)),
        vars.map((v, i) => h('th', { class: 'gs' }, `variant ${i + 1} `, arrows(i + 1),
            h('button', { class: 'x', type: 'button', title: 'Hiqe variantin', onclick: () => { vars.splice(i, 1); set(target, 'variants', vars); redraw(); } }, '✕'))),
        h('th', {}, h('button', { class: 'btn small', type: 'button', onclick: () => { target.variants = [...vars, {}]; changed(); redraw(); } }, '+ variant')));
    const body = persons.map((p) => h('tr', {}, h('th', {}, PLABEL[p]), h('td', {}, formCell(target, p, owner)),
        vars.map((v) => h('td', { class: 'gs' }, formCell(v, p, owner))), h('td')));
    return h('div', { class: 'scroll' }, h('table', { class: 'grid' }, h('thead', {}, head), h('tbody', {}, body)),
        h('p', { class: 'hint' }, 'Enter brenda një kutie = formë tjetër për të njëjtin person. Variantet 1, 2… mbushen vetëm aty ku ndryshojnë nga varianti 0.'));
};

// m/f × njëjës/shumës grid for adjectives
const adjGrid = (w, owner = w) => {
    const put = (n, g, val) => { w[n] = w[n] || {}; set(w[n], g, val); if (!Object.keys(w[n]).length) delete w[n]; };
    const inp = (n, g) => {
        const mics = formMics(owner, () => asList((w[n] || {})[g]));
        return h('div', { class: 'fcell' }, h('textarea', { rows: 1, value: (w[n] || {})[g] || '', oninput: (ev) => { put(n, g, ev.target.value); mics.redraw(); } }), mics);
    };
    return h('table', { class: 'grid' },
        h('thead', {}, h('tr', {}, h('th'), h('th', {}, 'njëjës'), h('th', {}, 'shumës'))),
        h('tbody', {}, [['m', 'mashkullore'], ['f', 'femërore']].map(([g, l]) => h('tr', {}, h('th', {}, l), h('td', {}, inp('njejes', g)), h('td', {}, inp('shumes', g))))));
};

// declension grid for nouns
const nounGrid = (e) => {
    const cols = [['njejes', 'pashquar'], ['njejes', 'shquar'], ['shumes', 'pashquar'], ['shumes', 'shquar']];
    const get = (n, d, k) => (((e.declension || {})[n] || {})[d] || {})[k] || '';
    const put = (n, d, k, val) => {
        e.declension = e.declension || {};
        const L = e.declension;
        L[n] = L[n] || {}; L[n][d] = L[n][d] || {};
        if (val.trim()) L[n][d][k] = val; else delete L[n][d][k];
        if (!Object.keys(L[n][d]).length) delete L[n][d];
        if (!Object.keys(L[n]).length) delete L[n];
        if (!Object.keys(L).length) delete e.declension;
        changed();
    };
    return h('div', { class: 'scroll' }, h('table', { class: 'grid' },
        h('thead', {},
            h('tr', {}, h('th'), h('th', { colspan: 2 }, 'njëjës'), h('th', { colspan: 2, class: 'gs' }, 'shumës')),
            h('tr', {}, h('th'), cols.map(([, d], i) => h('th', { class: i === 2 ? 'gs' : null }, d === 'shquar' ? 'e shquar' : 'e pashquar')))),
        h('tbody', {}, CASES.map(([k, l]) => h('tr', {}, h('th', {}, l),
            cols.map(([n, d], i) => {
                const mics = formMics(e, () => [get(n, d, k)]);
                return h('td', { class: i === 2 ? 'gs' : null }, h('div', { class: 'fcell' },
                    h('textarea', { rows: 1, value: get(n, d, k), oninput: (ev) => { put(n, d, k, ev.target.value); mics.redraw(); } }), mics));
            }))))));
};

const section = (legend, ...kids) => h('fieldset', {}, h('legend', {}, legend), ...kids);
const removeBtn = (label, fn) => h('button', { class: 'x', type: 'button', title: label, onclick: fn }, '✕');

// ---------- per-type editors ----------
const metaFields = (e) => h('div', {},
    h('div', { class: 'inline' },
        row('date', h('input', { type: 'date', value: e.date || '', oninput: (ev) => set(e, 'date', ev.target.value) })),
        row('place', h('input', { type: 'text', value: e.place || '', oninput: (ev) => set(e, 'place', ev.target.value) })),
        h('label', { class: 'check draft' }, h('input', { type: 'checkbox', checked: e.draft, onchange: (ev) => set(e, 'draft', ev.target.checked || '') }), 'fshehur (nuk del në faqe)')),
    h('details', {}, h('summary', { class: 'hint' }, 'id e linkut'), text(e, 'id', 'id', 'bosh = automatik')));

const STRUCT = { folje: 'words', mbiemra: 'words', emra: 'word', ndajfolje: 'word' };
const changeSub = (e, sub) => {
    if (STRUCT[sub] !== STRUCT[e.sub]) {
        const hasForms = e.declension || (e.words || []).some((w) => Object.keys(w).some((k) => k !== 'word' && k !== 'std'));
        if (hasForms && !confirm('Ky ndryshim e fshin tabelën e formave. Vazhdo?')) return draw();
        if (STRUCT[sub] === 'words') {
            e.words = [{ word: e.word || '', std: e.std }];
            delete e.word; delete e.std; delete e.declension; delete e.gender;
        } else {
            e.word = (e.words || []).map((w) => w.word).filter(Boolean).join(', ');
            const s = (e.words || [])[0] && e.words[0].std;
            if (s) e.std = s;
            delete e.words;
        }
    }
    e.sub = sub;
    changed(); draw();
};

// valid tense + mood pairs, from TAXONOMY.tenses / TAXONOMY.moods
const TENSE_LABEL = Object.fromEntries(TAXONOMY.tenses.map((k) => [k.id, k.label]));
const LINKS = TAXONOMY.sameForms || {};
// Pairs that share another pair's forms (sameForms) are edited once, under that other pair.
const COMBOS = SHARED.COMBOS.filter((c) => !LINKS[c.key]);
const linkedTo = (key) => Object.keys(LINKS).filter((a) => LINKS[a] === key).map((a) => { const [k, m] = a.split('|'); return `${TENSE_LABEL[k]}, ${m}`; });
const usedCombos = (w, except) => (w.conjugation || []).filter((z) => z !== except).map((z) => z.tense + '|' + z.mood);
const comboRank = (z) => { const i = COMBOS.findIndex((c) => c.tense === z.tense && c.mood === z.mood); return i < 0 ? COMBOS.length : i; };
const sortZ = (w) => { if (w.conjugation) w.conjugation.sort((a, b) => comboRank(a) - comboRank(b)); };
const { helperOnly, unusedFor: blocked } = SHARED;
const freeCombo = (w) => COMBOS.find((c) => !blocked(w, c.key) && !usedCombos(w).includes(c.key));
const comboSelect = (w, z, redraw) => {
    const curKey = z.tense + '|' + z.mood;
    const taken = usedCombos(w, z);
    const groups = TAXONOMY.tenses.filter((k) => COMBOS.some((c) => c.tense === k.id)).map((k) => h('optgroup', { label: k.label },
        COMBOS.filter((c) => c.tense === k.id).map((c) => h('option', { value: c.key, selected: c.key === curKey, disabled: taken.includes(c.key) || (blocked(w, c.key) && c.key !== curKey) },
            `${k.label}, ${c.mood}${linkedTo(c.key).map((l) => ' = ' + l).join('')}${(TAXONOMY.unused || []).includes(c.key) ? (helperOnly(w, c.key) ? ' (vetëm për ndihmësen)' : ' (nuk përdoret)') : ''}${taken.includes(c.key) ? ' (e ke)' : ''}`))));
    const unknown = COMBOS.some((c) => c.key === curKey) ? null : h('option', { value: curKey, selected: true }, `${TENSE_LABEL[z.tense] || z.tense || '?'} ${z.mood || '?'} (jo e vlefshme)`);
    return row('conjugation', h('select', { onchange: (ev) => {
        const [tense, mood] = ev.target.value.split('|');
        const keep = personsOf(mood);
        const lost = [z, ...(z.variants || [])].some((o) => PERSONS.some((p) => !keep.includes(p) && o[p]));
        if (lost && !confirm(`${mood} ka vetëm: ${keep.map((p) => PLABEL[p]).join(', ')}. Format e tjera fshihen. Vazhdo?`)) { ev.target.value = curKey; return; }
        [z, ...(z.variants || [])].forEach((o) => PERSONS.forEach((p) => { if (!keep.includes(p)) delete o[p]; }));
        z.tense = tense; z.mood = mood;
        autoFill(z, w);
        changed(); redraw();
    } }, unknown, groups));
};

// ---------- compound tenses: rules from TAXONOMY.rules ----------
const RULES = TAXONOMY.rules || [];
const isEmpty = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);
// Simple tenses from the present first person (TAXONOMY.stems). The present itself is filled from its own "un" box.
const STEMS = TAXONOMY.stems || [];
const firstPerson = (w, z) => {
    const src = z.tense === 'tashmja' && z.mood === 'dëftore' ? z : tenseOf(w, ['tashmja', 'dëftore']);
    const un = src && asList(src.un)[0];
    return un ? String(un).split(/\s*\/\s*/)[0].trim() : '';
};
const stemRuleFor = (z, w) => {
    const all = STEMS.filter((s) => s.tense === z.tense && s.mood === z.mood);
    if (!all.length) return null;
    const un = firstPerson(w, z);
    return all.find((s) => un && new RegExp(`(${s.match})$`).test(un)) || { ...all[0], stem: true, unmatched: true };
};
const deriveStem = (s, w, z) => {
    const un = firstPerson(w, z);
    if (!un) return { missing: z.tense === 'tashmja' && z.mood === 'dëftore' ? 'forma e vetës “un”' : 'vetja “un” e së tashmes (dëftore)' };
    if (s.unmatched) return { missing: `një rregull për foljet si “${un}”` };
    const stem = s.cut ? un.slice(0, -s.cut) : un;
    const build = (o) => Object.fromEntries(Object.entries(o).filter(([p]) => personsOf(z.mood).includes(p)).map(([p, end]) => [p, stem + end]));
    return { main: build(s.forms), variants: (s.variants || []).map(build) };
};
const stemText = (s, w, z) => {
    const un = firstPerson(w, z) || '…';
    const stem = s.cut ? un.slice(0, -s.cut) : un;
    return `nga “${un}”: ${Object.values(s.forms).map((end) => stem + end).join(', ')}`;
};
// a tense's rule: compound (TAXONOMY.rules) or simple (TAXONOMY.stems); derive/describe either kind
const ruleFor = (z, w) => RULES.find((r) => r.tense === z.tense && r.mood === z.mood) || (w ? stemRuleFor(z, w) : null);
const { sourcesOf, sourceText, ruleText } = SHARED;
const verbWords = () => entries.filter((e) => e.type === 'fjale' && e.sub === 'folje').flatMap((e) => e.words || []);
const helper = () => verbWords().find((w) => w.std === TAXONOMY.auxiliary) || verbWords().find((w) => w.word === TAXONOMY.auxiliary);
// forms of a verb for one tense (from its own conjugation; Gramatikë entries hold no forms)
const tenseOf = (w, [tense, mood]) => (w.conjugation || []).find((z) => z.tense === tense && z.mood === mood && PERSONS.some((p) => !isEmpty(z[p]))) || null;
// columns in full: variant 0, then each variant with its blanks taken from variant 0
const fullCols = (t) => [t, ...(t.variants || [])].map((o) => Object.fromEntries(PERSONS.map((p) => [p, isEmpty(o[p]) ? t[p] : o[p]]).filter(([, v]) => !isEmpty(v))));
const derive = (r, w) => {
    let t = null, used = null;
    for (const s of sourcesOf(r)) {
        const v = s.aux ? helper() : w;
        if (!v) return { missing: `folja ndihmëse (std: ${TAXONOMY.auxiliary})` };
        t = (s.aux && (TAXONOMY.auxiliaryForms || {})[s.aux.join('|')]) || tenseOf(v, s.aux || s.self);
        if (t) { used = s; break; }
    }
    if (!t) return { missing: sourcesOf(r).map(sourceText).join(', ose ') };
    const strip = (x) => (used.strip && x.startsWith(used.strip) ? x.slice(used.strip.length) : x);
    const P = r.participle ? asList(w.participle) : [''];
    if (!P.length) return { missing: 'pjesorja e kësaj foljeje' };
    const one = (f, pj) => f.split(/\s+\/\s+/).map(strip).map((x) => (r.pre ? r.pre + x.replace(/^t[’']\s*/, '') : x) + (pj ? ' ' + pj : '')).join(' / ');
    const build = (col, pj) => Object.fromEntries(Object.entries(col).map(([p, v]) => [p, Array.isArray(v) ? v.map((f) => one(f, pj)) : one(v, pj)]));
    const cols = fullCols(t);
    const out = [build(cols[0], P[0]), ...P.slice(1).map((pj) => build(cols[0], pj)), ...cols.slice(1).map((c) => build(c, P[0]))];
    const main = out[0];
    let note = '';
    if (used.aj) {
        // aj/ajo is its own form here, not the source's: drop the copied ones and build it from "un"
        out.forEach((c) => delete c.aj);
        const un = firstPerson(w, {});
        const p = un && used.aj.find((x) => new RegExp(`(${x.match})$`).test(un));
        if (p) main.aj = (r.pre || '') + (p.cut ? un.slice(0, -p.cut) : un) + p.add;
        else note = `aj/ajo mbetet bosh: asnjë rregull për foljet si “${un || '…'}”`;
    }
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const variants = out.slice(1)
        .map((c) => Object.fromEntries(Object.entries(c).filter(([p, v]) => !same(v, main[p]))))
        .filter((c, i, all) => Object.keys(c).length && all.findIndex((x) => same(x, c)) === i);
    return { main, variants, note };
};
// fill only the empty boxes; add variant columns only if there are none yet
const fill = (z, d) => {
    if (!d || d.missing) return;
    PERSONS.forEach((p) => { if (isEmpty(z[p]) && !isEmpty(d.main[p])) { z[p] = d.main[p]; mark(z, p); } });
    if (!(z.variants || []).length && d.variants.length) {
        z.variants = structuredClone(d.variants);
        z.variants.forEach((v) => Object.keys(v).forEach((p) => mark(v, p)));
    }
};
const selfStem = (z) => z.tense === 'tashmja' && z.mood === 'dëftore';
const deriveAny = (r, w, z) => (r.forms ? deriveStem(r, w, z) : derive(r, w));
const describe = (r, w, z) => (r.forms ? (r.unmatched ? 'sipas mbaresës së “un”' : stemText(r, w, z)) : ruleText(r));
const autoFill = (z, w) => {
    const r = ruleFor(z, w);
    if (r && PERSONS.every((p) => isEmpty(z[p])) && !(z.variants || []).length) fill(z, deriveAny(r, w, z));
};

// how many of a verb's tenses are filled for every person (own table, linked pair, or Gramatikë)
const progress = (e) => {
    const words = (e.words || []).filter((w) => w.word || w.std);
    if (!words.length) return null;
    let done = 0, total = 0;
    const missing = [];
    words.forEach((w) => COMBOS.filter((c) => !blocked(w, c.key)).forEach((c) => {
        total++;
        const t = tenseOf(w, [c.tense, c.mood]);
        if (t && personsOf(c.mood).every((p) => !isEmpty(t[p]))) done++;
        else missing.push(`${TENSE_LABEL[c.tense]} (${c.mood})`);
    }));
    return { done, total, missing };
};
// ---------- recording count: own clip / built from pieces (the linker) / nothing yet ----------
// Every distinct form of a Fjalor entry, with the word whose recordings it belongs to.
const formsOf = (e) => {
    const out = [];
    const add = (owner, v) => asList(v).forEach((f) => { const t = String(f).trim(); if (t) out.push([owner, t]); });
    if (e.type !== 'fjale') return out;
    if (e.sub === 'folje') (e.words || []).forEach((w) => {
        add(w, w.participle);
        (w.conjugation || []).forEach((z) => [z, ...(z.variants || [])].forEach((o) => PERSONS.forEach((p) => add(w, o[p]))));
    });
    else if (e.sub === 'mbiemra') (e.words || []).forEach((w) => [w, ...(w.variants || [])].forEach((v) => {
        add(w, v.word);
        ['njejes', 'shumes'].forEach((n) => ['m', 'f'].forEach((g) => add(w, (v[n] || {})[g])));
    }));
    else {
        add(e, e.word);
        Object.values(e.declension || {}).forEach((a) => Object.values(a).forEach((b) => Object.values(b).forEach((f) => add(e, f))));
        (e.variants || []).forEach((v) => add(e, v));
    }
    return out;
};
const audioStats = (e) => {
    const seen = new Set();
    const n = { own: 0, linked: 0, none: 0 };
    const aux = helper();
    formsOf(e).forEach(([owner, f]) => {
        const key = (owner.word || owner.std || '') + '\u0000' + f.replace(/'/g, '’');
        if (seen.has(key)) return;
        seen.add(key);
        // a headword's own clip is its `audio` (for verbs SHARED.clipsOf already maps it to the present's "un")
        const own = owner.conjugation ? SHARED.clipsOf(owner) : { ...(owner.audios || {}), ...(owner.audio && owner.word ? { [owner.word]: owner.audio } : {}) };
        const c = SHARED.clipChain(own, f, owner.conjugation ? aux : null);
        n[!c ? 'none' : c.linked ? 'linked' : 'own'] += 1;
    });
    return n;
};
// shown once anything of the entry can be heard
const audioTag = (e) => {
    const n = audioStats(e);
    if (!n.own && !n.linked) return null;
    return h('span', { class: 'tag-audio', title: `${n.own} me inçizim të vet, ${n.linked} nga pjesët (zëvendësoji me inçizim të vet), ${n.none} pa zë` },
        `🎙 ${n.own}`, n.linked ? ` · pjesët ${n.linked}` : '', n.none ? ` · pa ${n.none}` : '');
};

const progressTag = (e) => {
    if (e.type !== 'fjale' || e.sub !== 'folje') return null;
    const pr = progress(e);
    if (!pr) return null;
    return pr.done === pr.total ? h('span', { class: 'tag-done', title: 'Të gjitha kohët janë plotësuar' }, 'plotë')
        : h('span', { class: 'tag-count', title: 'Mungojnë: ' + pr.missing.join(', ') }, `${pr.done}/${pr.total}`);
};

const verbEditor = (e) => {
    e.words = e.words || [{}];
    const box = h('div');
    const redraw = () => box.replaceChildren(...e.words.map((w, wi) => section(
        [`folja ${e.words.length > 1 ? wi + 1 : ''}`, e.words.length > 1 ? removeBtn('Hiqe foljen', () => { e.words.splice(wi, 1); changed(); redraw(); }) : null],
        h('div', { class: 'inline' }, text(w, 'word', 'word'), text(w, 'std', 'std'),
            h('div', { class: 'row' }, h('label', {}, 'participle'), h('div', {}, formCell(w, 'participle', w))), reviewBox(w, 'participleReview')),
        recorder(w),
        h('p', { class: 'hint' }, 'Pjesorja: një për rresht nëse ka variacione. Përdoret për t’i mbushur kohët e përbëra.'),
        (w.conjugation = w.conjugation || []).map((z, zi) => {
            const rule = ruleFor(z, w);
            const d = rule ? deriveAny(rule, w, z) : null;
            return h('div', { class: 'sub-box' },
                h('div', { class: 'inline' },
                    comboSelect(w, z, redraw),
                    // the present is filled from its own "un" box, which may be typed after this was drawn: work the rule out on click
                    rule ? h('button', { class: 'btn small', type: 'button', disabled: !!d.missing && !selfStem(z), title: 'Mbush kutitë bosh sipas rregullit', onclick: () => { const r = ruleFor(z, w); if (r) fill(z, deriveAny(r, w, z)); changed(); redraw(); } }, 'Mbush') : null,
                    reviewBox(z, 'review'),
                    removeBtn('Hiqe këtë kohë', () => { w.conjugation.splice(zi, 1); changed(); redraw(); })),
                rule ? h('p', { class: 'hint' }, `Rregull: ${describe(rule, w, z)}.${d.missing ? ' Mungon: ' + d.missing + '.' : ''}${d.note ? ' ' + d.note + '.' : ''}`) : null,
                personGrid(z, redraw, personsOf(z.mood), w),
                lines(z, 'footnotes', 'shënime', 'Shënime vetëm për këtë kohë. Dalin nën tabelë.'));
        }),
        h('div', { class: 'adds sub-box' }, h('button', { class: 'btn small', type: 'button', disabled: !freeCombo(w), onclick: () => {
            const next = freeCombo(w);
            const z = { tense: next.tense, mood: next.mood };
            w.conjugation.push(z);
            autoFill(z, w);
            changed(); redraw();
        } }, '+ kohë')),
        h('p', { class: 'hint' }, 'Kohët që mungojnë këtu, faqja i merr vetë nga Gramatika nëse folja është atje (me të njëjtin word ose std).'),
    ), h('button', { class: 'btn small', type: 'button', onclick: () => { e.words.push({ conjugation: [] }); changed(); redraw(); } }, '+ folje tjetër në këtë kartë')));
    redraw();
    return box;
};

const adjEditor = (e) => {
    e.words = e.words || [{}];
    const box = h('div');
    const redraw = () => box.replaceChildren(...e.words.map((w, wi) => section(
        [`mbiemri ${e.words.length > 1 ? wi + 1 : ''}`, e.words.length > 1 ? removeBtn('Hiqe', () => { e.words.splice(wi, 1); changed(); redraw(); }) : null],
        h('div', { class: 'inline' }, text(w, 'word', 'word'), text(w, 'std', 'std')),
        recorder(w),
        adjGrid(w),
        (w.variants || []).map((v, vi) => h('div', { class: 'sub-box' },
            h('div', { class: 'inline' }, text(v, 'word', 'variant'), formMics(w, () => [v.word || '']),
                h('button', { class: 'x', type: 'button', title: 'Lart', disabled: vi === 0, onclick: () => { swap(w.variants, vi, vi - 1); changed(); redraw(); } }, '↑'),
                h('button', { class: 'x', type: 'button', title: 'Posht', disabled: vi === w.variants.length - 1, onclick: () => { swap(w.variants, vi, vi + 1); changed(); redraw(); } }, '↓'),
                removeBtn('Hiqe variantin', () => { w.variants.splice(vi, 1); set(w, 'variants', w.variants); redraw(); })),
            adjGrid(v, w))),
        h('button', { class: 'btn small', type: 'button', onclick: () => { w.variants = [...(w.variants || []), {}]; changed(); redraw(); } }, '+ variant'),
    ), h('button', { class: 'btn small', type: 'button', onclick: () => { e.words.push({}); changed(); redraw(); } }, '+ mbiemër tjetër në këtë kartë')));
    redraw();
    return box;
};

const fjaleEditor = (e) => {
    const words = STRUCT[e.sub] === 'words';
    return [
        section('fjala',
            choose(e, 'sub', 'sub', TAXONOMY.dictionaryCategories.map((x) => [x.id, x.label]), (v) => changeSub(e, v)),
            words ? null : text(e, 'word', 'word'),
            e.sub === 'emra' ? choose(e, 'gender', 'gender', [['', '—'], ['mashkullore', 'mashkullore'], ['femërore', 'femërore'], ['asnjanëse', 'asnjanëse']]) : null,
            e.sub === 'ndajfolje' ? text(e, 'pos', 'pos', 'p.sh. ndajfolje kohe') : null,
            words ? null : text(e, 'std', 'std'),
            words ? null : recorder(e),
            text(e, 'pronunciation', 'pronunciation')),
        e.sub === 'folje' ? verbEditor(e) : null,
        e.sub === 'mbiemra' ? adjEditor(e) : null,
        e.sub === 'emra' ? section('declension', nounGrid(e)) : null,
        section('tekst',
            lines(e, 'meaning', 'meaning'),
            lines(e, 'variants', 'variants', 'Fjalë variacion (lista nën “variacion”).', e),
            text(e, 'variantsNote', 'variantsNote'),
            lines(e, 'examples', 'examples'),
            lines(e, 'footnotes', 'footnotes'),
            lines(e, 'text', 'text')),
    ];
};

const gramEditor = (e) => {
    const pron = !!e.pronoun;
    const itemId = e.tense || e.pronoun || '';
    const setItem = (id) => {
        const v = e.mood || e.case;
        delete e.tense; delete e.pronoun; delete e.mood; delete e.case;
        if (PRONOUNS.includes(id)) { e.pronoun = id; if (v) e.case = v; } else { e.tense = id; if (v) e.mood = v; }
        changed(); draw();
    };
    const vKey = pron ? 'case' : 'mood';
    const tense = TAXONOMY.tenses.some((k) => k.id === e.tense);
    const box = h('div');
    // Tense entries hold no forms: those live in the Fjalor verbs.
    if (tense && !(e.words || []).length) {
        delete e.words;
        box.append(h('p', { class: 'hint' }, 'Format e kësaj kohe plotësohen te foljet në Fjalor; faqja tregon një folje të rastit.'));
        return gramParts(e, pron, itemId, setItem, vKey, box);
    }
    e.words = e.words || [];
    const redraw = () => box.replaceChildren(...e.words.map((w, wi) => section(
        [`fjala ${wi + 1}`, removeBtn('Hiqe', () => { e.words.splice(wi, 1); changed(); redraw(); })],
        h('div', { class: 'inline' }, text(w, 'word', 'word'), text(w, 'std', 'std'),
            h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!w.examples, onchange: (ev) => {
                if (ev.target.checked) w.examples = w.examples || []; else delete w.examples;
                changed(); redraw();
            } }), 'shembuj në vend të tabelës')),
        w.examples ? lines(w, 'examples', 'examples') : personGrid(w, redraw),
    ), h('button', { class: 'btn small', type: 'button', onclick: () => { e.words.push({}); changed(); redraw(); } }, '+ fjalë')));
    redraw();
    return gramParts(e, pron, itemId, setItem, vKey, box);
};
const gramParts = (e, pron, itemId, setItem, vKey, box) => {
    return [
        section('gramatika',
            h('div', { class: 'inline' },
                row(pron ? 'pronoun' : 'tense', h('select', { onchange: (ev) => setItem(ev.target.value) },
                    TAXONOMY.grammarMenu.map((g) => h('optgroup', { label: g.label }, g.items.filter((x) => !['pjesorja', 'percjellorja'].includes(x.id)).map((x) => h('option', { value: x.id, selected: x.id === itemId }, x.label)))))),
                choose(e, vKey, vKey, [['', '—'], ...TAXONOMY.variants.map((v) => [v, v])])),
            lines(e, 'intro', 'intro', 'Shpjegim mbi tabelë.')),
        box,
        section('tekst', lines(e, 'footnotes', 'footnotes'), lines(e, 'text', 'text')),
    ];
};

const BLOCKS = [
    ['paragraf', () => ''],
    ['listë', () => ({ list: [] })],
    ['kolona', () => ({ cols: [[], []] })],
    ['shënim', () => ({ note: '' })],
    ['nëntitull', () => ({ head: '', std: '' })],
];
const blockKind = (b) => (typeof b === 'string' ? 'paragraf' : b.cols ? 'kolona' : b.list ? 'listë' : 'note' in b ? 'shënim' : 'head' in b ? 'nëntitull' : 'label' in b ? 'etiketë' : b.table ? 'tabelë' : 'std' in b ? 'std' : 'tjetër');
const linesArea = (arr, onset) => h('textarea', { rows: 3, value: arr.join('\n'), oninput: (ev) => onset(ev.target.value.split('\n')) });

const blogEditor = (e) => {
    e.body = e.body || [];
    const box = h('div');
    const redraw = () => {
        const B = e.body;
        box.replaceChildren(...B.map((b, i) => {
            const kind = blockKind(b);
            const tools = h('div', { class: 'bh' }, kind, h('span', { class: 'grow' }),
                h('button', { class: 'x', type: 'button', title: 'Lart', disabled: i === 0, onclick: () => { [B[i - 1], B[i]] = [B[i], B[i - 1]]; changed(); redraw(); } }, '↑'),
                h('button', { class: 'x', type: 'button', title: 'Posht', disabled: i === B.length - 1, onclick: () => { [B[i + 1], B[i]] = [B[i], B[i + 1]]; changed(); redraw(); } }, '↓'),
                removeBtn('Hiqe', () => { B.splice(i, 1); changed(); redraw(); }));
            let ed;
            if (kind === 'paragraf') ed = h('textarea', { rows: 3, value: b, oninput: (ev) => { B[i] = ev.target.value; changed(); } });
            else if (kind === 'shënim') ed = h('textarea', { rows: 2, value: b.note, oninput: (ev) => { b.note = ev.target.value; changed(); } });
            else if (kind === 'listë') ed = h('div', {}, h('p', { class: 'hint' }, 'Një rresht për çdo element.'), linesArea(b.list, (v) => { b.list = v; changed(); }));
            else if (kind === 'kolona') ed = h('div', {}, h('p', { class: 'hint' }, 'Një rresht për çdo element, një kuti për çdo kolonë.'),
                h('div', { style: `display:grid;grid-template-columns:repeat(${b.cols.length},minmax(0,1fr)) auto;gap:6px;align-items:start` },
                    b.cols.map((c, ci) => h('div', {}, linesArea(c, (v) => { b.cols[ci] = v; changed(); }),
                        b.cols.length > 1 ? h('button', { class: 'btn small', type: 'button', onclick: () => { b.cols.splice(ci, 1); changed(); redraw(); } }, 'hiqe kolonën') : null)),
                    h('button', { class: 'btn small', type: 'button', onclick: () => { b.cols.push([]); changed(); redraw(); } }, '+ kolonë')));
            else if (kind === 'nëntitull') ed = h('div', { class: 'inline' }, text(b, 'head', 'head'), text(b, 'std', 'std'));
            else if (kind === 'etiketë') ed = text(b, 'label', 'label');
            else if (kind === 'std') ed = text(b, 'std', 'std');
            else ed = h('textarea', { rows: 6, value: JSON.stringify(b, null, 1), oninput: (ev) => {
                try { B[i] = JSON.parse(ev.target.value); ev.target.classList.remove('bad'); changed(); } catch (err) { ev.target.classList.add('bad'); }
            } });
            return h('div', { class: 'block' }, tools, ed);
        }), h('div', { class: 'adds' }, BLOCKS.map(([label, make]) => h('button', { class: 'btn small', type: 'button', onclick: () => { B.push(make()); changed(); redraw(); } }, '+ ' + label))));
    };
    redraw();
    return [
        section('postimi',
            h('div', { class: 'inline' }, choose(e, 'cat', 'cat', TAXONOMY.blog.map((x) => [x.id, x.label]))),
            text(e, 'title', 'title'), text(e, 'sub', 'sub', 'nëntitull'), text(e, 'std', 'std'),
            text(e, 'video', 'video', 'videos/emri, pa .mp4')),
        section('body', box),
    ];
};

// the headword at the top of the form, editable in place (word, or the first word, or the blog title)
const headOf = (e) => {
    if (e.type === 'blog') return { get: () => e.title || '', set: (v) => { e.title = v; } };
    if (e.type !== 'fjale') return null;
    if (STRUCT[e.sub] === 'words') {
        e.words = e.words && e.words.length ? e.words : [{}];
        return { get: () => e.words[0].word || '', set: (v) => { e.words[0].word = v; } };
    }
    return { get: () => e.word || '', set: (v) => { e.word = v; } };
};

// ---------- form, list ----------
const formEl = document.getElementById('form');
const draw = () => {
    const e = entries[cur];
    if (!e) { formEl.replaceChildren(h('p', { class: 'empty' }, 'Zgjidh një hyrje majtas, ose krijo një të re.')); return; }
    formEl.replaceChildren(
        headOf(e) ? h('input', { id: 'title', class: 'headword', type: 'text', value: headOf(e).get(), placeholder: 'fjala', 'aria-label': 'Fjala',
            oninput: (ev) => { headOf(e).set(ev.target.value); changed(); },
            onchange: () => { const y = formEl.scrollTop; draw(); formEl.scrollTop = y; } })
            : h('h2', { id: 'title' }, titleOf(e)),
        h('p', { class: 'hint' }, kindOf(e), e.sub === 'folje' ? progressTag(e) : null, audioTag(e)),
        h('div', { class: 'actions' },
            h('button', { class: 'btn small', type: 'button', onclick: duplicate }, 'Dupliko'),
            h('button', { class: 'btn small danger', type: 'button', onclick: remove }, 'Fshi')),
        metaFields(e),
        ...[e.type === 'fjale' ? fjaleEditor(e) : e.type === 'gramatike' ? gramEditor(e) : blogEditor(e)].flat(Infinity).filter(Boolean),
    );
};

const FILTERS = [['all', 'Të gjitha'], ['gramatike', 'Gramatikë'], ...TAXONOMY.dictionaryCategories.map((x) => [x.id, x.label]), ['blog', 'Blog'], ['draft', 'Fshehur'], ['review', 'Rishikim'], ['linked', 'Pjesët']];
const filtersEl = document.getElementById('filters');
const itemsEl = document.getElementById('items');
const qEl = document.getElementById('q');
const TYPE_RANK = { gramatike: 0, fjale: 1, blog: 2 };
const renderList = () => {
    filtersEl.replaceChildren(...FILTERS.map(([id, label]) => h('button', { type: 'button', 'aria-pressed': String(filter === id), onclick: () => { filter = id; renderList(); } }, label)));
    const q = norm(qEl.value.trim());
    const idx = entries.map((e, i) => i)
        .filter((i) => { const e = entries[i]; return filter === 'all' || (filter === 'draft' ? e.draft : filter === 'review' ? needsReview(e) : filter === 'linked' ? audioStats(e).linked > 0 : groupOf(e) === filter); })
        .filter((i) => !q || norm(JSON.stringify(entries[i])).includes(q))
        .sort((a, b) => TYPE_RANK[entries[a].type] - TYPE_RANK[entries[b].type] || (entries[b].date || '').localeCompare(entries[a].date || ''));
    itemsEl.replaceChildren(...idx.map((i) => {
        const e = entries[i];
        return h('button', { class: 'item', type: 'button', 'aria-current': String(i === cur), onclick: () => select(i) },
            h('b', {}, titleOf(e)), e.draft ? h('span', { class: 'tag-draft' }, 'fshehur') : null, needsReview(e) ? h('span', { class: 'tag-review' }, 'rishikim') : null, progressTag(e), audioTag(e),
            h('small', {}, `${kindOf(e)}, ${day(e.date)}`));
    }));
};
qEl.addEventListener('input', renderList);

const select = (i) => { cur = i; renderList(); draw(); preview(); formEl.scrollTop = 0; };

const TEMPLATES = {
    folje: () => ({ type: 'fjale', sub: 'folje', date: today(), words: [{ word: '', conjugation: [{ tense: 'tashmja', mood: 'dëftore' }] }] }),
    emra: () => ({ type: 'fjale', sub: 'emra', date: today(), word: '', gender: 'mashkullore' }),
    mbiemra: () => ({ type: 'fjale', sub: 'mbiemra', date: today(), words: [{ word: '' }] }),
    ndajfolje: () => ({ type: 'fjale', sub: 'ndajfolje', date: today(), word: '' }),
    gramatike: () => ({ type: 'gramatike', tense: 'tashmja', mood: 'dëftore', date: today() }),
    blog: () => ({ type: 'blog', cat: 'shprehje', date: today(), title: '', body: [''] }),
};
document.getElementById('new').addEventListener('change', (ev) => {
    const make = TEMPLATES[ev.target.value];
    ev.target.value = '';
    if (!make) return;
    entries.unshift(make());
    filter = 'all';
    changed();
    select(0);
    formEl.querySelector('input[type="text"]')?.focus();
});
function duplicate() {
    const copy = structuredClone(entries[cur]);
    delete copy.id;
    copy.date = today();
    entries.splice(cur, 0, copy);
    changed();
    select(cur);
}
function remove() {
    if (!confirm(`Të fshihet “${titleOf(entries[cur])}”?`)) return;
    entries.splice(cur, 1);
    cur = Math.min(cur, entries.length - 1);
    changed();
    draw();
}

// ---------- save ----------
const saveBtn = document.getElementById('save');
const save = async () => {
    if (!SERVED) return setStatus('Hape me: python3 serve.py', 'err');
    saveBtn.disabled = true;
    entries.forEach((e) => { if (e.sub === 'folje') (e.words || []).forEach(sortZ); });
    if (entries[cur] && entries[cur].sub === 'folje') { const y = formEl.scrollTop; draw(); formEl.scrollTop = y; }
    try {
        const r = await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Token': TOKEN },
            body: JSON.stringify(cleaned()),
        });
        const res = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(res.error || r.status);
        dirty = false;
        autoMarks = new WeakMap();
        formEl.querySelectorAll('textarea.auto').forEach((t) => t.classList.remove('auto'));
        setStatus(`Ruajtur, ${new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}`, 'ok');
    } catch (err) {
        setStatus('Nuk u ruajt: ' + err.message, 'err');
    } finally {
        saveBtn.disabled = false;
    }
};
saveBtn.addEventListener('click', save);
window.addEventListener('keydown', (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') { ev.preventDefault(); save(); }
});
window.addEventListener('beforeunload', (ev) => { if (dirty) { ev.preventDefault(); ev.returnValue = ''; } });

// ---------- theme ----------
const themeBtn = document.getElementById('theme');
const themeLabel = () => { themeBtn.textContent = document.documentElement.dataset.theme === 'light' ? '☾' : '☀'; };
themeLabel();
themeBtn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('shqipollog-theme', next); } catch (err) {}
    themeLabel();
    preview();
});

// ---------- ↑ ↓ move between boxes ----------
// In a table: the box above or below in the same column. Elsewhere: the previous or next text box.
// In a box with several lines, the arrows move inside it until the first or last line.
const FIELDS = 'input[type="text"], input:not([type]), textarea';
formEl.addEventListener('keydown', (ev) => {
    if ((ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') || ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
    const el = ev.target;
    if (!el.matches(FIELDS)) return;
    const up = ev.key === 'ArrowUp';
    if (el.tagName === 'TEXTAREA') {
        const before = el.value.slice(0, el.selectionStart);
        const after = el.value.slice(el.selectionEnd);
        if (up ? before.includes('\n') : after.includes('\n')) return;
    }
    let next = null;
    const td = el.closest('td');
    if (td && td.closest('.grid')) {
        const tr = td.parentElement;
        const col = [...tr.children].indexOf(td);
        let row = up ? tr.previousElementSibling : tr.nextElementSibling;
        while (row && !next) {
            next = row.children[col] && row.children[col].querySelector(FIELDS);
            row = up ? row.previousElementSibling : row.nextElementSibling;
        }
    } else {
        const all = [...formEl.querySelectorAll(FIELDS)].filter((x) => !x.closest('.grid') && x.offsetParent);
        next = all[all.indexOf(el) + (up ? -1 : 1)];
    }
    if (!next) return;
    ev.preventDefault();
    next.focus();
    const end = next.value.length;
    next.setSelectionRange(end, end);
});

// ---------- textareas grow with their text ----------
const grow = (t) => { t.style.height = 'auto'; t.style.height = t.scrollHeight + 2 + 'px'; };
document.addEventListener('input', (ev) => { if (ev.target.tagName === 'TEXTAREA') grow(ev.target); });
new MutationObserver(() => requestAnimationFrame(() => formEl.querySelectorAll('textarea').forEach(grow)))
    .observe(formEl, { childList: true, subtree: true });

// ---------- start ----------
if (!SERVED) {
    saveBtn.disabled = true;
    setStatus('Vetëm lokalisht: hape me python3 serve.py', 'err');
}
fetch('/entries.json', { cache: 'no-store' })
    .then((r) => r.json())
    .then((list) => { entries = list; setStatus(SERVED ? `${list.length} hyrje` : statusEl.textContent, SERVED ? '' : 'err'); renderList(); draw(); })
    .catch((err) => setStatus('Nuk u lexua entries.json: ' + err.message, 'err'));
