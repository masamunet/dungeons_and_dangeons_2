<script lang="ts">
	import { SKILL_DEFS, type SkillDef } from '../../../game/config/skillConfig';
	import {
		skillPoints,
		allocatedSkills,
		playerLevel,
		playerXp,
		xpToNextLevel,
		currentLevelXp,
		canAllocateSkill,
		allocateSkill,
	} from '$lib/stores/skillState';

	let activeTree = $state<'warrior' | 'rogue' | 'arcane'>('warrior');
	let hoveredSkill = $state<SkillDef | null>(null);

	const treeNames = {
		warrior: '戦士',
		rogue: '盗賊',
		arcane: '秘術',
	} as const;

	const treeColors = {
		warrior: { bg: 'from-red-950/80', border: 'border-red-800', text: 'text-red-400', btn: 'bg-red-900 hover:bg-red-800' },
		rogue: { bg: 'from-green-950/80', border: 'border-green-800', text: 'text-green-400', btn: 'bg-green-900 hover:bg-green-800' },
		arcane: { bg: 'from-purple-950/80', border: 'border-purple-800', text: 'text-purple-400', btn: 'bg-purple-900 hover:bg-purple-800' },
	} as const;

	function getSkillsForTree(tree: string): SkillDef[] {
		return SKILL_DEFS.filter((s) => s.tree === tree);
	}

	function getSkillLevel(id: string): number {
		return $allocatedSkills[id] ?? 0;
	}

	function handleAllocate(skillId: string): void {
		allocateSkill(skillId);
	}

	function getXpPercent(): number {
		const current = $playerXp - $currentLevelXp;
		const needed = $xpToNextLevel - $currentLevelXp;
		if (needed <= 0) return 100;
		return Math.min(100, (current / needed) * 100);
	}

	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80" role="dialog">
	<div class="w-[600px] max-h-[80vh] bg-gray-950 border border-gray-700 rounded-lg overflow-hidden flex flex-col">
		<!-- Header -->
		<div class="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-700">
			<div class="flex items-center gap-4">
				<h2 class="text-lg font-bold text-amber-200">スキルツリー</h2>
				<span class="text-sm text-gray-400">Lv.{$playerLevel}</span>
			</div>
			<div class="flex items-center gap-4">
				<span class="text-sm text-yellow-400 font-mono">SP: {$skillPoints}</span>
				<button onclick={onClose} class="text-gray-500 hover:text-white text-xl leading-none">&times;</button>
			</div>
		</div>

		<!-- XP Bar -->
		<div class="px-4 py-2 bg-gray-900/50">
			<div class="flex items-center gap-2 text-xs text-gray-500">
				<span>XP</span>
				<div class="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
					<div class="h-full bg-amber-600 transition-all duration-300" style="width: {getXpPercent()}%"></div>
				</div>
				<span class="font-mono">{$playerXp}/{$xpToNextLevel}</span>
			</div>
		</div>

		<!-- Tree tabs -->
		<div class="flex border-b border-gray-700">
			{#each (['warrior', 'rogue', 'arcane'] as const) as tree}
				<button
					onclick={() => activeTree = tree}
					class="flex-1 py-2 text-sm font-bold transition-colors {activeTree === tree
						? `${treeColors[tree].text} bg-gray-800 border-b-2 ${treeColors[tree].border}`
						: 'text-gray-500 hover:text-gray-300'}"
				>
					{treeNames[tree]}
				</button>
			{/each}
		</div>

		<!-- Skill grid -->
		<div class="flex-1 overflow-y-auto p-4">
			<div class="grid gap-3">
				{#each [0, 1, 2] as row}
					<div class="flex justify-center gap-4">
						{#each getSkillsForTree(activeTree).filter(s => s.row === row) as skill}
							{@const level = getSkillLevel(skill.id)}
							{@const canAlloc = canAllocateSkill(skill.id)}
							{@const isMaxed = level >= skill.maxLevel}
							{@const isUnlocked = level > 0}
							<button
								class="relative w-28 p-3 rounded-lg border transition-all
									{isMaxed ? `border-amber-500 bg-amber-950/30` :
									 isUnlocked ? `${treeColors[activeTree].border} bg-gray-800` :
									 canAlloc ? `border-gray-600 bg-gray-800 hover:border-gray-400 cursor-pointer` :
									 'border-gray-800 bg-gray-900 opacity-50'}"
								onclick={() => handleAllocate(skill.id)}
								onmouseenter={() => hoveredSkill = skill}
								onmouseleave={() => hoveredSkill = null}
								disabled={!canAlloc}
							>
								<div class="text-2xl text-center mb-1">{skill.icon}</div>
								<div class="text-xs text-center font-bold truncate {isUnlocked ? treeColors[activeTree].text : 'text-gray-500'}">
									{skill.name}
								</div>
								<div class="text-xs text-center font-mono {isMaxed ? 'text-amber-400' : 'text-gray-600'}">
									{level}/{skill.maxLevel}
								</div>
							</button>
						{/each}
					</div>
				{/each}
			</div>
		</div>

		<!-- Tooltip -->
		{#if hoveredSkill}
			<div class="px-4 py-3 bg-gray-900 border-t border-gray-700">
				<div class="flex items-center gap-2 mb-1">
					<span class="text-lg">{hoveredSkill.icon}</span>
					<span class="font-bold text-amber-200">{hoveredSkill.name}</span>
					<span class="text-xs text-gray-500 font-mono">
						{getSkillLevel(hoveredSkill.id)}/{hoveredSkill.maxLevel}
					</span>
				</div>
				<p class="text-sm text-gray-400 mb-1">{hoveredSkill.description}</p>
				<div class="text-xs text-gray-500">
					{#each hoveredSkill.effects as effect}
						<span class="text-green-400">+{effect.perLevel * (getSkillLevel(hoveredSkill.id) + 1)}</span>
						<span> {effect.stat}</span>
					{/each}
				</div>
				{#if hoveredSkill.requires.length > 0}
					<div class="text-xs text-gray-600 mt-1">
						必要: {hoveredSkill.requires.map(r => SKILL_DEFS.find(s => s.id === r)?.name).join(', ')}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
