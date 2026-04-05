import { Scene } from 'phaser';
import { Entity } from './Entity';
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

		this.updateIsoPosition();
	}

	private handleMovement(): void {
		const screenMove = this.inputManager.getMovementVector();

		if (screenMove.length() > 0.1) {
			// Convert screen-space input to cartesian world direction
			const cartDir = screenDirToCart(screenMove.x, screenMove.y);
			const body = this.body as Phaser.Physics.Arcade.Body;
			body.setVelocity(cartDir.x * PLAYER_CONFIG.speed, cartDir.y * PLAYER_CONFIG.speed);
			this.facing.set(cartDir.x, cartDir.y);
			this.setState('moving');

			// Flip sprite based on screen-space horizontal direction
			if (screenMove.x < -0.1) this.setFlipX(true);
			else if (screenMove.x > 0.1) this.setFlipX(false);
		} else {
			(this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
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
		(this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
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
		// Emit attack using cartesian coordinates (game logic space)
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

		// Start i-frame timer
		this.iframeTimer = DODGE_IFRAME_START;
		this.iframeDuration = DODGE_IFRAME_DURATION;
		this.setAlpha(0.6); // Visual feedback
	}

	private handleDodgeState(delta: number): void {
		const body = this.body as Phaser.Physics.Arcade.Body;
		if (this.stateTimer < DODGE_DURATION) {
			body.setVelocity(
				this.dodgeDirection.x * DODGE_SPEED,
				this.dodgeDirection.y * DODGE_SPEED
			);
		} else {
			body.setVelocity(0, 0);
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
			(this.body as Phaser.Physics.Arcade.Body).setVelocity(knockbackX, knockbackY);
			this.setTint(0xff0000);
			this.scene.time.delayedCall(200, () => this.clearTint());
		}
	}

	getAttackPhase(): 'none' | 'windup' | 'active' | 'recovery' {
		return this.attackPhase;
	}
}
