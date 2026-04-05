import { Scene } from 'phaser';
import { Entity } from './Entity';
import { StaminaComponent } from './components/StaminaComponent';
import { InputManager } from '../input/InputManager';
import { InputAction } from '../input/InputAction';
import { eventBridge, GameEvents } from '$lib/utils/eventBridge';
import { PLAYER_CONFIG } from '../config/gameConfig';
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

	constructor(scene: Scene, x: number, y: number, inputManager: InputManager) {
		super(scene, x, y, 'player', PLAYER_CONFIG.maxHealth);
		this.stamina = new StaminaComponent(PLAYER_CONFIG.maxStamina);
		this.inputManager = inputManager;

		const body = this.body as Phaser.Physics.Arcade.Body;
		body.setSize(16, 16);
		body.setOffset(4, 6);

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

		// Emit stamina updates
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
			case 'hit_stun':
				if (this.stateTimer > 300) this.setState('idle');
				break;
			case 'dead':
				this.setVelocity(0, 0);
				this.setAlpha(0.5);
				break;
		}

		this.updateDepth();
	}

	private handleMovement(): void {
		const movement = this.inputManager.getMovementVector();

		if (movement.length() > 0.1) {
			this.setVelocity(movement.x * PLAYER_CONFIG.speed, movement.y * PLAYER_CONFIG.speed);
			this.facing.set(movement.x, movement.y).normalize();
			this.setState('moving');

			// Flip sprite based on horizontal direction
			if (movement.x < -0.1) this.setFlipX(true);
			else if (movement.x > 0.1) this.setFlipX(false);
		} else {
			this.setVelocity(0, 0);
			if (this.currentState === 'moving') this.setState('idle');
		}
	}

	private handleActions(): void {
		if (this.inputManager.isActionJustPressed(InputAction.ATTACK)) {
			this.startAttack();
		} else if (this.inputManager.isActionJustPressed(InputAction.DODGE)) {
			this.startDodge();
		}
	}

	private startAttack(): void {
		if (!this.stamina.canSpend(PLAYER_CONFIG.attackStaminaCost)) return;
		this.stamina.spend(PLAYER_CONFIG.attackStaminaCost);

		this.setState('attacking');
		this.attackPhase = 'windup';
		this.attackTimer = PLAYER_CONFIG.attackWindup;
		this.setVelocity(0, 0);
		this.setTint(0xffff88); // Visual feedback: windup
	}

	private handleAttackState(delta: number): void {
		this.attackTimer -= delta;

		if (this.attackTimer <= 0) {
			switch (this.attackPhase) {
				case 'windup':
					this.attackPhase = 'active';
					this.attackTimer = PLAYER_CONFIG.attackActive;
					this.setTint(0xff4444); // Visual feedback: active (damage)
					this.emitAttackHitbox();
					break;
				case 'active':
					this.attackPhase = 'recovery';
					this.attackTimer = PLAYER_CONFIG.attackRecovery;
					this.setTint(0x888888); // Visual feedback: recovery
					break;
				case 'recovery':
					this.attackPhase = 'none';
					this.clearTint();
					this.setState('idle');
					break;
			}
		}
	}

	private emitAttackHitbox(): void {
		// Emit event for CombatSystem to create a temporary hitbox
		this.scene.events.emit('player-attack', {
			x: this.x + this.facing.x * PLAYER_CONFIG.attackRange,
			y: this.y + this.facing.y * PLAYER_CONFIG.attackRange,
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

		const movement = this.inputManager.getMovementVector();
		this.dodgeDirection = movement.length() > 0.1 ? movement.clone() : this.facing.clone();
		this.dodgeDirection.normalize();

		this.setState('dodging');
		this.dodgeCooldown = DODGE_COOLDOWN;

		// Start i-frame timer
		this.iframeTimer = DODGE_IFRAME_START;
		this.iframeDuration = DODGE_IFRAME_DURATION;
		this.setAlpha(0.6); // Visual feedback
	}

	private handleDodgeState(delta: number): void {
		if (this.stateTimer < DODGE_DURATION) {
			this.setVelocity(
				this.dodgeDirection.x * DODGE_SPEED,
				this.dodgeDirection.y * DODGE_SPEED
			);
		} else {
			this.setVelocity(0, 0);
			this.setAlpha(1);
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

	applyHit(damage: number, knockbackX: number, knockbackY: number): void {
		if (this.isInvincible || this.isInState('dead')) return;

		this.health.takeDamage(damage);
		if (!this.health.isDead) {
			this.setState('hit_stun');
			this.setVelocity(knockbackX, knockbackY);
			this.setTint(0xff0000);
			this.scene.time.delayedCall(200, () => this.clearTint());
		}
	}

	getAttackPhase(): 'none' | 'windup' | 'active' | 'recovery' {
		return this.attackPhase;
	}
}
