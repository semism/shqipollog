// Recordings: the microphone, playing clips and pieces, the headword's ● row and the small ● under every form.

import { SHARED } from '/shared.js';
import { changed, el, norm, SERVED, set } from './core.js';
import { removeBtn } from './fields.js';
import { helper } from './tenses.js';
import { redrawForm } from './form-list.js';

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
    const audio = { echoCancellation: false, noiseSuppression: true, autoGainControl: true };
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio });
    } catch (err) {
        recording = null;
        ui.done(null, 'S’ka qasje te mikrofoni');
        return false;
    }
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
            const headers = { 'Content-Type': blob.type, 'X-Token': TOKEN, 'X-Name': name };
            const r = await fetch('/api/audio', { method: 'POST', headers, body: blob });
            const res = await r.json();
            if (!r.ok) throw new Error(res.error || r.status);
            ui.done(res.path);
        } catch (err) {
            ui.done(null, 'Nuk u ruajt: ' + err.message);
        }
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
    const next = () => {
        if (!rest.length) return;
        a.src = '/' + rest.shift();
        a.play().catch(() => {});
    };
    a.onended = next;
    next();
};
// the e tashme (dëftore) "un" form of a verb shares the headword's recording (`audio`), not an `audios` entry
const linkedToHead = (owner, form) => !!owner.conjugation && form === SHARED.headForm(owner);
// a saved clip's length ("1.4 s"), read from the file itself, so older clips show it too
const clipLength = (path) => {
    const tag = el('span', { class: 'clip-len' });
    const a = new Audio();
    a.preload = 'metadata';
    a.onloadedmetadata = () => { if (isFinite(a.duration)) tag.textContent = `${a.duration.toFixed(1)} s`; };
    a.onerror = () => {
        tag.textContent = 'mungon skedari';
        tag.title = path;
    };
    a.src = '/' + path;
    return tag;
};

// The headword's `audio` row. The ● button stays the same element while recording, so ■ can be pressed anywhere on it.
export const recorder = (obj) => {
    let live = false;
    const btn = el('button', { class: 'btn small', type: 'button', disabled: !SERVED });
    const tools = el('span', { class: 'rec-tools' });
    const status = el('span', { class: 'hint' });
    const draw = (msg) => {
        btn.textContent = live ? '■ ndalo' : '● inçizo';
        btn.title = live ? 'Ndalo dhe ruaje' : 'Inçizo (mikrofoni)';
        btn.classList.toggle('live', live);
        const removeClip = () => {
            set(obj, 'audio', '');
            redrawForm();
        };
        const clipTools = [
            el('button', { class: 'btn small', type: 'button', title: obj.audio, onclick: () => playClip(obj.audio) }, '▶'),
            clipLength(obj.audio),
            removeBtn('Hiqe inçizimin', removeClip),
        ];
        tools.replaceChildren(...(obj.audio && !live ? clipTools : []));
        if (msg !== undefined) status.textContent = msg;
        else if (obj.audio) status.textContent = obj.audio.replace('audio/', '');
        else status.textContent = SERVED ? '' : 'vetëm me serve.py';
    };
    btn.onclick = async () => {
        if (live) return recording.stop();
        const started = await startRecording(slugAscii(obj.word || obj.std), {
            tick: (sec) => { status.textContent = `● ${sec} s`; },
            saving: () => {
                live = false;
                draw('Po ruhet…');
            },
            done: (path, err) => {
                live = false;
                if (!path) return draw(err);
                set(obj, 'audio', path);
                redrawForm();
            },
        });
        if (started) {
            live = true;
            draw('● 0 s');
        }
    };
    draw();
    return el('div', { class: 'rec' }, el('label', {}, 'audio'), btn, tools, status);
};

// A small ● for one form; once recorded, ▶ and ✕. The clip goes in owner.audios[form].
const formMic = (owner, form) => {
    let live = false;
    const box = el('span', { class: 'mic' });
    const msg = el('span', { class: 'mic-msg' });
    const head = linkedToHead(owner, form);
    const clip = () => (head ? owner.audio : owner.audios && owner.audios[form]);
    const forget = () => {
        if (head) {
            set(owner, 'audio', '');
            return redrawForm();
        }
        delete owner.audios[form];
        if (!Object.keys(owner.audios).length) delete owner.audios;
        changed();
        redrawForm();
    };
    const keep = (path) => {
        if (head) set(owner, 'audio', path);
        else {
            owner.audios = { ...(owner.audios || {}), [form]: path };
            changed();
        }
        redrawForm();
    };
    const toggle = async () => {
        if (live) return recording.stop();
        const started = await startRecording(slugAscii(form), {
            tick: (sec) => { msg.textContent = `${sec}s`; },
            saving: () => { msg.textContent = '…'; },
            done: (path, err) => {
                live = false;
                msg.textContent = err ? '!' : '';
                msg.title = err || '';
                if (path) keep(path);
                else draw();
            },
        });
        if (started) {
            live = true;
            draw();
        }
    };
    // no recording of its own, but the site can build it from recorded pieces (SHARED.clipChain): show and play that
    const piecesOf = () => {
        const own = owner.conjugation ? SHARED.clipsOf(owner) : owner.audios;
        return SHARED.clipChain(own, form, owner.conjugation ? helper() : null);
    };
    const draw = () => {
        const has = clip();
        const ready = has && !live;
        const chain = !has && !live ? piecesOf() : null;
        const piecesTitle = chain && `Dëgjo nga pjesët (${chain.paths.length}): ${form}. Inçizimi i vet e zëvendëson.`;
        const playPieces = chain ? el('button', { class: 'm linked', type: 'button', title: piecesTitle, onclick: () => playChain(chain.paths) }, '▶ pjesët') : null;
        const play = el('button', { class: 'm', type: 'button', title: `Dëgjo: ${form}`, onclick: () => playClip(has) }, '▶');
        const recordTitle = live ? 'Ndalo dhe ruaje' : `Inçizo: ${form}`;
        const record = el('button', { class: 'm' + (live ? ' live' : ''), type: 'button', disabled: !SERVED, title: recordTitle, onclick: toggle }, live ? '■' : '●');
        const remove = el('button', { class: 'm', type: 'button', title: `Hiqe inçizimin: ${form}`, onclick: forget }, '✕');
        // replaceChildren would print null as "null": drop the empty slots
        const parts = ready ? [playPieces, play, clipLength(has), remove, msg] : [playPieces, record, msg];
        box.replaceChildren(...parts.filter(Boolean));
    };
    draw();
    return box;
};
// One mic per form in a box (a box can hold several forms, one per line). redraw() after the text changes.
export const formMics = (owner, getForms) => {
    const box = el('div', { class: 'mics' });
    box.redraw = () => {
        const forms = [...new Set(getForms().map((f) => String(f).trim()).filter(Boolean))];
        // with several forms, each mic says which form it is for
        const micFor = (f) => el('span', { class: 'mic-form' }, forms.length > 1 ? el('span', { class: 'mic-label' }, f) : null, formMic(owner, f));
        box.replaceChildren(...forms.map(micFor));
    };
    box.redraw();
    return box;
};
