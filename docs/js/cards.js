// The cards: a Fjalor word (with its verb, noun or adjective table), a Gramatikë entry, a blog post.

import { TAXONOMY } from '../taxonomy.js';
import { SHARED } from '../shared.js';
import { LABEL } from './labels.js';
import { asList, CASES, comboKey, COMBOS, day, wordTitle } from './data.js';
import { esc, fmt, stdLine } from './format.js';
import { blocks, cell, listHtml, MISS, playSm, verbClips, wrapTable } from './tables.js';
import { verbTable } from './tense-pages.js';

const meta = (label, e, cls) => {
    const when = `${day(e.date)}${e.place ? ', ' + esc(e.place) : ''}`;
    return `<div class="head"><span class="tag ${cls}">${label}</span><span class="meta">${when}</span></div>`;
};
// A quiet "shpërndaj" link at the bottom of a card: the phone's share sheet where there is one, otherwise copy the link.
export const shareBtn = (hash, title) => {
    const save = `<button type="button" class="share" data-save="${esc(hash)}">ruaj</button>`;
    const share = `<button type="button" class="share" data-share="${esc(hash)}" data-title="${esc(title || 'Shqipollog')}">shpërndaj</button>`;
    return `<p class="share-row">${save}${share}</p>`;
};
export const caption = (t) => (t && t.length ? `<div class="caption">${t.map((x) => `<p>${fmt(x)}</p>`).join('')}</div>` : '');

// A verb's forms for one tense + mood (or for the pair it shares its forms with, TAXONOMY.sameForms)
export const formsFor = (w, asked) => {
    const link = TAXONOMY.sameForms[comboKey(asked)];
    const c = link ? { tense: link.split('|')[0], mood: link.split('|')[1] } : asked;
    return (w.conjugation || []).find((tenseMood) => tenseMood.tense === c.tense && tenseMood.mood === c.mood) || null;
};
export const tenseChoice = {};
// Forms filled in without a speaker's check yet carry review: true (see the README); say so under the table.
export const reviewNote = (ws, c) => (ws.some((w) => (formsFor(w, c) || {}).review) ? '<p class="miss-key">pa rishikuar</p>' : '');
// Not used for these verbs: true only if it is unused for every one of them (checked per verb, see shared.js).
const unused = (c, words) => (words.length ? words : [null]).every((w) => SHARED.unusedFor(w, comboKey(c)));

// How a tense is built (shared.js), or which pair it shares its forms with.
export const missMsg = (c, words = []) => `<p class="miss-all">${c && unused(c, words) ? 'Nuk përdoret.' : 'Ende mungojn.'}</p>`;
// A row of chips. items: { label, attrs (data-* string), pressed, empty }; big = the page-level mood/case row.
export const chipRow = (items, { big = false, label = '' } = {}) => {
    const chip = (x) => `<button type="button" ${x.attrs} aria-pressed="${!!x.pressed}"${x.empty ? ' class="empty"' : ''}>${esc(x.label)}</button>`;
    const aria = label ? ` aria-label="${esc(label)}"` : '';
    return `<div class="chips${big ? ' big' : ''}" role="group"${aria}>${items.map(chip).join('')}</div>`;
};
export const ruleLine = (tense, mood) => {
    const rule = SHARED.ruleOf(tense, mood);
    return SHARED.linkText(tense, mood) || (rule ? 'formimi: ' + SHARED.ruleText(rule) : '');
};

