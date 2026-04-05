<script lang="ts">
	import PhaserGame from '$lib/components/PhaserGame.svelte';
	import HudOverlay from '$lib/components/hud/HudOverlay.svelte';
</script>

<div class="relative w-full h-screen bg-black overflow-hidden">
	<PhaserGame />
	<HudOverlay />
</div>
