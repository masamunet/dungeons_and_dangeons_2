<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { SKILL_DEFS, type SkillDef } from '../../../game/config/skillConfig';
	import {
		skillPoints,
		allocatedSkills,
		playerLevel,
		playerXp,
		xpToNextLevel,
		currentLevelXp,
		canAllocateSkill,
		allocateSkill,
	} from '$lib/stores/skillState';

	const TREES = ['warrior', 'rogue', 'arcane'] as const;
	type TreeType = typeof TREES[number];

	let activeTree = $state<TreeType>('warrior');
	let hoveredSkill = $state<SkillDef | null>(null);

	// Gamepad/keyboard focus navigation
	let focusRow = $state(0);
	let focusCol = $state(0);
	let prevGamepadButtons: boolean[] = [];
	let prevGamepadAxes: number[] = [];
	let gamepadPollId: number | null = null;
	const AXIS_THRESHOLD = 0.5;

	const treeNames = {
		warrior: '戦士',
		rogue: '盗賊',
		arcane: '秘術',
	} as const;

	const treeColors = {
		warrior: { bg: 'from-red-950/80', border: 'border-red-800', text: 'text-red-400', btn: 'bg-red-900 hover:bg-red-800', focusRing: 'ring-red-500' },
		rogue: { bg: 'from-green-950/80', border: 'border-green-800', text: 'text-green-400', btn: 'bg-green-900 hover:bg-green-800', focusRing: 'ring-green-500' },
		arcane: { bg: 'from-purple-950/80', border: 'border-purple-800', text: 'text-purple-400', btn: 'bg-purple-900 hover:bg-purple-800', focusRing: 'ring-purple-500' },
	} as const;

	function getSkillsForTree(tree: string): SkillDef[] {
		return SKILL_DEFS.filter((s) => s.tree === tree);
	}

	function getSkillLevel(id: string): number {
		return $allocatedSkills[id] ?? 0;
	}

	function handleAllocate(skillId: string): void {
		allocateSkill(skillId);
	}

	function getXpPercent(): number {
		const current = $playerXp - $currentLevelXp;
		const needed = $xpToNextLevel - $currentLevelXp;
		if (needed <= 0) return 100;
		return Math.min(100, (current / needed) * 100);
	}

	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();

	// --- Grid navigation helpers ---

	function getGridForCurrentTree(): SkillDef[][] {
		const skills = getSkillsForTree(activeTree);
		const grid: SkillDef[][] = [[], [], []];
		for (const s of skills) {
			grid[s.row].push(s);
		}
		// Sort each row by col
		for (const row of grid) {
			row.sort((a, b) => a.col - b.col);
		}
		return grid;
	}

	function getFocusedSkill(): SkillDef | null {
		const grid = getGridForCurrentTree();
		const row = grid[focusRow];
		if (!row || row.length === 0) return null;
		const clampedCol = Math.min(focusCol, row.length - 1);
		return row[clampedCol] ?? null;
	}

	function clampFocus() {
		const grid = getGridForCurrentTree();
		// Clamp row
		const maxRow = grid.length - 1;
		if (focusRow > maxRow) focusRow = maxRow;
		if (focusRow < 0) focusRow = 0;
		// Clamp col to current row
		const row = grid[focusRow];
		const maxCol = row ? row.length - 1 : 0;
		if (focusCol > maxCol) focusCol = maxCol;
		if (focusCol < 0) focusCol = 0;
	}

	function moveFocus(dRow: number, dCol: number) {
		focusRow += dRow;
		focusCol += dCol;
		clampFocus();
		hoveredSkill = getFocusedSkill();
	}

	function switchTree(direction: number) {
		const idx = TREES.indexOf(activeTree);
		const newIdx = (idx + direction + TREES.length) % TREES.length;
		activeTree = TREES[newIdx];
		clampFocus();
		hoveredSkill = getFocusedSkill();
	}

	function confirmFocus() {
		const skill = getFocusedSkill();
		if (skill && canAllocateSkill(skill.id)) {
			handleAllocate(skill.id);
		}
	}

	// --- Keyboard handler ---

	function onKeyDown(e: KeyboardEvent) {
		switch (e.key) {
			case 'ArrowUp':
			case 'w':
			case 'W':
				e.preventDefault();
				moveFocus(-1, 0);
				break;
			case 'ArrowDown':
			case 's':
			case 'S':
				e.preventDefault();
				moveFocus(1, 0);
				break;
			case 'ArrowLeft':
			case 'a':
			case 'A':
				e.preventDefault();
				moveFocus(0, -1);
				break;
			case 'ArrowRight':
			case 'd':
			case 'D':
				e.preventDefault();
				moveFocus(0, 1);
				break;
			case 'Enter':
			case 'j':
			case 'J':
			case ' ':
				e.preventDefault();
				confirmFocus();
				break;
			case 'q':
			case 'Q':
				e.preventDefault();
				switchTree(-1);
				break;
			case 'e':
			case 'E':
				e.preventDefault();
				switchTree(1);
				break;
		}
	}

	// --- Gamepad polling ---

	function pollGamepad() {
		const gamepads = navigator.getGamepads();
		const pad = gamepads[0];
		if (!pad) {
			gamepadPollId = requestAnimationFrame(pollGamepad);
			return;
		}

		const buttons = pad.buttons.map(b => b.pressed);
		const axes = pad.axes.map(a => a);

		// D-Pad: 12=Up, 13=Down, 14=Left, 15=Right
		if (buttons[12] && !prevGamepadButtons[12]) moveFocus(-1, 0);
		if (buttons[13] && !prevGamepadButtons[13]) moveFocus(1, 0);
		if (buttons[14] && !prevGamepadButtons[14]) moveFocus(0, -1);
		if (buttons[15] && !prevGamepadButtons[15]) moveFocus(0, 1);

		// Left stick navigation (with threshold gating)
		const prevLX = prevGamepadAxes[0] ?? 0;
		const prevLY = prevGamepadAxes[1] ?? 0;
		const lx = axes[0] ?? 0;
		const ly = axes[1] ?? 0;
		if (ly < -AXIS_THRESHOLD && prevLY >= -AXIS_THRESHOLD) moveFocus(-1, 0);
		if (ly > AXIS_THRESHOLD && prevLY <= AXIS_THRESHOLD) moveFocus(1, 0);
		if (lx < -AXIS_THRESHOLD && prevLX >= -AXIS_THRESHOLD) moveFocus(0, -1);
		if (lx > AXIS_THRESHOLD && prevLX <= AXIS_THRESHOLD) moveFocus(0, 1);

		// A / Cross (0) = Allocate
		if (buttons[0] && !prevGamepadButtons[0]) confirmFocus();

		// LB (4) = Previous tree, RB (5) = Next tree
		if (buttons[4] && !prevGamepadButtons[4]) switchTree(-1);
		if (buttons[5] && !prevGamepadButtons[5]) switchTree(1);

		// B (1) = Close (handled by parent +page.svelte, but also here for safety)
		// Start (9) = Close
		// These are handled by +page.svelte's pollGamepad, no need to duplicate

		prevGamepadButtons = buttons;
		prevGamepadAxes = axes;
		gamepadPollId = requestAnimationFrame(pollGamepad);
	}

	onMount(() => {
		window.addEventListener('keydown', onKeyDown);
		gamepadPollId = requestAnimationFrame(pollGamepad);
		// Initialize hover to focused skill
		hoveredSkill = getFocusedSkill();
	});

	onDestroy(() => {
		window.removeEventListener('keydown', onKeyDown);
		if (gamepadPollId !== null) cancelAnimationFrame(gamepadPollId);
	});

	// Check if a skill is currently focused
	function isSkillFocused(skill: SkillDef): boolean {
		const focused = getFocusedSkill();
		return focused?.id === skill.id;
	}
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80" role="dialog">
	<div class="w-[600px] max-h-[80vh] bg-gray-950 border border-gray-700 rounded-lg overflow-hidden flex flex-col">
		<!-- Header -->
		<div class="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-700">
			<div class="flex items-center gap-4">
				<h2 class="text-lg font-bold text-amber-200">スキルツリー</h2>
				<span class="text-sm text-gray-400">Lv.{$playerLevel}</span>
			</div>
			<div class="flex items-center gap-4">
				<span class="text-sm text-yellow-400 font-mono">SP: {$skillPoints}</span>
				<button onclick={onClose} class="text-gray-500 hover:text-white text-xl leading-none">&times;</button>
			</div>
		</div>

		<!-- XP Bar -->
		<div class="px-4 py-2 bg-gray-900/50">
			<div class="flex items-center gap-2 text-xs text-gray-500">
				<span>XP</span>
				<div class="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
					<div class="h-full bg-amber-600 transition-all duration-300" style="width: {getXpPercent()}%"></div>
				</div>
				<span class="font-mono">{$playerXp}/{$xpToNextLevel}</span>
			</div>
		</div>

		<!-- Tree tabs -->
		<div class="flex border-b border-gray-700">
			{#each TREES as tree}
				<button
					onclick={() => { activeTree = tree; clampFocus(); hoveredSkill = getFocusedSkill(); }}
					class="flex-1 py-2 text-sm font-bold transition-colors {activeTree === tree
						? `${treeColors[tree].text} bg-gray-800 border-b-2 ${treeColors[tree].border}`
						: 'text-gray-500 hover:text-gray-300'}"
				>
					{treeNames[tree]}
				</button>
			{/each}
		</div>

		<!-- Skill grid -->
		<div class="flex-1 overflow-y-auto p-4">
			<div class="grid gap-3">
				{#each [0, 1, 2] as row}
					<div class="flex justify-center gap-4">
						{#each getSkillsForTree(activeTree).filter(s => s.row === row) as skill}
							{@const level = getSkillLevel(skill.id)}
							{@const canAlloc = canAllocateSkill(skill.id)}
							{@const isMaxed = level >= skill.maxLevel}
							{@const isUnlocked = level > 0}
							{@const focused = isSkillFocused(skill)}
							<button
								class="relative w-28 p-3 rounded-lg border transition-all
									{isMaxed ? `border-amber-500 bg-amber-950/30` :
									 isUnlocked ? `${treeColors[activeTree].border} bg-gray-800` :
									 canAlloc ? `border-gray-600 bg-gray-800 hover:border-gray-400 cursor-pointer` :
									 'border-gray-800 bg-gray-900 opacity-50'}
									{focused ? `ring-2 ${treeColors[activeTree].focusRing} ring-offset-1 ring-offset-gray-950` : ''}"
								onclick={() => handleAllocate(skill.id)}
								onmouseenter={() => { hoveredSkill = skill; }}
								onmouseleave={() => { hoveredSkill = getFocusedSkill(); }}
								disabled={!canAlloc}
							>
								<div class="text-2xl text-center mb-1">{skill.icon}</div>
								<div class="text-xs text-center font-bold truncate {isUnlocked ? treeColors[activeTree].text : 'text-gray-500'}">
									{skill.name}
								</div>
								<div class="text-xs text-center font-mono {isMaxed ? 'text-amber-400' : 'text-gray-600'}">
									{level}/{skill.maxLevel}
								</div>
							</button>
						{/each}
					</div>
				{/each}
			</div>
		</div>

		<!-- Tooltip (fixed height to prevent layout jitter) -->
		<div class="h-24 px-4 py-3 bg-gray-900 border-t border-gray-700">
			{#if hoveredSkill}
				<div class="flex items-center gap-2 mb-1">
					<span class="text-lg">{hoveredSkill.icon}</span>
					<span class="font-bold text-amber-200">{hoveredSkill.name}</span>
					<span class="text-xs text-gray-500 font-mono">
						{getSkillLevel(hoveredSkill.id)}/{hoveredSkill.maxLevel}
					</span>
				</div>
				<p class="text-sm text-gray-400 mb-1">{hoveredSkill.description}</p>
				<div class="text-xs text-gray-500">
					{#each hoveredSkill.effects as effect}
						<span class="text-green-400">+{effect.perLevel * (getSkillLevel(hoveredSkill.id) + 1)}</span>
						<span> {effect.stat}</span>
					{/each}
					{#if hoveredSkill.requires.length > 0}
						<span class="ml-2 text-gray-600">
							| 必要: {hoveredSkill.requires.map(r => SKILL_DEFS.find(s => s.id === r)?.name).join(', ')}
						</span>
					{/if}
				</div>
			{:else}
				<p class="text-sm text-gray-600 italic">スキルにカーソルを合わせると詳細が表示されます</p>
			{/if}
		</div>

		<!-- Controls hint -->
		<div class="px-4 py-2 border-t border-gray-800 bg-gray-950">
			<div class="text-xs text-gray-600 font-mono flex justify-center gap-4">
				<span>↑↓←→: 選択</span>
				<span>Q/E: ツリー切替</span>
				<span>Enter: 割り振り</span>
				<span>TAB/ESC: 閉じる</span>
			</div>
		</div>
	</div>
</div>
