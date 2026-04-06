import { Scene } from 'phaser';
import { Entity } from './Entity';
import type { Enemy } from './Enemy';
import { StaminaComponent } from './components/StaminaComponent';
import { InputManager } from '../input/InputManager';
import { InputAction } from '../input/InputAction';
import { eventBridge, GameEvents } from '$lib/utils/eventBridge';
import { PLAYER_CONFIG } from '../config/gameConfig';
import { screenDirToCart } from '../iso/IsoHelper';
import {
	DODGE_SPEED, DODGE_DURATION, DODGE_IFRAME_START,
	DODGE_IFRAME_DURATION, DODGE_STAMINA_COST, DODGE_COOLDOWN
} from '$lib/utils/constants';

export class Player extends Entity {
	stamina: StaminaComponent;
	isInvincible = false;

	private inputManager: InputManager;
	private dodgeCooldown = 0;
	private dodgeDirection = new Phaser.Math.Vector2();
	private attackTimer = 0;
	private attackPhase: 'none' | 'windup' | 'active' | 'recovery' = 'none';
	private iframeTimer = 0;
	private iframeDuration = 0;

	// Guard / Parry
	private guardStartTime = 0;

	// Just Dodge
	private dodgeStartTime = 0;
	private justDodgeTriggered = false;

	constructor(scene: Scene, x: number, y: number, inputManager: InputManager) {
		super(scene, x, y, 'player', PLAYER_CONFIG.maxHealth);
		this.stamina = new StaminaComponent(PLAYER_CONFIG.maxStamina);
		this.inputManager = inputManager;

		const body = this.body as Phaser.Physics.Arcade.Body;
		body.setSize(16, 16);
		body.setOffset(4, 4);

		this.health.onDamage((damage, current) => {
			eventBridge.emit(GameEvents.PLAYER_HEALTH_CHANGED, { current, max: this.health.max });
		});

		this.health.onDeath(() => {
			eventBridge.emit(GameEvents.PLAYER_DIED);
		});
	}

