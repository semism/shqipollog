// Verb tenses: the koha/mood picker, and filling tenses from the rules in taxonomy.js (TAXONOMY.rules, TAXONOMY.stems).

import { TAXONOMY } from '/taxonomy.js';
import { SHARED } from '/shared.js';
import { asList, changed, el, entries, PERSONS, personsOf, PLABEL } from './core.js';
import { mark, row } from './fields.js';

// valid tense + mood pairs, from TAXONOMY.tenses / TAXONOMY.moods
const TENSE_LABEL = Object.fromEntries(TAXONOMY.tenses.map((k) => [k.id, k.label]));
const LINKS = TAXONOMY.sameForms || {};
// Pairs that share another pair's forms (sameForms) are edited once, under that other pair.
const COMBOS = SHARED.COMBOS.filter((c) => !LINKS[c.key]);
// the pairs that share this pair's forms, as "E ardhmja e së shkuarës, dëftore"
const linkedTo = (key) => Object.keys(LINKS).filter((pair) => LINKS[pair] === key).map((pair) => {
    const [tense, mood] = pair.split('|');
    return `${TENSE_LABEL[tense]}, ${mood}`;
});
const usedCombos = (w, except) => (w.conjugation || [])
    .filter((tenseMood) => tenseMood !== except)
    .map((tenseMood) => tenseMood.tense + '|' + tenseMood.mood);
const comboRank = (tenseMood) => {
    const i = COMBOS.findIndex((c) => c.tense === tenseMood.tense && c.mood === tenseMood.mood);
    return i < 0 ? COMBOS.length : i;
};
export const sortConjugation = (w) => { if (w.conjugation) w.conjugation.sort((a, b) => comboRank(a) - comboRank(b)); };
const { helperOnly, unusedFor: blocked } = SHARED;
export const freeCombo = (w) => COMBOS.find((c) => !blocked(w, c.key) && !usedCombos(w).includes(c.key));
export const comboSelect = (w, tenseMood, redraw) => {
    const curKey = tenseMood.tense + '|' + tenseMood.mood;
    const taken = usedCombos(w, tenseMood);
    // "E kryera, dëftore = …" plus why it can't be picked: unused, only for the helper verb, or already in this verb
    const optionText = (tense, c) => {
        const same = linkedTo(c.key).map((l) => ' = ' + l).join('');
        let note = '';
        if ((TAXONOMY.unused || []).includes(c.key)) note = helperOnly(w, c.key) ? ' (vetëm për ndihmësen)' : ' (nuk përdoret)';
        const have = taken.includes(c.key) ? ' (e ke)' : '';
        return `${tense.label}, ${c.mood}${same}${note}${have}`;
    };
    const option = (tense) => (c) => {
        const disabled = taken.includes(c.key) || (blocked(w, c.key) && c.key !== curKey);
        return el('option', { value: c.key, selected: c.key === curKey, disabled }, optionText(tense, c));
    };
    const groups = TAXONOMY.tenses
        .filter((tense) => COMBOS.some((c) => c.tense === tense.id))
        .map((tense) => el('optgroup', { label: tense.label }, COMBOS.filter((c) => c.tense === tense.id).map(option(tense))));
    let unknown = null;
    if (!COMBOS.some((c) => c.key === curKey)) {
        const label = `${TENSE_LABEL[tenseMood.tense] || tenseMood.tense || '?'} ${tenseMood.mood || '?'} (jo e vlefshme)`;
        unknown = el('option', { value: curKey, selected: true }, label);
    }
    const columns = [tenseMood, ...(tenseMood.variants || [])];
    const picked = (ev) => {
        const [tense, mood] = ev.target.value.split('|');
        const keep = personsOf(mood);
        // a mood with fewer persons (urdhërore) would drop forms: ask first
        const lost = columns.some((o) => PERSONS.some((p) => !keep.includes(p) && o[p]));
        const question = `${mood} ka vetëm: ${keep.map((p) => PLABEL[p]).join(', ')}. Format e tjera fshihen. Vazhdo?`;
        if (lost && !confirm(question)) {
            ev.target.value = curKey;
            return;
        }
        columns.forEach((o) => PERSONS.forEach((p) => { if (!keep.includes(p)) delete o[p]; }));
        tenseMood.tense = tense;
        tenseMood.mood = mood;
        autoFill(tenseMood, w);
        changed();
        redraw();
    };
    return row('conjugation', el('select', { onchange: picked }, unknown, groups));
};

