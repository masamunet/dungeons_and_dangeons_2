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
			return;
		}
		if (e.key === 'Escape' && showSkillTree) {
			closeSkillTree();
			return;
		}
		// Block game input while skill tree is open, but let
		// SkillTree's own bubble-phase handler receive navigation keys
		if (showSkillTree) {
			e.preventDefault();
			// Don't stopPropagation — SkillTree needs WASD/arrows/Q/E/Enter/Space
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

		// When skill tree is open, only handle close buttons here.
		// All other gamepad input is handled by SkillTree.svelte.
		if (showSkillTree) {
			if (buttons[1] && !prevGamepadButtons[1]) closeSkillTree();
			if (buttons[9] && !prevGamepadButtons[9]) closeSkillTree();
			prevGamepadButtons = buttons;
			gamepadPollId = requestAnimationFrame(pollGamepad);
			return;
		}

		// Button 1 = B/Circle -> close dialogue
		if (buttons[1] && !prevGamepadButtons[1]) {
			eventBridge.emit('gamepad-cancel');
		}

		prevGamepadButtons = buttons;
		gamepadPollId = requestAnimationFrame(pollGamepad);
	}

	function onEnemyKilled() {
		addXp(25 + Math.floor(Math.random() * 15));
	}

	onMount(() => {
		window.addEventListener('keydown', onKeyDown, { capture: true });
		eventBridge.on(GameEvents.ENEMY_KILLED, onEnemyKilled);
		gamepadPollId = requestAnimationFrame(pollGamepad);
	});

	onDestroy(() => {
		window.removeEventListener('keydown', onKeyDown, { capture: true });
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
