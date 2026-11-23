# About

shqipollog is a language preservation project trying to preserve and document a
certain Albanian dialect and its variations. The site is https://shqipollog.com/.

## Disclaimer
We are not trying to create a standard to compete with standard Albanian.
We try to be accurate, but we do not guarantee accuracy.
The written form of the dialect came about and evolved naturally as SMS and the internet became popular among its speakers. We try to stay as true to it as we can without sacrificing legibility.
Nonetheless, the spelling we land on will be affected by opinion.

## Conventions and guidelines for linguistic contributors (subject to change)
- **Region.** For now, the project covers the Tetovo area. Rule of thumb: a word or phrase belongs here if it comes from a place that has TE car license plates.

- **Final ë.** In standard Albanian, whether a word ends in ë does not depend on how it is pronounced today.
  The rules are mostly about stress: final ë is written when the stress falls on the second-to-last syllable, plus a fixed list of exceptions
  (e.g. **kalë**, **djalë**, **lumë**, **ujë** are masculine and keep the ë, while **bar** does not). They follow Tosk pronunciation, where these ë's are still heard;
  in Tetovo they are not.
  - Source: *Drejtshkrimi i gjuhës shqipe* (1973; Instituti Albanologjik i Prishtinës reprint, 1974), section "ë-ja fundore", §8–9.
    A copy is in [`resources/drejtshkrimi-i-gjuhes-shqipe-1973.pdf`](resources/drejtshkrimi-i-gjuhes-shqipe-1973.pdf).
- **For simplicity, this project drops the final ë from all nouns:** kal, djal, lum, uj, bar.
  Verbs and participles drop it too, unless dropping it would make the form look the same as another form that is pronounced differently:
  *ai din* / *ato dinë* keep apart, but *ardh* (pjesore) has no such twin, so it is written without ë.
- **Vowel length is not marked in the spelling** (kal and djal are written alike, although the a in kal is long).
  Where it matters, note it in the entry's pronunciation field.
- For anything else, just ask.

## Somewhat regular shifts and differences from standard

### Verbs

Compound tenses are built the same way as in the standard. The difference is in the pieces they are built from.