// ---------- compound tenses: rules from TAXONOMY.rules ----------
const RULES = TAXONOMY.rules || [];
const isEmpty = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);
// Simple tenses from the present first person (TAXONOMY.stems). The present itself is filled from its own "un" box.
const STEMS = TAXONOMY.stems || [];
const firstPerson = (w, tenseMood) => {
    const src = isPresentIndicative(tenseMood) ? tenseMood : tenseOf(w, ['tashmja', 'dëftore']);
    const un = src && asList(src.un)[0];
    return un ? String(un).split(/\s*\/\s*/)[0].trim() : '';
};
const stemRuleFor = (tenseMood, w) => {
    const all = STEMS.filter((s) => s.tense === tenseMood.tense && s.mood === tenseMood.mood);
    if (!all.length) return null;
    const un = firstPerson(w, tenseMood);
    return all.find((s) => un && new RegExp(`(${s.match})$`).test(un)) || { ...all[0], stem: true, unmatched: true };
};
const deriveStem = (s, w, tenseMood) => {
    const un = firstPerson(w, tenseMood);
    if (!un) return { missing: isPresentIndicative(tenseMood) ? 'forma e vetës “un”' : 'vetja “un” e së tashmes (dëftore)' };
    if (s.unmatched) return { missing: `një rregull për foljet si “${un}”` };
    const stem = s.cut ? un.slice(0, -s.cut) : un;
    // stem + each person's ending, for the persons this mood has
    const build = (endings) => Object.fromEntries(Object.entries(endings)
        .filter(([p]) => personsOf(tenseMood.mood).includes(p))
        .map(([p, end]) => [p, stem + end]));
    return { main: build(s.forms), variants: (s.variants || []).map(build) };
};
const stemText = (s, w, tenseMood) => {
    const un = firstPerson(w, tenseMood) || '…';
    const stem = s.cut ? un.slice(0, -s.cut) : un;
    return `nga “${un}”: ${Object.values(s.forms).map((end) => stem + end).join(', ')}`;
};
// a tense's rule: compound (TAXONOMY.rules) or simple (TAXONOMY.stems); derive/describe either kind
export const ruleFor = (tenseMood, w) => {
    const compound = RULES.find((r) => r.tense === tenseMood.tense && r.mood === tenseMood.mood);
    return compound || (w ? stemRuleFor(tenseMood, w) : null);
};
const { sourcesOf, sourceText, ruleText } = SHARED;
const verbWords = () => entries.filter((e) => e.type === 'fjale' && e.sub === 'folje').flatMap((e) => e.words || []);
export const helper = () => {
    const verbs = verbWords();
    return verbs.find((w) => w.std === TAXONOMY.auxiliary) || verbs.find((w) => w.word === TAXONOMY.auxiliary);
};
// forms of a verb for one tense (from its own conjugation; Gramatikë entries hold no forms)
const tenseOf = (w, [tense, mood]) => {
    const found = (w.conjugation || []).find((tenseMood) => {
        return tenseMood.tense === tense && tenseMood.mood === mood && PERSONS.some((p) => !isEmpty(tenseMood[p]));
    });
    return found || null;
};
// columns in full: variant 0, then each variant with its blanks taken from variant 0
const fullCols = (t) => [t, ...(t.variants || [])].map((o) => Object.fromEntries(PERSONS
    .map((p) => [p, isEmpty(o[p]) ? t[p] : o[p]])
    .filter(([, v]) => !isEmpty(v))));
const derive = (r, w) => {
    // the first source the rule names that has forms: the helper verb's tense, or one of this verb's own
    let t = null, used = null;
    for (const s of sourcesOf(r)) {
        const v = s.aux ? helper() : w;
        if (!v) return { missing: `folja ndihmëse (std: ${TAXONOMY.auxiliary})` };
        t = (s.aux && (TAXONOMY.auxiliaryForms || {})[s.aux.join('|')]) || tenseOf(v, s.aux || s.self);
        if (t) {
            used = s;
            break;
        }
    }
    if (!t) return { missing: sourcesOf(r).map(sourceText).join(', ose ') };
    const strip = (x) => (used.strip && x.startsWith(used.strip) ? x.slice(used.strip.length) : x);
    const participles = r.participle ? asList(w.participle) : [''];
    if (!participles.length) return { missing: 'pjesorja e kësaj foljeje' };
    // one source form → this tense's form: the particle in front (its own t’ dropped), the participle after.
    // "a / b" in a box is two forms; each gets the rule.
    const applyRule = (f, pj) => f.split(/\s+\/\s+/).map(strip).map((x) => {
        const withParticle = r.pre ? r.pre + x.replace(/^t[’']\s*/, '') : x;
        return withParticle + (pj ? ' ' + pj : '');
    }).join(' / ');
    const build = (col, pj) => Object.fromEntries(Object.entries(col).map(([p, v]) => {
        return [p, Array.isArray(v) ? v.map((f) => applyRule(f, pj)) : applyRule(v, pj)];
    }));
    // column 0 with the first participle; then column 0 with each other participle; then each source variant
    const cols = fullCols(t);
    const out = [
        build(cols[0], participles[0]),
        ...participles.slice(1).map((pj) => build(cols[0], pj)),
        ...cols.slice(1).map((c) => build(c, participles[0])),
    ];
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
export const fill = (tenseMood, d) => {
    if (!d || d.missing) return;
    PERSONS.forEach((p) => {
        if (!isEmpty(tenseMood[p]) || isEmpty(d.main[p])) return;
        tenseMood[p] = d.main[p];
        mark(tenseMood, p);
    });
    if (!(tenseMood.variants || []).length && d.variants.length) {
        tenseMood.variants = structuredClone(d.variants);
        tenseMood.variants.forEach((v) => Object.keys(v).forEach((p) => mark(v, p)));
    }
};
export const isPresentIndicative = (tenseMood) => tenseMood.tense === 'tashmja' && tenseMood.mood === 'dëftore';
export const deriveAny = (r, w, tenseMood) => (r.forms ? deriveStem(r, w, tenseMood) : derive(r, w));
export const describe = (r, w, tenseMood) => {
    if (!r.forms) return ruleText(r);
    return r.unmatched ? 'sipas mbaresës së “un”' : stemText(r, w, tenseMood);
};
// a tense that was just added (nothing typed in it yet) is filled from its rule right away
export const autoFill = (tenseMood, w) => {
    const r = ruleFor(tenseMood, w);
    const untouched = PERSONS.every((p) => isEmpty(tenseMood[p])) && !(tenseMood.variants || []).length;
    if (r && untouched) fill(tenseMood, deriveAny(r, w, tenseMood));
};

// how many of a verb's tenses are filled for every person (own table, linked pair, or Gramatikë)
export const progress = (e) => {
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
