import { writable } from 'svelte/store';

export const paused = writable(false);
export const gameOver = writable(false);
export const showMainMenu = writable(true);
export const activeInputDevice = writable<'keyboard' | 'gamepad'>('keyboard');
