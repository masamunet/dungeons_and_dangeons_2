<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import HealthBar from './HealthBar.svelte';
	import StaminaBar from './StaminaBar.svelte';
	import { playerHealth, playerStamina, dungeonFloor } from '$lib/stores/gameState';
	import { playerLevel, skillPoints, playerXp, xpToNextLevel, currentLevelXp } from '$lib/stores/skillState';
	import { eventBridge, GameEvents } from '$lib/utils/eventBridge';

	let currentScene = $state('HubScene');

	let flavorText = $state('');
	let showFlavorText = $state(false);
	let npcDialogue = $state({ name: '', text: '' });
	let showNpcDialogue = $state(false);

	function onHealthChanged(data: { current: number; max: number }) {
		playerHealth.set(data);
	}

	function onStaminaChanged(data: { current: number; max: number }) {
		playerStamina.set(data);
	}

	function onFloorChanged(floor: number) {
		dungeonFloor.set(floor);
	}

	function onSceneReady(data: { scene: string }) {
		currentScene = data.scene;
	}

	function onFlavorTextReceived(text: string) {
		flavorText = text;
		showFlavorText = true;
		setTimeout(() => { showFlavorText = false; }, 5000);
	}

	function onNpcDialogue(data: { name: string; text: string }) {
		npcDialogue = data;
		showNpcDialogue = true;
	}

	onMount(() => {
		eventBridge.on(GameEvents.PLAYER_HEALTH_CHANGED, onHealthChanged);
		eventBridge.on(GameEvents.PLAYER_STAMINA_CHANGED, onStaminaChanged);
		eventBridge.on(GameEvents.DUNGEON_FLOOR_CHANGED, onFloorChanged);
		eventBridge.on(GameEvents.FLAVOR_TEXT_RECEIVED, onFlavorTextReceived);
		eventBridge.on(GameEvents.CURRENT_SCENE_READY, onSceneReady);
		eventBridge.on('npc-dialogue', onNpcDialogue);
	});

	onDestroy(() => {
		eventBridge.off(GameEvents.PLAYER_HEALTH_CHANGED, onHealthChanged);
		eventBridge.off(GameEvents.PLAYER_STAMINA_CHANGED, onStaminaChanged);
		eventBridge.off(GameEvents.DUNGEON_FLOOR_CHANGED, onFloorChanged);
		eventBridge.off(GameEvents.FLAVOR_TEXT_RECEIVED, onFlavorTextReceived);
		eventBridge.off(GameEvents.CURRENT_SCENE_READY, onSceneReady);
		eventBridge.off('npc-dialogue', onNpcDialogue);
	});
</script>

<!-- Top-left: Health, Stamina & Level -->
<div class="absolute top-4 left-4 flex flex-col gap-1 pointer-events-none">
	<HealthBar />
	<StaminaBar />
	<div class="flex items-center gap-2 mt-1">
		<span class="text-xs text-amber-400 font-bold w-6">Lv</span>
		<div class="w-32 h-1.5 bg-gray-900 border border-gray-700 rounded-sm overflow-hidden">
			<div
				class="h-full bg-amber-600 transition-all duration-300"
				style="width: {(($playerXp - $currentLevelXp) / Math.max(1, $xpToNextLevel - $currentLevelXp)) * 100}%"
			></div>
		</div>
		<span class="text-xs text-gray-400 font-mono">{$playerLevel}</span>
		{#if $skillPoints > 0}
			<span class="text-xs text-yellow-400 font-bold animate-pulse">SP:{$skillPoints}</span>
		{/if}
	</div>
</div>

<!-- Top-right: Location indicator -->
<div class="absolute top-4 right-4 pointer-events-none">
	<div class="text-xs text-amber-200/80 font-mono bg-black/50 px-2 py-1 rounded">
		{currentScene === 'HubScene' ? '拠点' : `Floor B${$dungeonFloor}`}
	</div>
</div>

<!-- Bottom-center: Controls hint -->
<div class="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
	<div class="text-xs text-gray-500 font-mono bg-black/30 px-3 py-1 rounded flex gap-4">
		<span>WASD: Move</span>
		{#if currentScene === 'DungeonScene'}
			<span>J: Attack</span>
			<span>K: Dodge</span>
			<span>ESC: Return</span>
		{/if}
		<span>E: Interact</span>
		<span>TAB: Skills</span>
	</div>
</div>

<!-- NPC dialogue -->
{#if showNpcDialogue}
	<div class="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-auto">
		<div class="w-96 bg-gray-950/95 border border-amber-900/60 rounded-lg px-5 py-4">
			<div class="text-xs text-amber-400 font-bold mb-2">{npcDialogue.name}</div>
			<p class="text-sm text-gray-300 leading-relaxed font-serif">{npcDialogue.text}</p>
			<button
				onclick={() => showNpcDialogue = false}
				class="mt-3 text-xs text-gray-500 hover:text-gray-300 border border-gray-700 px-3 py-1 rounded"
			>閉じる</button>
		</div>
	</div>
{/if}

<!-- Center: Flavor text overlay -->
{#if showFlavorText}
	<div class="absolute top-1/3 left-1/2 -translate-x-1/2 pointer-events-none animate-fade-in">
		<div class="max-w-md text-center text-amber-100/90 text-sm font-serif italic bg-black/70 px-6 py-4 rounded border border-amber-900/50">
			{flavorText}
		</div>
	</div>
{/if}

<style>
	@keyframes fade-in {
		from { opacity: 0; transform: translateY(-10px) translateX(-50%); }
		to { opacity: 1; transform: translateY(0) translateX(-50%); }
	}
	.animate-fade-in {
		animation: fade-in 0.5s ease-out;
	}
</style>
