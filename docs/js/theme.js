// The theme button: four palettes, its icon and name.

const themeBtn = document.getElementById('theme');
// Four palettes, from darkest page to lightest. The button shows the current one's icon (a small inline SVG
// in the text colour, so it looks the same on every device) and its name sits next to it.
const ICON_ATTRS = 'viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" '
    + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
const icon = (body) => `<svg ${ICON_ATTRS}>${body}</svg>`;
const SUN_RAYS = 'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4';
const THEMES = [
    ['dark', 'baltë', icon('<path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/>')],
    ['grass', 'bar', icon('<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/>')],
    ['soil', 'traull', icon('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12a8.5 8.5 0 0 0 17 0z" fill="currentColor"/>')],
    ['light', 'letër', icon(`<circle cx="12" cy="12" r="4"/><path d="${SUN_RAYS}"/>`)],
];
const themeName = document.getElementById('theme-name');
const themeIndex = () => Math.max(0, THEMES.findIndex((t) => t[0] === document.documentElement.dataset.theme));
const setThemeLabel = () => {
    const [, name, svg] = THEMES[themeIndex()];
    themeBtn.innerHTML = svg;
    themeName.textContent = name;
    themeBtn.title = 'Ndroe temën';
    themeBtn.setAttribute('aria-label', `Tema: ${name}. Ndroe temën`);
};

// the theme button
export const wireTheme = () => {
    setThemeLabel();
    themeBtn.addEventListener('click', () => {
        const next = THEMES[(themeIndex() + 1) % THEMES.length][0];
        document.documentElement.dataset.theme = next;
        try { localStorage.setItem('shqipollog-theme', next); } catch (e) {}
        setThemeLabel();
    });
};
