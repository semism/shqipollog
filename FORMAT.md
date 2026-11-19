# Entry format

## Layout

- `docs/` is the site, and the only folder GitHub Pages publishes.
  - `docs/entries.json`: all entries, one object per entry. Order doesn't matter; the page sorts.
  - `docs/taxonomy.js`: the tabs' structure (tenses, categories, person labels, order of moods/cases).
  - `docs/index.html`, `docs/site.css`, `docs/site.js`: render them.
  - `docs/shared.js`: logic the site and the admin both use (search matching, "nuk përdoret", the rule text).
- `admin/` (`index.html`, `admin.css`, `admin.js`) and `serve.py`: the editor. Not published.

## Editing

    python3 serve.py

then open http://127.0.0.1:8792/admin/. Pick an entry, edit, Ruaj (or Ctrl+S). The right side shows the card as it will look on the site.
Each save keeps the previous file as `entries.bak.json` next to `serve.py`. Ctrl+C stops it.
The site itself is also at http://127.0.0.1:8792/ while it runs.

`draft: true` (the "fshehur" box) keeps an entry off the site. It is still in `entries.json`, so anyone reading the file can see it.

The examples below are written the short way; in `entries.json` keys and strings are in double quotes.

Text anywhere can use `{a}` to highlight letters (red) and `**word**` for bold.

---

## Fjalor: `type: 'fjale'`

Every Fjalor entry has `type: 'fjale'`, a `sub` (folje | emra | mbiemra | ndajfolje), a `date`, and optionally `place`.
Shared optional fields, shown in this order on the card:

| Field | Shows |
|---|---|
| `std: 'borë'` | standard form, omit if identical |
| `pronunciation: 'shæj/shaj/shoj'` | "shqiptime kryesore: …" |
| `meaning: ['…']` | explanation paragraphs |
| `variants: ['shtahi']` | variant words |
| `variantsNote: '…'` | short note next to the "variacion" label |
| *(the forms table, per type below)* | |
| `examples: ['maca e zez']` | example phrases |
| `footnotes: ['…']` | small notes |
| `text: ['…']` | your caption, at the bottom |

Anything missing in a table shows as a faint **—** ("— mungon hyrja"); a table with no data at all says **Mungojnë hyrje.**

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

Each verb can have `participle: 'kon'` (pjesore; or a list for variations, `participle: ['pat', 'pas']`); the site shows it above the dropdown.

`TAXONOMY.rules` says how compound tenses are built: from the helper verb (`TAXONOMY.auxiliary`, the folje whose std is `kam`),
or from the verb itself, with a particle in front (`dë `, `t’`) and the participle after. In the admin, adding one of those tenses fills it in,
and **Mbush** fills the empty boxes again later. Nothing typed is ever overwritten, and only what is saved shows on the site.

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

Cases: `emerore`, `gjinore`, `dhanore`, `kallezore`, `rrjedhore`. The definite singular nominative is shown next to the headword.

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
that has forms for that pair. The search box above the table swaps in another verb; **tjetër** picks another at random.

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
- Several forms for one person: give a list, `ju: ['fajknja', 'fajkjani (asaj)']`; each gets its own row.
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
