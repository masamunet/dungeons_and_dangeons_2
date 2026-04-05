import { writable } from 'svelte/store';

export const playerHealth = writable({ current: 100, max: 100 });
export const playerStamina = writable({ current: 100, max: 100 });
export const playerLevel = writable(1);
export const dungeonFloor = writable(1);
export const minimapData = writable<number[][]>([]);
export const flavorText = writable('');
