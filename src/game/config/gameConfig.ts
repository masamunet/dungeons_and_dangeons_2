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

	// Guard / Parry
	guardStaminaCostPerHit: 12,
	guardDamageReduction: 0.7,      // 70% damage reduction while guarding
	guardSpeedMultiplier: 0.4,      // 40% speed while guarding
	guardKnockbackMultiplier: 0.3,  // 30% knockback while guarding
	parryWindowMs: 150,             // First 150ms of guard = parry window
	parryStaminaRecover: 10,        // Stamina recovered on successful parry
	parryStunDurationMs: 800,       // How long enemy is stunned after parry

	// Just Dodge
	justDodgeWindowMs: 100,         // First 100ms of dodge = just-dodge window
	justDodgeSlowMoMs: 300,         // Slow-mo duration on just-dodge
	justDodgeSlowMoScale: 0.3,      // Time scale during slow-mo

	// Stagger
	staggerChance: 0.2,             // 20% chance to stagger on hit
	staggerDurationMs: 500,         // Stagger duration
	staggerKnockbackMultiplier: 1.5, // Knockback multiplier on stagger
	knockbackDecayRate: 0.85,       // Per-frame velocity decay (at 60fps reference)
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

		// Stagger
		staggerChance: 0.2,
		staggerDurationMs: 500,
		staggerKnockbackMultiplier: 1.5,
		knockbackDecayRate: 0.85,
	},
};