const verbSection = (e) => {
    const has = (c) => e.words.some((w) => formsFor(w, c));
    const current = COMBOS.find((c) => comboKey(c) === tenseChoice[e.id]) || COMBOS.find(has) || COMBOS[0];
    const tenses = [...new Set(COMBOS.map((c) => c.tense))];
    const INDEFINITE = Object.fromEntries(TAXONOMY.tenses.map((k) => [k.id, k.indefinite]));
    // "— nuk përdoret" after a tense none of whose moods this verb has or uses
    const tagOf = (tense) => {
        const moods = COMBOS.filter((c) => c.tense === tense);
        return !moods.some(has) && moods.every((c) => unused(c, e.words)) ? ' — nuk përdoret' : '';
    };
    const option = (k) => {
        const selected = k === current.tense ? ' selected' : '';
        return `<option value="${esc(k)}"${selected}>${esc(INDEFINITE[k] || LABEL[k] || k)}${tagOf(k)}</option>`;
    };
    const opts = tenses.map(option).join('');
    const moods = COMBOS.filter((c) => c.tense === current.tense);
    const moodChip = (c) => ({
        label: c.mood, attrs: `data-zgm="${e.id}" data-combo="${esc(comboKey(c))}"`, pressed: c === current, empty: !has(c),
    });
    const chips = moods.length > 1 ? chipRow(moods.map(moodChip), { label: 'Mënyra' }) : `<span>${esc(current.mood)}</span>`;
    const body = has(current)
        ? verbTable(e.words, current, e.words.length > 1) + reviewNote(e.words, current)
        : missMsg(current, e.words);
    const notes = e.words.flatMap((w) => (formsFor(w, current) || {}).footnotes || []);
    const hasParticiple = e.words.some((w) => asList(w.participle).length);
    let pjLine = '';
    if (hasParticiple) {
        const withPlay = (w) => asList(w.participle).map((p) => fmt(p) + playSm(verbClips(w), p));
        const participles = e.words.flatMap(withPlay).join(' / ');
        const review = e.words.some((w) => w.participleReview) ? ' (pa rishikuar)' : '';
        pjLine = `<p class="std">pjesore: ${participles}${review}</p>`;
    }
    const select = `<select data-zg="${e.id}" data-cur="${esc(comboKey(current))}">${opts}</select>`;
    const notesHtml = notes.map((n) => `<p class="note">${fmt(n)}</p>`).join('');
    const picker = `<div class="zg"><label class="zg"><span>Koha</span>${select}</label>${chips}</div>`;
    return `${pjLine}<div class="sect">${picker}${body}${notesHtml}</div>`;
};

const nounSection = (e) => {
    // typed boxes, else forms derived on the fly (SHARED.nounDerived); nothing derived is stored
    const der = SHARED.nounDerived(e);
    const cols = SHARED.NOUN_COLS;
    const val = (n, d, k) => (SHARED.nounCell(e, der, n, d, k) || {}).v || MISS;
    const hasAny = cols.some(([n, d]) => CASES.some(([k]) => SHARED.nounCell(e, der, n, d, k)));
    if (!hasAny) return `<div class="sect"><p class="sect-label">Lakimi</p>${missMsg()}</div>`;
    const subHead = ([, d], i) => `<th class="sub${i === 2 ? ' gs' : ''}">${d === 'shquar' ? 'e shquar' : 'e pashquar'}</th>`;
    const head = '<thead><tr><th></th><th colspan="2">njëjës</th><th colspan="2" class="gs">shumës</th></tr>'
        + `<tr><th></th>${cols.map(subHead).join('')}</tr></thead>`;
    const row = ([k, label]) => {
        const td = ([n, d], i) => `<td${i === 2 ? ' class="gs"' : ''}>${cell(val(n, d, k), e.audios)}</td>`;
        const cells = cols.map(td).join('');
        return `<tr><th class="p" scope="row">${label}</th>${cells}</tr>`;
    };
    const tableHtml = `<table class="conj">${head}<tbody>${CASES.map(row).join('')}</tbody></table>`;
    return `<div class="sect"><p class="sect-label">Lakimi</p>${wrapTable(tableHtml)}</div>`;
};

const adjSection = (e) => {
    const cols = [];
    (e.words || []).forEach((w) => {
        const head = SHARED.adjHead(w);
        cols.push({ head: fmt(head || '') + playSm(w.audios, head), w, owner: w, au: w.audios, first: true });
        (w.variants || []).forEach((v) => {
            const variantHead = SHARED.adjHead(v, w);
            const headHtml = `<span class="var">variant</span> ${fmt(variantHead || '')}${playSm(w.audios, variantHead)}`;
            cols.push({ head: headHtml, w: v, owner: w, au: w.audios, first: true });
        });
    });
    const sep = (i) => (i ? ' class="gs"' : '');
    const wordHead = (c, i) => `<th colspan="2"${sep(i)}>${c.head}</th>`;
    const numberHead = (c, i) => `<th class="sub${i ? ' gs' : ''}">njëjës</th><th class="sub">shumës</th>`;
    const head = `<thead><tr><th></th>${cols.map(wordHead).join('')}</tr><tr><th></th>${cols.map(numberHead).join('')}</tr></thead>`;
    const row = ([g, label]) => {
        const cells = cols.map((c, i) => {
            const singular = cell(SHARED.adjForm(c.w, 'njejes', g, c.owner) || MISS, c.au);
            const plural = cell(SHARED.adjForm(c.w, 'shumes', g, c.owner) || MISS, c.au);
            return `<td${sep(i)}>${singular}</td><td>${plural}</td>`;
        }).join('');
        return `<tr><th class="p" scope="row">${label}</th>${cells}</tr>`;
    };
    const rows = [['m', 'mashkullore'], ['f', 'femërore']].map(row).join('');
    return `<div class="sect">${wrapTable(`<table class="conj">${head}<tbody>${rows}</tbody></table>`)}</div>`;
};

