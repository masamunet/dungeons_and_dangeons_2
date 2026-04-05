<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { StartGame } from '../../game/main';
	import type Phaser from 'phaser';

	let game: Phaser.Game | null = null;
	let container: HTMLDivElement;

	onMount(() => {
		game = StartGame(container);
	});

	onDestroy(() => {
		if (game) {
			game.destroy(true);
			game = null;
		}
	});
</script>

<div bind:this={container} class="w-full h-full"></div>
