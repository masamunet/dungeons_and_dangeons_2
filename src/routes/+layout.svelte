<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Dungeons & Dangeons 2</title>
</svelte:head>

{@render children()}
