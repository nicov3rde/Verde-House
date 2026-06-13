import { browser } from '$app/environment';
import { writable } from 'svelte/store';

type Theme = 'dark' | 'light';

function getInitialTheme(): Theme {
	if (!browser) return 'dark';
	const stored = localStorage.getItem('vh_theme') as Theme | null;
	if (stored === 'dark' || stored === 'light') return stored;
	return 'dark';
}

function createThemeStore() {
	const { subscribe, set, update } = writable<Theme>('dark');

	function init() {
		const t = getInitialTheme();
		set(t);
		document.documentElement.setAttribute('data-theme', t);
	}

	function toggle() {
		update((current) => {
			const next: Theme = current === 'dark' ? 'light' : 'dark';
			localStorage.setItem('vh_theme', next);
			document.documentElement.setAttribute('data-theme', next);
			return next;
		});
	}

	function setTheme(t: Theme) {
		set(t);
		if (browser) {
			localStorage.setItem('vh_theme', t);
			document.documentElement.setAttribute('data-theme', t);
		}
	}

	return { subscribe, init, toggle, setTheme };
}

export const theme = createThemeStore();
