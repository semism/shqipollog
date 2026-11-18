# Entry format

## Layout

- `docs/` is the site, and the only folder GitHub Pages publishes.
  - `docs/entries.json`: all entries, one object per entry. Order doesn't matter; the page sorts.
  - `docs/taxonomy.js`: the tabs' structure (tenses, categories, person labels, order of moods/cases).
  - `docs/index.html`: renders them.
- `admin/` and `serve.py`: the editor. Not published.

## Editing

    python3 serve.py

then open http://127.0.0.1:8792/admin/. Pick an entry, edit, Ruaj (or Ctrl+S). The right side shows the card as it will look on the site.
Each save keeps the previous file as `entries.bak.json` next to `serve.py`. Ctrl+C stops it.
The site itself is also at http://127.0.0.1:8792/ while it runs.

`draft: true` (the "hamendje" box) keeps an entry off the site. It is still in `entries.json`, so anyone reading the file can see it.

The examples below are written the short way; in `entries.json` keys and strings are in double quotes.

Text anywhere can use `{a}` to highlight letters (red) and `**word**` for bold.

---

## Fjalor: `type: 'fjale'`

Every Fjalor entry has `type: 'fjale'`, a `sub` (folje | emra | mbiemra | ndajfolje), a `date`, and optionally `place`.
Shared optional fields, shown in this order on the card:

| Field | Shows |
|---|---|
| `std: 'borë'` | standard form, omit if identical |
| `shqiptime: 'shæj/shaj/shoj'` | "shqiptime kryesore: …" |
| `meaning: ['…']` | explanation paragraphs |
| `variants: ['shtahi']` | variant words |
| `variantsNote: '…'` | short note next to the "variacion" label |
| *(the forms table, per type below)* | |
| `examples: ['maca e zez']` | example phrases |
| `footnotes: ['…']` | small notes |
| `text: ['…']` | your caption, at the bottom |

Anything missing in a table shows as a faint **—** ("— mungon hyrja"); a table with no data at all says **Mungojnë hyrje.**

### Folje: zgjedhimi

```js
{
    type: 'fjale', sub: 'folje', date: '2025-12-13',
    words: [                                   // one or more verbs on the same card
        {
            word: 'fjaroj', std: 'fluturoj',
            zgjedhimi: [
                { koha: 'tashmja', menyra: 'dëftore',
                  un: 'fjaroj', taj: 'fjarojsh/fjaron', aj: 'fjaron', ne: 'fjarojm', ju: 'fjarojni', ato: 'fjarojn',
                  variants: [{ un: 'fjataroj', … }] },
                { koha: 'pakryera', menyra: 'dëftore', un: '…', … },
            ],
        },
    ],
}
```

The card has a **Zgjedhimi** dropdown with every tense/mood the site knows. Forms come from the verb's own `zgjedhimi`, or from a Gramatikë entry
that has the same verb (same `word`, or same `std`), so e.g. `jom` shows E pakryera from the grammar table.

### Emra: lakimi

```js
{
    type: 'fjale', sub: 'emra', date: '2025-06-02',
    word: 'vdorë', gjinia: 'femërore', std: 'borë',
    lakimi: {
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

A grammar entry is a list of **words**, each with its forms by person and its variants.

```js
{
    type: 'gramatike',
    koha: 'tashmja',              // tense/form: tashmja | pakryera | kryera-thjeshte | kryera-perbere | ardhmja | paskajorja
    menyra: 'dëftore',            // mood: dëftore | habitore | urdhërore | …  (the buttons above the table)
    date: '2025-05-27',
    intro: ['…'],                 // optional: explanation above the table
    words: [
        {
            word: 'ngjoj', std: 'dëgjoj',
            un: 'ngjoj', taj: 'ngjojsh', aj: 'ngjon', ne: 'ngjojm', ju: 'ngjoni', ato: 'ngjojn',
            variants: [
                { taj: 'ngjon', ne: 'ngjojna' },     // only the persons that differ
                { un: 'nëgoj', taj: 'nëgon', … },
            ],
        },
        { word: 'ngjohem', std: 'dëgjohem', un: 'ngjohem', …, variants: [{ ne: 'ngjona', ju: 'ngjoni' }] },
    ],
    footnotes: ['…'],             // under the table
    text: ['…'],                  // your caption, at the bottom
}
```

Pronouns use `peremri` and `rasa` instead of `koha` and `menyra`:

```js
{ type: 'gramatike', peremri: 'pronore', rasa: 'emërore', words: [{ word: 'mashkullore', un: 'i jemi', … }, { word: 'femërore', … }] }
```

- Persons: `un`, `taj`, `aj` (shown as aj/ajo), `ne`, `ju`, `ato`. Leave out the ones that don't exist.
- Several forms for one person: give a list, `ju: ['fajknja', 'fajkjani (asaj)']`; each gets its own row.
- `word` and `std` are both optional (a word with only `std` shows just the standard form).
- Words that are shown as examples instead of a table (like paskajorja): `{ word: '-për t-', examples: ['për tu bo', …] }`.
- Entries with the same `koha`/`peremri` and different `menyra`/`rasa` become the buttons, ordered by `TAXONOMY.variants`.
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
- `{ rasa: 'dhanore' }`: dashed case label
- `''`: empty

Empty cells in a table are `''`.

## Links

Every entry gets a link from its title: `#vdore`, `#diftongi-ea`, `#e-tashmja-habitore`.
To fix a link so it never changes, add `id: 'my-id'` to the entry.
