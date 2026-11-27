// Text on the site: escaping, **bold**, {highlight}, links ([[vdorë]], [text](#id), [text](https://…)), slugs, the std line.

import { SHARED } from '../shared.js';
import { ENTRIES } from './data.js';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ESCAPES[c]);
// Links: [[vdorë]] links to that entry (by its title or id, accents ignored; plain text if there is none, e.g. a draft),
// [text](#id) to an entry, [text](https://…) to another site (opens in a new tab). Any other address stays plain text.
const entryByTitle = (t) => {
    const n = SHARED.norm(t);
    return ENTRIES.find((e) => e.id === t || (e.key && SHARED.norm(e.key) === n));
};
const entryLink = (match, title) => {
    const e = entryByTitle(title.replace(/&amp;/g, '&'));
    return e ? `<a class="xref" href="#${esc(e.id)}">${title}</a>` : title;
};
const addressLink = (match, text, url) => {
    if (url[0] === '#') return `<a class="xref" href="${url}">${text}</a>`;
    return `<a class="xref" href="${url}" target="_blank" rel="noopener">${text}</a>`;
};
const linkify = (s) => s
    .replace(/\[\[(.+?)\]\]/g, entryLink)
    .replace(/\[([^\]]+)\]\((#[^)\s]+|https?:\/\/[^)\s]+)\)/g, addressLink);
// **bold** and {highlighted letters}
export const fmt = (s) => linkify(esc(s))
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\{(.+?)\}/g, '<span class="hl">$1</span>');
export const { norm } = SHARED;
export const slug = (t) => norm(t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const stdLine = (t) => (t ? `<p class="std">std: ${fmt(t)}</p>` : '');
