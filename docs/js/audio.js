// The ▶ buttons: one player for the page, playing a form's clip or its pieces one after another.

// ▶: one player for the page; pressing the playing one again stops it
const player = new Audio();
let playing = null;
const playDone = () => {
    if (playing) {
        playing.setAttribute('aria-pressed', 'false');
        playing.textContent = '▶';
    }
    playing = null;
};
let queue = []; // the rest of a linked form's clips

// every ▶ on the page
export const wirePlayer = () => {
    player.addEventListener('ended', () => {
        if (!queue.length) return playDone();
        player.src = queue.shift();
        player.play().catch(playDone);
    });
    player.addEventListener('error', playDone);
    document.addEventListener('click', (e) => {
        const b = e.target.closest('[data-audio]');
        if (!b) return;
        const again = playing === b;
        player.pause();
        queue = [];
        playDone();
        if (again) return;
        [player.src, ...queue] = b.dataset.audio.split(' ');
        player.play()
            .then(() => {
                playing = b;
                b.setAttribute('aria-pressed', 'true');
                b.textContent = '■';
            })
            .catch(playDone);
    });
};
