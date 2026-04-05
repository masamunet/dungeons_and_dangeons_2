<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import HealthBar from './HealthBar.svelte';
	import StaminaBar from './StaminaBar.svelte';
	import { playerHealth, playerStamina, dungeonFloor } from '$lib/stores/gameState';
	import { eventBridge, GameEvents } from '$lib/utils/eventBridge';

	let flavorText = $state('');
	let showFlavorText = $state(false);

	function onHealthChanged(data: { current: number; max: number }) {
		playerHealth.set(data);
	}

	function onStaminaChanged(data: { current: number; max: number }) {
		playerStamina.set(data);
	}

	function onFloorChanged(floor: number) {
		dungeonFloor.set(floor);
	}

	function onFlavorTextReceived(text: string) {
		flavorText = text;
		showFlavorText = true;
		setTimeout(() => { showFlavorText = false; }, 5000);
	}

	onMount(() => {
		eventBridge.on(GameEvents.PLAYER_HEALTH_CHANGED, onHealthChanged);
		eventBridge.on(GameEvents.PLAYER_STAMINA_CHANGED, onStaminaChanged);
		eventBridge.on(GameEvents.DUNGEON_FLOOR_CHANGED, onFloorChanged);
		eventBridge.on(GameEvents.FLAVOR_TEXT_RECEIVED, onFlavorTextReceived);
	});

	onDestroy(() => {
		eventBridge.off(GameEvents.PLAYER_HEALTH_CHANGED, onHealthChanged);
		eventBridge.off(GameEvents.PLAYER_STAMINA_CHANGED, onStaminaChanged);
		eventBridge.off(GameEvents.DUNGEON_FLOOR_CHANGED, onFloorChanged);
		eventBridge.off(GameEvents.FLAVOR_TEXT_RECEIVED, onFlavorTextReceived);
	});
</script>

<!-- Top-left: Health & Stamina -->
<div class="absolute top-4 left-4 flex flex-col gap-1 pointer-events-none">
	<HealthBar />
	<StaminaBar />
</div>

<!-- Top-right: Floor indicator -->
<div class="absolute top-4 right-4 pointer-events-none">
	<div class="text-xs text-amber-200/80 font-mono bg-black/50 px-2 py-1 rounded">
		Floor B{$dungeonFloor}
	</div>
</div>

<!-- Bottom-center: Controls hint -->
<div class="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
	<div class="text-xs text-gray-500 font-mono bg-black/30 px-3 py-1 rounded flex gap-4">
		<span>WASD: Move</span>
		<span>J: Attack</span>
		<span>K: Dodge</span>
		<span>E: Interact</span>
	</div>
</div>

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
