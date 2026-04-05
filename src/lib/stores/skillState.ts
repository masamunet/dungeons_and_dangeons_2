import { writable, derived } from 'svelte/store';
import { SKILL_DEFS, getXpForLevel } from '../../game/config/skillConfig';

export const playerXp = writable(0);
export const playerLevel = writable(1);
export const skillPoints = writable(0);
export const allocatedSkills = writable<Record<string, number>>({});

// Derived: XP needed for next level
export const xpToNextLevel = derived(playerLevel, ($level) => getXpForLevel($level + 1));
export const currentLevelXp = derived(playerLevel, ($level) => getXpForLevel($level));

// Derived: computed stat bonuses from skills
export const skillBonuses = derived(allocatedSkills, ($allocated) => {
	const bonuses: Record<string, number> = {};

	for (const [skillId, level] of Object.entries($allocated)) {
		if (level <= 0) continue;
		const def = SKILL_DEFS.find((s) => s.id === skillId);
		if (!def) continue;
		for (const effect of def.effects) {
			bonuses[effect.stat] = (bonuses[effect.stat] ?? 0) + effect.perLevel * level;
		}
	}

	return bonuses;
});

export function addXp(amount: number): void {
	playerXp.update((xp) => {
		let newXp = xp + amount;
		let currentLevel: number;
		playerLevel.subscribe((l) => (currentLevel = l))();

		// Check for level ups
		let nextLevelXp = getXpForLevel(currentLevel! + 1);
		while (newXp >= nextLevelXp) {
			currentLevel!++;
			playerLevel.set(currentLevel!);
			skillPoints.update((sp) => sp + 1);
			nextLevelXp = getXpForLevel(currentLevel! + 1);
		}

		return newXp;
	});
}

export function canAllocateSkill(skillId: string): boolean {
	let points: number;
	let allocated: Record<string, number>;
	skillPoints.subscribe((sp) => (points = sp))();
	allocatedSkills.subscribe((a) => (allocated = a))();

	if (points! <= 0) return false;

	const def = SKILL_DEFS.find((s) => s.id === skillId);
	if (!def) return false;

	const currentLevel = allocated![skillId] ?? 0;
	if (currentLevel >= def.maxLevel) return false;

	// Check prerequisites
	for (const reqId of def.requires) {
		if ((allocated![reqId] ?? 0) <= 0) return false;
	}

	return true;
}

export function allocateSkill(skillId: string): boolean {
	if (!canAllocateSkill(skillId)) return false;

	skillPoints.update((sp) => sp - 1);
	allocatedSkills.update((a) => ({
		...a,
		[skillId]: (a[skillId] ?? 0) + 1,
	}));

	return true;
}
