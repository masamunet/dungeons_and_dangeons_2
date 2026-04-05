export const DUNGEON_CONFIG = {
	width: 48,
	height: 48,
	minRoomSize: 5,
	maxRoomSize: 12,
	maxDepth: 5,
	corridorWidth: 2,
};

export const PLAYER_CONFIG = {
	speed: 120,
	maxHealth: 100,
	maxStamina: 100,
	attackDamage: 15,
	attackWindup: 200,
	attackActive: 150,
	attackRecovery: 300,
	attackStaminaCost: 15,
	attackRange: 28,
	attackArc: 90,
	attackKnockback: 80,
};

export const ENEMY_CONFIG = {
	skeleton: {
		speed: 50,
		maxHealth: 40,
		damage: 10,
		detectionRange: 120,
		attackRange: 24,
		attackWindup: 400,
		attackActive: 200,
		attackRecovery: 500,
		knockback: 60,
	},
};
