# Entry format

All content lives in `entries.js`. `index.html` only renders it.

The file has two parts:

- `TAXONOMY`: the tabs' structure (tenses, categories, person labels, order of moods/cases).
- `ENTRIES`: one object per entry. Order in the file doesn't matter; the page sorts.

Text anywhere can use `{a}` to highlight letters (red) and `**word**` for bold.

---

## Fjalor: `type: 'fjale'`

```js
{
    type: 'fjale',
    sub: 'emra',                  // folje | emra | mbiemra | ndajfolje | numerore (see TAXONOMY.fjalor)
    date: '2025-06-02',
    place: 'Sellcë',              // optional
    head: 'vdorë',                // headword, indefinite, dialect
    def: 'vdora',                 // definite form (nouns), shown beside the headword
    pos: 'emër, gjinia femërore', // type / gender
    std: 'borë',                  // standard form, omit if identical
    forms: [ ...blocks ],         // tables, lists
    text: ['…'],                  // your explanation, shown at the bottom
}
```

A card with several words (like heci, ngares, fjaroj) leaves out `head` and puts a `{ head, std }` block before each word's forms.

## Gramatikë: `type: 'gramatike'`

```js
{
    type: 'gramatike',
    item: 'pakryera',             // an id from TAXONOMY.gramatike (tense, form or pronoun group)
    v: 'dëftore',                 // mood or case: the buttons above the table; omit if none
    date: '2025-05-26',
    forms: [ ...blocks ],
    text: ['…'],
}
```

Several entries with the same `item` and different `v` become the mood/case buttons for that item, ordered by `TAXONOMY.variants`.
A new tense or pronoun group only needs a line in `TAXONOMY.gramatike`.

## Blog: `type: 'blog'`

```js
{
    type: 'blog',
    cat: 'shqiptim',              // shprehje | shqiptim (see TAXONOMY.blog)
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

Used in `forms` and `body`.

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