	update(_time: number, delta: number): void {
		this.stamina.update(delta);
		this.stateTimer += delta;
		this.updateIframes(delta);

		if (this.dodgeCooldown > 0) this.dodgeCooldown -= delta;

		eventBridge.emit(GameEvents.PLAYER_STAMINA_CHANGED, {
			current: this.stamina.current,
			max: this.stamina.max,
		});

		switch (this.currentState) {
			case 'idle':
			case 'moving':
				this.handleMovement();
				this.handleActions();
				break;
			case 'attacking':
				this.handleAttackState(delta);
				break;
			case 'dodging':
				this.handleDodgeState(delta);
				break;
			case 'guarding':
				this.handleGuardState();
				break;
			case 'hit_stun':
				if (this.stateTimer > 300) this.setState('idle');
				break;
			case 'staggered':
				this.handleStaggerState();
				break;
			case 'dead':
				(this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
				this.setVisualAlpha(0.5);
				break;
		}

		this.updateIsoPosition();
	}

	private handleMovement(): void {
		const screenMove = this.inputManager.getMovementVector();
		const body = this.body as Phaser.Physics.Arcade.Body;

		if (screenMove.length() > 0.1) {
			const cartDir = screenDirToCart(screenMove.x, screenMove.y);
			body.setVelocity(cartDir.x * PLAYER_CONFIG.speed, cartDir.y * PLAYER_CONFIG.speed);
			this.facing.set(cartDir.x, cartDir.y);
			this.setState('moving');

			if (screenMove.x < -0.1) this.setVisualFlipX(true);
			else if (screenMove.x > 0.1) this.setVisualFlipX(false);
		} else {
			body.setVelocity(0, 0);
			if (this.currentState === 'moving') this.setState('idle');
		}
	}

	private handleActions(): void {
		if (this.inputManager.isActionJustPressed(InputAction.ATTACK)) {
			this.startAttack();
		} else if (this.inputManager.isActionJustPressed(InputAction.DODGE)) {
			this.startDodge();
		} else if (this.inputManager.isActionActive(InputAction.GUARD)) {
			this.startGuard();
		}
	}

	private startAttack(): void {
		if (!this.stamina.canSpend(PLAYER_CONFIG.attackStaminaCost)) return;
		this.stamina.spend(PLAYER_CONFIG.attackStaminaCost);

		this.setState('attacking');
		this.attackPhase = 'windup';
		this.attackTimer = PLAYER_CONFIG.attackWindup;
		(this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
		this.setVisualTint(0xffff88);
	}

	private handleAttackState(delta: number): void {
		this.attackTimer -= delta;

		if (this.attackTimer <= 0) {
			switch (this.attackPhase) {
				case 'windup':
					this.attackPhase = 'active';
					this.attackTimer = PLAYER_CONFIG.attackActive;
					this.setVisualTint(0xff4444);
					this.emitAttackHitbox();
					break;
				case 'active':
					this.attackPhase = 'recovery';
					this.attackTimer = PLAYER_CONFIG.attackRecovery;
					this.setVisualTint(0x888888);
					break;
				case 'recovery':
					this.attackPhase = 'none';
					this.clearVisualTint();
					this.setState('idle');
					break;
			}
		}
	}

	private emitAttackHitbox(): void {
		this.scene.events.emit('player-attack', {
			cartX: this.cartX + this.facing.x * PLAYER_CONFIG.attackRange,
			cartY: this.cartY + this.facing.y * PLAYER_CONFIG.attackRange,
			damage: PLAYER_CONFIG.attackDamage,
			knockback: PLAYER_CONFIG.attackKnockback,
			range: PLAYER_CONFIG.attackRange,
			facingX: this.facing.x,
			facingY: this.facing.y,
		});
	}

	private startDodge(): void {
		if (this.dodgeCooldown > 0) return;
		if (!this.stamina.canSpend(DODGE_STAMINA_COST)) return;
		this.stamina.spend(DODGE_STAMINA_COST);

		const screenMove = this.inputManager.getMovementVector();
		if (screenMove.length() > 0.1) {
			const cartDir = screenDirToCart(screenMove.x, screenMove.y);
			this.dodgeDirection.set(cartDir.x, cartDir.y);
		} else {
			this.dodgeDirection = this.facing.clone();
		}
		this.dodgeDirection.normalize();

		this.setState('dodging');
		this.dodgeCooldown = DODGE_COOLDOWN;
		this.dodgeStartTime = this.scene.time.now;
		this.justDodgeTriggered = false;

		this.iframeTimer = DODGE_IFRAME_START;
		this.iframeDuration = DODGE_IFRAME_DURATION;
		this.setVisualAlpha(0.6);
	}

	private handleDodgeState(_delta: number): void {
		const body = this.body as Phaser.Physics.Arcade.Body;
		if (this.stateTimer < DODGE_DURATION) {
			body.setVelocity(
				this.dodgeDirection.x * DODGE_SPEED,
				this.dodgeDirection.y * DODGE_SPEED
			);
		} else {
			body.setVelocity(0, 0);
			this.setVisualAlpha(1);
			this.isInvincible = false;
			this.setState('idle');
		}
	}

	private updateIframes(delta: number): void {
		if (this.iframeTimer > 0) {
			this.iframeTimer -= delta;
			if (this.iframeTimer <= 0) {
				this.isInvincible = true;
			}
		} else if (this.iframeDuration > 0) {
			this.iframeDuration -= delta;
			if (this.iframeDuration <= 0) {
				this.isInvincible = false;
			}
		}
	}

	// --- Guard ---

	private startGuard(): void {
		if (this.currentState === 'guarding') return;
		this.setState('guarding');
		this.guardStartTime = this.scene.time.now;
		this.setVisualTint(0x4488ff);
	}

	private handleGuardState(): void {
		// Release guard when button is released
		if (!this.inputManager.isActionActive(InputAction.GUARD)) {
			this.clearVisualTint();
			this.setState('idle');
			return;
		}

		// Allow slow movement while guarding
		const screenMove = this.inputManager.getMovementVector();
		const body = this.body as Phaser.Physics.Arcade.Body;

		if (screenMove.length() > 0.1) {
			const cartDir = screenDirToCart(screenMove.x, screenMove.y);
			const guardSpeed = PLAYER_CONFIG.speed * PLAYER_CONFIG.guardSpeedMultiplier;
			body.setVelocity(cartDir.x * guardSpeed, cartDir.y * guardSpeed);
			this.facing.set(cartDir.x, cartDir.y);
		} else {
			body.setVelocity(0, 0);
		}
	}

	/** Whether the player is in parry window (first 150ms of guard) */
	isInParryWindow(): boolean {
		if (this.currentState !== 'guarding') return false;
		return (this.scene.time.now - this.guardStartTime) < PLAYER_CONFIG.parryWindowMs;
	}

	// --- Stagger ---

	private handleStaggerState(): void {
		(this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
		if (this.stateTimer > PLAYER_CONFIG.staggerDurationMs) {
			this.clearVisualTint();
			this.setState('idle');
		}
	}

	// --- Just Dodge ---

	/** Whether the player is in just-dodge window (first 100ms of dodge) */
	isInJustDodgeWindow(): boolean {
		if (this.currentState !== 'dodging') return false;
		if (this.justDodgeTriggered) return false;
		return (this.scene.time.now - this.dodgeStartTime) < PLAYER_CONFIG.justDodgeWindowMs;
	}

	markJustDodgeTriggered(): void {
		this.justDodgeTriggered = true;
	}

	// --- Hit handling (with guard/parry/stagger) ---

	applyHit(damage: number, knockbackX: number, knockbackY: number, attackingEnemy?: Enemy | null): void {
		if (this.isInvincible || this.isInState('dead')) return;

		// Parry check
		if (this.isInParryWindow()) {
			// Successful parry: no damage, recover stamina, stun enemy
			this.stamina.recover(PLAYER_CONFIG.parryStaminaRecover);
			this.scene.cameras.main.flash(80, 255, 255, 255);
			this.setVisualTint(0xffffff);
			this.scene.time.delayedCall(150, () => {
				if (this.currentState === 'guarding') this.setVisualTint(0x4488ff);
				else this.clearVisualTint();
			});
			if (attackingEnemy && !attackingEnemy.isInState('dead')) {
				attackingEnemy.applyStun(PLAYER_CONFIG.parryStunDurationMs);
			}
			return;
		}

		// Guard check
		if (this.isInState('guarding')) {
			const staminaCost = PLAYER_CONFIG.guardStaminaCostPerHit;
			if (this.stamina.canSpend(staminaCost)) {
				this.stamina.spend(staminaCost);
				const reducedDamage = Math.floor(damage * (1 - PLAYER_CONFIG.guardDamageReduction));
				this.health.takeDamage(reducedDamage);
				// Reduced knockback while guarding
				(this.body as Phaser.Physics.Arcade.Body).setVelocity(knockbackX * 0.3, knockbackY * 0.3);
				this.setVisualTint(0x2266cc);
				this.scene.time.delayedCall(100, () => {
					if (this.currentState === 'guarding') this.setVisualTint(0x4488ff);
				});
				return;
			}
			// Stamina exhausted: guard breaks, take full hit
			this.clearVisualTint();
			this.setState('idle');
		}

		// Normal hit
		this.health.takeDamage(damage);
		if (!this.health.isDead) {
			// Stagger check
			if (Math.random() < PLAYER_CONFIG.staggerChance) {
				this.setState('staggered');
				(this.body as Phaser.Physics.Arcade.Body).setVelocity(knockbackX * 1.5, knockbackY * 1.5);
				this.setVisualTint(0xff8800);
				// Stagger visual: wobble tween
				this.scene.tweens.add({
					targets: this.visual,
					x: { value: '+=3', yoyo: true, repeat: 3, duration: 60 },
				});
			} else {
				this.setState('hit_stun');
				(this.body as Phaser.Physics.Arcade.Body).setVelocity(knockbackX, knockbackY);
				this.setVisualTint(0xff0000);
				this.scene.time.delayedCall(200, () => this.clearVisualTint());
			}
		}
	}

	getAttackPhase(): 'none' | 'windup' | 'active' | 'recovery' {
		return this.attackPhase;
	}
}
