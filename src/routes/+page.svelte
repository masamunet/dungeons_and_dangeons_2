<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import PhaserGame from '$lib/components/PhaserGame.svelte';
	import HudOverlay from '$lib/components/hud/HudOverlay.svelte';
	import SkillTree from '$lib/components/menus/SkillTree.svelte';
	import { eventBridge, GameEvents } from '$lib/utils/eventBridge';
	import { addXp } from '$lib/stores/skillState';

	let showSkillTree = $state(false);
	let gamepadPollId: number | null = null;
	let prevGamepadButtons: boolean[] = [];

	function toggleSkillTree() {
		showSkillTree = !showSkillTree;
		if (showSkillTree) {
			eventBridge.emit(GameEvents.PAUSE_REQUESTED);
		} else {
			eventBridge.emit(GameEvents.RESUME_REQUESTED);
		}
	}

	function closeSkillTree() {
		if (!showSkillTree) return;
		showSkillTree = false;
		eventBridge.emit(GameEvents.RESUME_REQUESTED);
	}

	function onKeyDown(e: KeyboardEvent) {
		if (e.key === 'Tab' || e.key === 'i' || e.key === 'I') {
			e.preventDefault();
			toggleSkillTree();
		}
		if (e.key === 'Escape' && showSkillTree) {
			closeSkillTree();
		}
	}

	function pollGamepad() {
		const gamepads = navigator.getGamepads();
		const pad = gamepads[0];
		if (!pad) {
			gamepadPollId = requestAnimationFrame(pollGamepad);
			return;
		}

		const buttons = pad.buttons.map(b => b.pressed);

		// Button 8 = Select/Back -> toggle skill tree
		if (buttons[8] && !prevGamepadButtons[8]) {
			toggleSkillTree();
		}
		// Button 1 = B/Circle -> close skill tree / close dialogue
		if (buttons[1] && !prevGamepadButtons[1]) {
			if (showSkillTree) closeSkillTree();
			eventBridge.emit('gamepad-cancel');
		}
		// Button 9 = Start -> close skill tree (like ESC)
		if (buttons[9] && !prevGamepadButtons[9]) {
			if (showSkillTree) closeSkillTree();
		}

		prevGamepadButtons = buttons;
		gamepadPollId = requestAnimationFrame(pollGamepad);
	}

	function onEnemyKilled() {
		addXp(25 + Math.floor(Math.random() * 15));
	}

	onMount(() => {
		window.addEventListener('keydown', onKeyDown);
		eventBridge.on(GameEvents.ENEMY_KILLED, onEnemyKilled);
		gamepadPollId = requestAnimationFrame(pollGamepad);
	});

	onDestroy(() => {
		window.removeEventListener('keydown', onKeyDown);
		eventBridge.off(GameEvents.ENEMY_KILLED, onEnemyKilled);
		if (gamepadPollId !== null) cancelAnimationFrame(gamepadPollId);
	});
</script>

<div class="relative w-full h-screen bg-black overflow-hidden">
	<PhaserGame />
	<HudOverlay />

	{#if showSkillTree}
		<SkillTree onClose={closeSkillTree} />
	{/if}
</div>
