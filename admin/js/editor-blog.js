// The blog editor: category, title, video, and the body's blocks (paragraphs, lists, columns, notes, subtitles).

import { TAXONOMY } from '/taxonomy.js';
import { changed, el } from './core.js';
import { choose, removeBtn, section, text } from './fields.js';

const BLOCKS = [
    ['paragraf', () => ''],
    ['listë', () => ({ list: [] })],
    ['kolona', () => ({ cols: [[], []] })],
    ['shënim', () => ({ note: '' })],
    ['nëntitull', () => ({ head: '', std: '' })],
];
// what kind of block a blog body item is
const blockKind = (b) => {
    if (typeof b === 'string') return 'paragraf';
    if (b.cols) return 'kolona';
    if (b.list) return 'listë';
    if ('note' in b) return 'shënim';
    if ('head' in b) return 'nëntitull';
    if ('label' in b) return 'etiketë';
    if (b.table) return 'tabelë';
    if ('std' in b) return 'std';
    return 'tjetër';
};
const linesArea = (arr, onset) => el('textarea', { rows: 3, value: arr.join('\n'), oninput: (ev) => onset(ev.target.value.split('\n')) });

// the editor for one blog body block, by its kind; anything else is edited as JSON
const blockEditor = (blocks, i, redraw) => {
    const b = blocks[i];
    const kind = blockKind(b);
    const edited = () => changed();
    const again = () => {
        changed();
        redraw();
    };
    if (kind === 'paragraf') return el('textarea', { rows: 3, value: b, oninput: (ev) => { blocks[i] = ev.target.value; edited(); } });
    if (kind === 'shënim') return el('textarea', { rows: 2, value: b.note, oninput: (ev) => { b.note = ev.target.value; edited(); } });
    if (kind === 'listë') {
        const list = linesArea(b.list, (v) => { b.list = v; edited(); });
        return el('div', {}, el('p', { class: 'hint' }, 'Një rresht për çdo element.'), list);
    }
    if (kind === 'kolona') {
        const column = (c, ci) => {
            const removeColumn = () => {
                b.cols.splice(ci, 1);
                again();
            };
            const removeColumnBtn = b.cols.length > 1 ? el('button', { class: 'btn small', type: 'button', onclick: removeColumn }, 'Hiqe kolonën') : null;
            return el('div', {}, linesArea(c, (v) => { b.cols[ci] = v; edited(); }), removeColumnBtn);
        };
        const addColumn = () => {
            b.cols.push([]);
            again();
        };
        const layout = `display:grid;grid-template-columns:repeat(${b.cols.length},minmax(0,1fr)) auto;gap:6px;align-items:start`;
        return el('div', {}, el('p', { class: 'hint' }, 'Një rresht për çdo element, një kuti për çdo kolonë.'),
            el('div', { style: layout }, b.cols.map(column), el('button', { class: 'btn small', type: 'button', onclick: addColumn }, '+ Kolonë')));
    }
    if (kind === 'nëntitull') return el('div', { class: 'inline' }, text(b, 'head', 'head'), text(b, 'std', 'std'));
    if (kind === 'etiketë') return text(b, 'label', 'label');
    if (kind === 'std') return text(b, 'std', 'std');
    const typedJson = (ev) => {
        try {
            blocks[i] = JSON.parse(ev.target.value);
            ev.target.classList.remove('bad');
            edited();
        } catch (err) {
            ev.target.classList.add('bad');
        }
    };
    return el('textarea', { rows: 6, value: JSON.stringify(b, null, 1), oninput: typedJson });
};
export const blogEditor = (e) => {
    e.body = e.body || [];
    const box = el('div');
    const redraw = () => {
        const blocks = e.body;
        const again = () => {
            changed();
            redraw();
        };
        const swapWith = (i, j) => {
            [blocks[j], blocks[i]] = [blocks[i], blocks[j]];
            again();
        };
        const block = (b, i) => {
            const up = el('button', { class: 'x', type: 'button', title: 'Lart', disabled: i === 0, onclick: () => swapWith(i, i - 1) }, '↑');
            const down = el('button', { class: 'x', type: 'button', title: 'Poshtë', disabled: i === blocks.length - 1, onclick: () => swapWith(i, i + 1) }, '↓');
            const remove = removeBtn('Hiqe', () => { blocks.splice(i, 1); again(); });
            const tools = el('div', { class: 'bh' }, blockKind(b), el('span', { class: 'grow' }), up, down, remove);
            return el('div', { class: 'block' }, tools, blockEditor(blocks, i, redraw));
        };
        const addButton = ([label, make]) => {
            const add = () => {
                blocks.push(make());
                again();
            };
            return el('button', { class: 'btn small', type: 'button', onclick: add }, '+ ' + label);
        };
        box.replaceChildren(...blocks.map(block), el('div', { class: 'adds' }, BLOCKS.map(addButton)));
    };
    redraw();
    return [
        section('postimi',
            el('div', { class: 'inline' }, choose(e, 'cat', 'cat', TAXONOMY.blog.map((x) => [x.id, x.label]))),
            text(e, 'title', 'title'), text(e, 'sub', 'nëntitulli', 'nëntitull'), text(e, 'std', 'std'),
            text(e, 'video', 'video', 'videos/emri, pa .mp4')),
        section('body', box),
    ];
};