- **Particles:** *do të* → **dë**, *të* → **t’**. When *dë* goes in front of a lidhore form, its *t’* is dropped: *dë shkoj*, not *dë të shkoj*.
- **The helper verb kam:** *kom, ke, ka, kina/kimi, kini, kan/kajn/kën* (std: *kam, ke, ka, kemi, keni, kanë*).
- **Participles (pjesore)** are short, with no *-ur*/*-uar*: *ardh* (std: *ardhur*).

| Tense (mood) | Dialect | Standard |
|---|---|---|
| e kryer (dëftore) | kom ardh | kam ardhur |
| më se e kryer (dëftore) | kisha ardh | kisha ardhur |
| e kryer e tejshkuar (dëftore) | pata ardh | pata ardhur |
| e ardhme (dëftore) | dë shkoj | do të shkoj |
| e ardhme e përparme (dëftore) | dë kem ardh | do të kem ardhur |
| e tashme (lidhore) | t’shkoj | të shkoj |
| e pakryer (lidhore) | t’shkojsha | të shkoja |
| e kryer (lidhore) | t’kem ardh | të kem ardhur |
| më se e kryer (lidhore) | t’kisha ardh | të kisha ardhur |
| e tashme (kushtore) | dë shkojsha | do të shkoja |
| e kryer (kushtore) | dë kisha ardh | do të kisha ardhur |
| e kryer (habitore) | paskam ardh | paskam ardhur |
| më se e kryer (habitore) | pasksha ardh | paskësha ardhur |

As in the standard, *e ardhme e së shkuarës* has the same forms as *kushtore e tashme*, and *e ardhme e përparme e së shkuarës* the same as *kushtore e kryer*.

Simple tenses, for regular verbs:

- **-oj, present:** *shkoj, shkojsh/shkon, shkon, shkojm, shkojni, shkojn* (std: *shkoj, shkon, shkon, shkojmë, shkoni, shkojnë*).
- **-oj/-uj, imperfect:** **-jsh-** where the standard has *-j-*/*-n-*: *shkojsha, shkojshe, shkonte, shkojshim, shkojshi, shkojshin* (std: *shkoja, shkoje, shkonte, shkonim, shkonit, shkonin*).
- **Habitore e tashme** is built from the present stem, not the participle: *shkojkam* (std: *shkuakam*).
- **Not used in the dialect:** *habitore e pakryer* (except kam's *pasksha*, needed for *pasksha ardh*) and *dëshirore e kryer*.

These rules live in `docs/taxonomy.js` (`rules`, `stems`, `auxiliaryForms`, `sameForms`, `unused`); the admin uses them to fill in tables.

# Entry format

## Layout

- `docs/` is the site, and the only folder GitHub Pages publishes.
  - `docs/entries.json`: all entries, one object per entry. Order doesn't matter; the page sorts.
  - `docs/taxonomy.js`: the tabs' structure (tenses, categories, person labels, order of moods/cases).
  - `docs/index.html`, `docs/site.css`, `docs/site.js`: render them.
  - `docs/shared.js`: logic the site and the admin both use (search matching, "nuk përdoret", the rule text).
- `docs/audio/`: recordings made in the admin (see Editing). `docs/vendor/`: html2canvas, for the "ruaj" (save as PNG) button.
- `admin/` (`index.html`, `admin.css`, `admin.js`) and `serve.py`: the editor. Not published.
- `resources/`: reference material (the standard spelling rules). Not published.

## Editing

    python3 serve.py

then open http://127.0.0.1:8792/admin/. Pick an entry, edit, Ruaj (or Ctrl+S). The right side shows the card as it will look on the site.
Each save keeps the previous file as `entries.bak.json` next to `serve.py`. Ctrl+C stops it.
The site itself is also at http://127.0.0.1:8792/ while it runs.

`draft: true` (the "fshehur" box) keeps an entry off the site. It is still in `entries.json`, so anyone reading the file can see it.

The examples below are written the short way; in `entries.json` keys and strings are in double quotes.

Text anywhere can use `{a}` to highlight letters (red) and `**word**` for bold.

## Recordings

Every word and every form can have a recording; all of it is optional. The site shows ▶ wherever there is something to hear.

**Recording (admin, needs `serve.py` running):**

- **● inçizo** next to a word records the headword. **■ ndalo** stops; the clip is saved right away and shows as ▶ (with its length) and ✕.
- The small **●** under every form box records that one form: table cells (every tense, every variant column), pjesore,
  noun declension cells, variant words. A box with several forms (one per line) gets one ● per form.
- A verb's headword *is* its e tashme (dëftore) "un", so those two share one recording: recording either one sets both.
- The browser asks for the microphone the first time (works because the admin runs on 127.0.0.1).
- Recordings are linked to the entry only when you **save** (Ruaj). Restarting `serve.py` changes the admin's token, so an admin tab
  that was already open can no longer save: save before restarting, and reload the admin afterwards.

**What happens to a clip (`serve.py`):** it goes to `docs/audio/<form>-<id>.mp3`, run through `ffmpeg`: silence below −45 dB cut
from both ends, loudness evened out (`loudnorm`), mono 64 kbps MP3, so every browser and every iPhone can play it (about 5–10 KB
per word). The settings are `TRIM` at the top of `serve.py`. Without `ffmpeg` the browser's own format is kept (Opus/WebM, which
older iPhones can't play).

**In the data:**

| Field | On | Holds |
|---|---|---|
| `audio` | the entry (emra, ndajfolje) or each word in `words` (folje, mbiemra) | the headword's clip |
| `audios` | same place | `{ "form": "audio/….mp3" }`: one clip per form, keyed by the form's exact spelling, so one form in several tenses shares one clip. Change a form's spelling and its clip no longer matches; record it again. |

**The linker (pieces):** a form with no recording of its own can still be heard if it is made of recorded pieces: *kom ardh* plays
*kom* then *ardh*, *dë kisha ardh* plays *dë kisha* then *ardh* (longest recorded piece first). Pieces are looked up in the word's own
recordings, then (verbs only) in the helper verb's (kom), so kom's forms, recorded once, serve every verb's compound tenses.
`'` and `’` count as the same. Joined pieces don't sound as natural as one take, so they are a stand-in: a recording of the whole form
always wins, and removing it (✕) brings the pieces back. The logic is `SHARED.clipChain` in `docs/shared.js`, used by site and admin alike.
In the admin such a form shows *▶ pjesët* next to its ●.

**Keeping track:** the admin list and each entry's header show **🎙 own · pjesët built from pieces · pa nothing yet**, counting each
distinct form once. The **Pjesët** filter lists the entries that still have forms built from pieces, i.e. still to record properly.

**Cleanup:** a save deletes only the clips it stops using (re-recorded or removed), comparing the previous `entries.json` with the new
one. A clip that was recorded but never saved is never deleted; clear those out of `docs/audio/` by hand if you want.

**Publishing:** no server needed. Commit `docs/audio/` together with `entries.json` and push; GitHub Pages serves the files like the
videos (the site can grow to 1 GB, i.e. well over 100,000 clips). Git keeps every replaced take in its history; to drop it, wipe the
history now and then:

    git checkout --orphan fresh && git add -A && git commit -m "snapshot"
    git branch -D main && git branch -m main && git push --force origin main

(That resets the history of everything, not just audio; other clones have to be cloned again.)
Don't use Git LFS for the audio: GitHub Pages would serve LFS's pointer files instead of the sound.

**On the site:** ▶ next to the headword, a smaller ▶ after each form that can be heard (tooltip "nga pjesët" when built from pieces).
Pressing a playing ▶ again stops it. The ▶ buttons are left out of the PNG the "ruaj" button saves.

---

## Fjalor: `type: 'fjale'`

Every Fjalor entry has `type: 'fjale'`, a `sub` (folje | emra | mbiemra | ndajfolje), a `date`, and optionally `place`.
Shared optional fields, shown in this order on the card:

| Field | Shows |
|---|---|
| `std: 'borë'` | standard form, omit if identical |
| `pronunciation: 'shæj/shaj/shoj'` | "shqiptime kryesore: …" |
| `audio: 'audio/vdore-1a2b3c.mp3'` | ▶ next to the headword (folje, mbiemra: on each word in `words` instead) |
| `audios: { 'vdora': 'audio/vdora-1a2b.mp3' }` | ▶ next to that form wherever it shows (tables, variants, pjesore); keyed by the form's exact spelling, so the same form in several tenses shares one clip (folje, mbiemra: on each word) |
| `meaning: ['…']` | explanation paragraphs |
| `variants: ['shtahi']` | variant words |
| `variantsNote: '…'` | short note next to the "variacion" label |
| *(the forms table, per type below)* | |
| `examples: ['maca e zez']` | example phrases |
| `footnotes: ['…']` | small notes |
| `text: ['…']` | your caption, at the bottom |

Anything missing in a table shows as a faint **—** ("— mungon e dhona"); a table with no data at all says **Ende mungojn.**

### Folje: conjugation

```js
{
    type: 'fjale', sub: 'folje', date: '2025-12-13',
    words: [                                   // one or more verbs on the same card
        {
            word: 'fjaroj', std: 'fluturoj',
            conjugation: [
                { tense: 'tashmja', mood: 'dëftore',
                  un: 'fjaroj', taj: 'fjarojsh/fjaron', aj: 'fjaron', ne: 'fjarojm', ju: 'fjarojni', ato: 'fjarojn',
                  variants: [{ un: 'fjataroj', … }] },
                { tense: 'pakryera', mood: 'dëftore', un: '…', … },
            ],
        },
    ],
}
```

The card has a **Koha** dropdown with every tense the site knows, and chips for that tense's moods. All verb forms live here, in the verb's
own `conjugation`; Gramatikë pages show them from here. A verb with `draft: true` stays off the site entirely.

The valid tense/mood pairs are in `TAXONOMY.tenses` and `TAXONOMY.moods`. Pairs listed in `TAXONOMY.sameForms` share their forms:
E ardhmja e së shkuarës (dëftore) is stored as E tashmja (kushtore), and E ardhmja e përparme e së shkuarës (dëftore) as E kryera e përbërë (kushtore).
The admin edits them once; the site shows the same forms for both.

Pairs in `TAXONOMY.unused` (e.g. E pakryera habitore) don't exist in the dialect: the card says **Nuk përdoret.** instead of **Ende mungojn.**,
and the dropdown marks a tense "— nuk përdoret" when none of its moods are used. The helper verb (kam) is exempt for the pairs a rule takes from it.

Each verb can have `participle: 'kon'` (pjesore; or a list for variations, `participle: ['pat', 'pas']`); the site shows it above the dropdown.

`TAXONOMY.rules` says how compound tenses are built: from the helper verb (`TAXONOMY.auxiliary`, the folje whose std is `kam`),
or from the verb itself, with a particle in front (`dë `, `t’`) and the participle after. In the admin, adding one of those tenses fills it in,
and **Mbush** fills the empty boxes again later. Nothing typed is ever overwritten, and only what is saved shows on the site.

`TAXONOMY.stems` does the same for a few simple tenses of regular verbs (-oj, -i, -j), built from the present first person (`un` of e tashme, dëftore).
Irregular verbs (jom, kom, vaj …) are typed by hand. Where kam as a helper differs from its own table (taj ke, not kie), `TAXONOMY.auxiliaryForms` is used instead.

### Emra: declension

```js
{
    type: 'fjale', sub: 'emra', date: '2025-06-02',
    word: 'vdorë', gender: 'femërore', std: 'borë',
    declension: {
        njejes: {
            pashquar: { emerore: 'vdorë', rrjedhore: 'pi vdore' },
            shquar:   { emerore: 'vdora', gjinore: 'i/e vdorës', dhanore: 'vdorës', kallezore: 'vdorën' },
        },
        shumes: { pashquar: { … }, shquar: { … } },
    },
}
```

Cases: `emerore`, `gjinore`, `dhanore`, `kallezore`, `rrjedhore` (no ë in these keys; pronoun entries' `case` does use it: `emërore`, `kallëzore`).
The definite singular nominative is shown next to the headword; `def: '…'` on the entry overrides it.

### Mbiemra

```js
{
    type: 'fjale', sub: 'mbiemra', date: '2025-05-26',
    words: [
        { word: 'i madh', njejes: { m: 'i madh', f: 'e madhe' }, shumes: { m: 't’mdhi', f: 't’mdhoja' },
          variants: [{ word: '…', njejes: { … }, shumes: { … } }] },
    ],
}
```

### Ndajfolje

```js
{ type: 'fjale', sub: 'ndajfolje', word: 'shtaj', pos: 'ndajfolje kohe', std: 'tash', variants: ['shtahi'], meaning: ['…'] }
```

## Gramatikë: `type: 'gramatike'`

Every tense in `TAXONOMY.tenses` has a page, with chips for its moods. Each tense + mood shows the Gramatikë entry for that pair
if there is one (`intro`, a **formimi** line taken from `TAXONOMY.rules`, `footnotes`, `text`), and a table with a random Fjalor verb
that has forms for that pair. The search box above the table swaps in another verb; **qetër** picks another at random.

A tense entry holds no forms itself; they live in the Fjalor verbs:

```js
{
    type: 'gramatike',
    tense: 'tashmja',             // one of TAXONOMY.tenses
    mood: 'dëftore',              // dëftore | habitore | urdhërore | lidhore | kushtore | dëshirore
    date: '2025-05-27',
    intro: ['…'],                 // optional: explanation above the table
    footnotes: ['…'],             // under the table
    text: ['…'],                  // your caption, at the bottom
}
```

**Pjesorja** shows one verb's `participle` at a time, with the same search box; it has no entry of its own.
**Përcjellorja** works the same way, showing each particle in `TAXONOMY.gerund.pre` (`tu`, `të`) + the participle.

Paskajorja and pronouns still keep their forms in the entry, as a list of **words**:

```js
{ type: 'gramatike', tense: 'paskajorja', words: [{ word: '-për t-', examples: ['për tu bo', …] }] }
```

Pronouns use `pronoun` and `case` instead of `tense` and `mood`:

```js
{ type: 'gramatike', pronoun: 'pronore', case: 'emërore', words: [{ word: 'mashkullore', un: 'i jemi', … }, { word: 'femërore', … }] }
```

- Persons: `un`, `taj`, `aj` (shown as aj/ajo), `ne`, `ju`, `ato`. Leave out the ones that don't exist.
- Several forms for one person: give a list, `ju: ['dini', 'dinja']`; each gets its own row.
- `word` and `std` are both optional (a word with only `std` shows just the standard form).
- Words that are shown as examples instead of a table (like paskajorja): `{ word: '-për t-', examples: ['për tu bo', …] }`.
- Pronoun entries with the same `pronoun` and different `case` become the buttons, ordered by `TAXONOMY.variants`.
- The table is drawn from this: each word with its variants beside it, a line between words.

## Blog: `type: 'blog'`

```js
{
    type: 'blog',
    cat: 'shqiptim',              // shprehje | shqiptim | lista (see TAXONOMY.blog)
    date: '2025-05-28',
    place: 'Kamjan',              // optional
    title: 'Diftongi ea',
    sub: 'zanore rreshqitëse',    // optional subtitle
    std: 'do ti them',            // optional
    video: 'videos/video-log-1',  // optional; expects .mp4 and a .jpg poster with that name
    body: [ ...blocks ],          // the post, top to bottom
}
```

---

## Blocks

Used in Blog `body` (Fjalor and Gramatikë entries use their own fields instead).

| Block | Shows |
|---|---|
| `'text'` | a paragraph |
| `{ list: ['a', 'b'] }` | lines |
| `{ table: [[6 forms], [6 forms]] }` | conjugation table, rows labelled with `TAXONOMY.persons` (un, taj, aj/ajo, ne, ju, ato) |
| `{ cols: [['a', 'b'], ['c', 'd']] }` | side-by-side lists without person labels |
| `{ note: '…' }` | small footnote |
| `{ head: 'ngjoj', std: 'dëgjoj' }` | sub-headword with its standard form |
| `{ label: 'variacion' }` | small grey label |
| `{ std: 'fik' }` | a standalone `std:` line |

`table` takes optional `rows` to replace the person labels, e.g. `rows: ['taj', 'ju']`.

`table` and `cols` take optional `heads`, one per column:

- `'variant'`: small grey "variant"
- `'laj'`: plain word
- `{ word: 'vaj', std: 'vij' }`: word with its standard form under it
- `{ std: 'fik' }`: only the standard form
- `''`: empty

Empty cells in a table are `''`.

## Links

Every entry gets a link from its title: `#vdore`, `#diftongi-ea`, `#e-tashmja-habitore`.
To fix a link so it never changes, add `id: 'my-id'` to the entry.
