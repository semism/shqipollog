// "shpërndaj" (share sheet or copy the link) and "ruaj" (the card as a PNG, drawn with docs/vendor/html2canvas).

import { LABEL } from './labels.js';

// the "shpërndaj" buttons
export const wireShare = () => {
    document.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-share]');
        if (!b) return;
        const url = `${location.origin}${location.pathname}#${b.dataset.share}`;
        if (navigator.share && matchMedia('(pointer: coarse)').matches) {
            try { await navigator.share({ title: b.dataset.title, url }); } catch (err) { /* closed the share sheet */ }
            return;
        }
        try {
            await navigator.clipboard.writeText(url);
            b.textContent = 'u kopjau';
        } catch (err) {
            b.textContent = url;
        }
        setTimeout(() => { b.textContent = 'shpërndaj'; }, 1600);
    });
};

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
// what changes in html2canvas's copy of the card before it is drawn
const prepareCopy = (doc, width) => {
    const c = doc.querySelector('[data-snap]');
    // controls and links mean nothing in a picture
    c.querySelectorAll('.share-row, .vpick, .vsug, .play').forEach((x) => x.remove());
    c.querySelectorAll('.miss-key').forEach((x) => { if (x.querySelector('a')) x.remove(); });
    // html2canvas draws the panel's stepped shadow as a frame: keep just the lighter panel
    c.querySelectorAll('.table-wrap').forEach((x) => {
        x.style.overflow = 'visible';
        x.style.boxShadow = 'none';
    });
    // a tense page's card has its title outside it: put the tense (and mood) on top
    if (c.dataset.tense && !c.querySelector('h3')) {
        const t = doc.createElement('h3');
        t.textContent = (LABEL[c.dataset.tense] || '') + (c.dataset.mood ? ', ' + c.dataset.mood : '');
        c.prepend(t);
    }
    Object.assign(c.style, { width: width + 'px', maxWidth: 'none', boxShadow: 'none', outline: 'none' });
    // no divider line above a lone post
    if (c.classList.contains('post')) Object.assign(c.style, { borderTop: '0', paddingTop: '0' });
};
const cardPng = async (card) => {
    const html2canvas = await loadH2c();
    await document.fonts.ready;
    const scale = Math.min(3, Math.max(2, window.devicePixelRatio || 1));
    // wide tables scroll inside the card: widen the copy so they show in full
    const hiddenWidths = [...card.querySelectorAll('.table-wrap')].map((t) => t.scrollWidth - t.clientWidth);
    const width = card.offsetWidth + Math.max(0, ...hiddenWidths);
    card.dataset.snap = '';
    let shot;
    try {
        shot = await html2canvas(card, {
            scale,
            backgroundColor: null,
            logging: false,
            windowWidth: Math.max(window.innerWidth, width + 64),
            onclone: (doc) => prepareCopy(doc, width),
        });
    } finally {
        delete card.dataset.snap;
    }
    const css = getComputedStyle(card);
    const page = getComputedStyle(document.body);
    const pad = 28 * scale, edge = 6 * scale, foot = 24 * scale, r = 10 * scale;
    const out = document.createElement('canvas');
    out.width = shot.width + edge + pad * 2;
    out.height = shot.height + edge + pad * 2 + foot;
    const ctx = out.getContext('2d');
    ctx.fillStyle = page.backgroundColor;
    ctx.fillRect(0, 0, out.width, out.height);
    const slab = (x, y) => {
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, shot.width, shot.height, r);
        else ctx.rect(x, y, shot.width, shot.height);
        ctx.fill();
    };
    ctx.fillStyle = css.getPropertyValue('--card-side').trim() || '#000';
    // the solid side face, down-left like on the page (blog posts have no card)
    if (card.classList.contains('entry')) slab(pad, pad + edge);
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
    const onPhone = matchMedia('(pointer: coarse)').matches;
    const canShareFile = onPhone && navigator.canShare && navigator.canShare({ files: [file] });
    if (canShareFile) {
        try {
            await navigator.share({ files: [file] });
            return;
        } catch (err) {
            if (err.name === 'AbortError') return;
            // no gesture left: download instead
        }
    }
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};

// the "ruaj" buttons
export const wireSave = () => {
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
};
