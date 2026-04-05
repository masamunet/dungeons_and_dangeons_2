<script lang="ts">
	import { playerStamina } from '$lib/stores/gameState';
</script>

<div class="flex items-center gap-2">
	<span class="text-xs text-green-400 font-bold w-6">ST</span>
	<div class="w-32 h-2 bg-gray-900 border border-gray-700 rounded-sm overflow-hidden">
		<div
			class="h-full transition-all duration-100 ease-out"
			style="width: {($playerStamina.current / $playerStamina.max) * 100}%; background: linear-gradient(to bottom, #44aa33, #226611);"
		></div>
	</div>
</div>
