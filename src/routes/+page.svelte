<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import PhaserGame from '$lib/components/PhaserGame.svelte';
	import HudOverlay from '$lib/components/hud/HudOverlay.svelte';
	import SkillTree from '$lib/components/menus/SkillTree.svelte';
	import { eventBridge, GameEvents } from '$lib/utils/eventBridge';
	import { addXp } from '$lib/stores/skillState';

	let showSkillTree = $state(false);

	function onKeyDown(e: KeyboardEvent) {
		if (e.key === 'Tab' || e.key === 'i' || e.key === 'I') {
			e.preventDefault();
			showSkillTree = !showSkillTree;
			if (showSkillTree) {
				eventBridge.emit(GameEvents.PAUSE_REQUESTED);
			} else {
				eventBridge.emit(GameEvents.RESUME_REQUESTED);
			}
		}
		if (e.key === 'Escape' && showSkillTree) {
			showSkillTree = false;
			eventBridge.emit(GameEvents.RESUME_REQUESTED);
		}
	}

	function onEnemyKilled() {
		// Grant XP on enemy kill
		addXp(25 + Math.floor(Math.random() * 15));
	}

	onMount(() => {
		window.addEventListener('keydown', onKeyDown);
		eventBridge.on(GameEvents.ENEMY_KILLED, onEnemyKilled);
	});

	onDestroy(() => {
		window.removeEventListener('keydown', onKeyDown);
		eventBridge.off(GameEvents.ENEMY_KILLED, onEnemyKilled);
	});
</script>

<div class="relative w-full h-screen bg-black overflow-hidden">
	<PhaserGame />
	<HudOverlay />

	{#if showSkillTree}
		<SkillTree onClose={() => { showSkillTree = false; eventBridge.emit(GameEvents.RESUME_REQUESTED); }} />
	{/if}
</div>
