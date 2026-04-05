<script lang="ts">
	import { playerHealth } from '$lib/stores/gameState';
</script>

<div class="flex items-center gap-2">
	<span class="text-xs text-red-400 font-bold w-6">HP</span>
	<div class="w-32 h-3 bg-gray-900 border border-gray-700 rounded-sm overflow-hidden">
		<div
			class="h-full transition-all duration-200 ease-out"
			style="width: {($playerHealth.current / $playerHealth.max) * 100}%; background: linear-gradient(to bottom, #cc2222, #881111);"
		></div>
	</div>
	<span class="text-xs text-gray-400 w-12 text-right font-mono">
		{Math.ceil($playerHealth.current)}/{$playerHealth.max}
	</span>
</div>
