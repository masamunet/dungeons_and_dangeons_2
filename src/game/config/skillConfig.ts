export interface SkillDef {
	id: string;
	name: string;
	description: string;
	icon: string; // Emoji for now, replace with sprite later
	maxLevel: number;
	requires: string[]; // Skill IDs that must be unlocked first
	tree: 'warrior' | 'rogue' | 'arcane';
	row: number; // 0 = top (root), higher = deeper
	col: number; // Position within row
	effects: Array<{
		stat: string;
		perLevel: number;
	}>;
}

export const SKILL_DEFS: SkillDef[] = [
	// === WARRIOR TREE ===
	{
		id: 'w_vitality',
		name: '生命力',
		description: '最大HPが増加する',
		icon: '❤',
		maxLevel: 5,
		requires: [],
		tree: 'warrior',
		row: 0,
		col: 1,
		effects: [{ stat: 'maxHealth', perLevel: 20 }],
	},
	{
		id: 'w_strength',
		name: '剛力',
		description: '攻撃力が増加する',
		icon: '⚔',
		maxLevel: 5,
		requires: [],
		tree: 'warrior',
		row: 0,
		col: 0,
		effects: [{ stat: 'attackDamage', perLevel: 3 }],
	},
	{
		id: 'w_fortify',
		name: '鉄壁',
		description: '被ダメージが軽減される',
		icon: '🛡',
		maxLevel: 3,
		requires: ['w_vitality'],
		tree: 'warrior',
		row: 1,
		col: 1,
		effects: [{ stat: 'damageReduction', perLevel: 5 }],
	},
	{
		id: 'w_cleave',
		name: '薙ぎ払い',
		description: '攻撃範囲が広がる',
		icon: '🌀',
		maxLevel: 3,
		requires: ['w_strength'],
		tree: 'warrior',
		row: 1,
		col: 0,
		effects: [{ stat: 'attackArc', perLevel: 15 }],
	},
	{
		id: 'w_berserk',
		name: '狂戦士',
		description: 'HP50%以下で攻撃力が大幅上昇',
		icon: '🔥',
		maxLevel: 1,
		requires: ['w_cleave', 'w_fortify'],
		tree: 'warrior',
		row: 2,
		col: 0,
		effects: [{ stat: 'berserkDamageBonus', perLevel: 30 }],
	},

	// === ROGUE TREE ===
	{
		id: 'r_agility',
		name: '敏捷',
		description: '移動速度が上昇する',
		icon: '💨',
		maxLevel: 5,
		requires: [],
		tree: 'rogue',
		row: 0,
		col: 0,
		effects: [{ stat: 'speed', perLevel: 10 }],
	},
	{
		id: 'r_stamina',
		name: '持久力',
		description: '最大スタミナが増加する',
		icon: '🟢',
		maxLevel: 5,
		requires: [],
		tree: 'rogue',
		row: 0,
		col: 1,
		effects: [{ stat: 'maxStamina', perLevel: 15 }],
	},
	{
		id: 'r_evasion',
		name: '回避術',
		description: 'ドッジのiフレームが延長される',
		icon: '👻',
		maxLevel: 3,
		requires: ['r_agility'],
		tree: 'rogue',
		row: 1,
		col: 0,
		effects: [{ stat: 'iframeDuration', perLevel: 50 }],
	},
	{
		id: 'r_quickstrike',
		name: '迅撃',
		description: '攻撃のウィンドアップ時間が短縮',
		icon: '⚡',
		maxLevel: 3,
		requires: ['r_stamina'],
		tree: 'rogue',
		row: 1,
		col: 1,
		effects: [{ stat: 'attackWindupReduction', perLevel: 30 }],
	},
	{
		id: 'r_shadowstep',
		name: '影歩き',
		description: 'ドッジ距離とスピードが大幅上昇',
		icon: '🌑',
		maxLevel: 1,
		requires: ['r_evasion', 'r_quickstrike'],
		tree: 'rogue',
		row: 2,
		col: 0,
		effects: [{ stat: 'dodgeSpeed', perLevel: 100 }, { stat: 'dodgeDuration', perLevel: 100 }],
	},

	// === ARCANE TREE ===
	{
		id: 'a_insight',
		name: '洞察',
		description: '視界範囲が広がる',
		icon: '👁',
		maxLevel: 3,
		requires: [],
		tree: 'arcane',
		row: 0,
		col: 0,
		effects: [{ stat: 'visionRadius', perLevel: 1 }],
	},
	{
		id: 'a_regeneration',
		name: '再生',
		description: 'HPが自動回復する',
		icon: '✨',
		maxLevel: 5,
		requires: [],
		tree: 'arcane',
		row: 0,
		col: 1,
		effects: [{ stat: 'healthRegen', perLevel: 1 }],
	},
	{
		id: 'a_drain',
		name: '生命吸収',
		description: '攻撃時にHPを少量回復',
		icon: '🩸',
		maxLevel: 3,
		requires: ['a_regeneration'],
		tree: 'arcane',
		row: 1,
		col: 1,
		effects: [{ stat: 'lifeSteal', perLevel: 3 }],
	},
	{
		id: 'a_fortuna',
		name: '幸運',
		description: 'アイテムドロップ率が上昇',
		icon: '🍀',
		maxLevel: 3,
		requires: ['a_insight'],
		tree: 'arcane',
		row: 1,
		col: 0,
		effects: [{ stat: 'dropRate', perLevel: 10 }],
	},
	{
		id: 'a_transcend',
		name: '超越',
		description: 'スタミナ回復速度が大幅上昇',
		icon: '🌟',
		maxLevel: 1,
		requires: ['a_drain', 'a_fortuna'],
		tree: 'arcane',
		row: 2,
		col: 0,
		effects: [{ stat: 'staminaRegenRate', perLevel: 15 }],
	},
];

export const XP_PER_LEVEL = [
	0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 3800, // Levels 1-10
	4700, 5700, 6800, 8000, 9500, 11000, 13000, 15000, 17500, 20000, // 11-20
];

export function getXpForLevel(level: number): number {
	if (level <= 0) return 0;
	if (level <= XP_PER_LEVEL.length) return XP_PER_LEVEL[level - 1];
	return XP_PER_LEVEL[XP_PER_LEVEL.length - 1] + (level - XP_PER_LEVEL.length) * 3000;
}