// the small line under a headword: "folje", "emër, gjinia femërore", "ndajfolje kohe"…
const posOf = (e) => {
    if (e.pos) return e.pos;
    if (e.sub === 'ndajfolje' && e.adverbKinds && e.adverbKinds.length) return 'ndajfolje ' + SHARED.adverbKindsText(e);
    const noun = `emër${e.gender ? ', gjinia ' + e.gender : ''}`;
    return { folje: 'folje', emra: noun, mbiemra: 'mbiemër', ndajfolje: 'ndajfolje' }[e.sub];
};
const defOf = (e) => e.def || (((e.declension || {}).njejes || {}).shquar || {}).emerore;
const multiStd = (e) => {
    if (!e.words || e.words.length !== 1) return null;
    return e.sub === 'mbiemra' ? SHARED.adjStd(e.words[0]) : e.words[0].std;
};

// ▶ for each recording: the entry's own (emra, ndajfolje) or each word's (folje, mbiemra)
const playBtn = (x) => {
    const label = `Dëgjo${x.word ? ': ' + esc(x.word) : ''}`;
    return `<button type="button" class="play" data-audio="${esc(x.audio)}" aria-label="${label}" title="${label}">▶</button>`;
};
const playBtns = (e) => [e, ...(e.words || [])].filter((x) => x.audio).map(playBtn).join('');
const paragraphs = (list) => list.map((t) => `<p>${fmt(t)}</p>`).join('');
const variantsSection = (e) => {
    const note = e.variantsNote ? ` <span class="sect-note">${fmt(e.variantsNote)}</span>` : '';
    return `<div class="sect"><p class="sect-label">variacion${note}</p>${listHtml(e.variants, e.audios)}</div>`;
};
const formsSection = (e) => {
    if (e.sub === 'folje') return verbSection(e);
    if (e.sub === 'emra') return nounSection(e);
    if (e.sub === 'mbiemra') return adjSection(e);
    return '';
};
const etymologySection = (e) => {
    const text = `<div class="forms">${paragraphs(e.etymology)}</div>`;
    return `<div class="sect"><p class="sect-label">etimologjia</p>${text}</div>`;
};
const headword = (e) => {
    const def = defOf(e) ? `<span class="def">${fmt(defOf(e))}</span>` : '';
    return `<h3><a href="#${e.id}">${fmt(wordTitle(e))}</a>${def}${playBtns(e)}</h3>`;
};
export const wordCard = (e) => `
    <article class="entry" id="${e.id}">
        ${meta(LABEL[e.sub] || 'Fjalë', e, 'fjala')}
        ${headword(e)}
        ${posOf(e) ? `<p class="pos">${fmt(posOf(e))}</p>` : ''}
        ${stdLine(e.std || multiStd(e))}
        ${e.pronunciation ? `<p class="std">shqiptime kryesore: ${fmt(e.pronunciation)}</p>` : ''}
        ${e.meaning ? `<div class="forms">${paragraphs(e.meaning)}</div>` : ''}
        ${e.variants ? variantsSection(e) : ''}
        ${formsSection(e)}
        ${e.examples ? `<ul class="examples">${e.examples.map((t) => `<li>${fmt(t)}</li>`).join('')}</ul>` : ''}
        ${e.etymology ? etymologySection(e) : ''}
        ${(e.footnotes || []).map((n) => `<p class="note">${fmt(n)}</p>`).join('')}
        ${caption(e.text)}
        ${shareBtn(e.id, wordTitle(e))}
    </article>`;

const gramTitle = (e) => `<h3><a href="#${e.id}">${fmt(LABEL[e.item])}</a>${e.v ? `<span class="def">${fmt(e.v)}</span>` : ''}</h3>`;
export const gramCard = (e, withTitle) => `
    <article class="entry" id="${e.id}">
        ${withTitle ? gramTitle(e) : ''}
        ${stdLine(e.std)}
        ${blocks(e.forms)}
        ${caption(e.text)}
        ${shareBtn(e.id, `${LABEL[e.item]}${e.v ? ', ' + e.v : ''}`)}
    </article>`;

const videoClip = (e) => `<video class="clip" controls preload="none" playsinline poster="${e.video}.jpg" src="${e.video}.mp4"></video>`;
export const blogPost = (e) => `
    <article class="post" id="${e.id}">
        ${meta(LABEL[e.cat], e, e.cat)}
        <h2><a href="#${e.id}">${fmt(e.title)}</a></h2>
        ${e.sub ? `<p class="sub">${fmt(e.sub)}</p>` : ''}
        ${stdLine(e.std)}
        ${e.video ? videoClip(e) : ''}
        ${blocks(e.body, 'body')}
        ${shareBtn(e.id, e.title)}
    </article>`;
