import { Scene } from 'phaser';
import { Entity, type EntityState } from './Entity';
import type { Player } from './Player';
import { ENEMY_CONFIG } from '../config/gameConfig';
import { eventBridge, GameEvents } from '$lib/utils/eventBridge';

type AIState = 'patrol' | 'chase' | 'attack' | 'cooldown';

export class Enemy extends Entity {
	private target: Player | null = null;
	private aiState: AIState = 'patrol';
	private aiTimer = 0;
	private config = ENEMY_CONFIG.skeleton;
	private patrolDirection = new Phaser.Math.Vector2(0, 0);
	private attackPhase: 'none' | 'windup' | 'active' | 'recovery' = 'none';
	private attackTimer = 0;
	private homeX: number;
	private homeY: number;

	constructor(scene: Scene, x: number, y: number) {
		super(scene, x, y, 'enemy_skeleton', ENEMY_CONFIG.skeleton.maxHealth);
		this.homeX = x;
		this.homeY = y;

		const body = this.body as Phaser.Physics.Arcade.Body;
		body.setSize(16, 16);
		body.setOffset(4, 8);

		this.health.onDeath(() => {
			eventBridge.emit(GameEvents.ENEMY_KILLED, { x: this.x, y: this.y });
			this.scene.time.delayedCall(300, () => this.destroy());
		});
	}

	setTarget(player: Player): void {
		this.target = player;
	}

	update(_time: number, delta: number): void {
		if (this.currentState === 'dead') {
			(this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
			this.setAlpha(0.3);
			return;
		}

		this.stateTimer += delta;
		this.aiTimer += delta;

		const distToPlayer = this.target
			? Phaser.Math.Distance.Between(this.cartX, this.cartY, this.target.cartX, this.target.cartY)
			: Infinity;

		switch (this.aiState) {
			case 'patrol':
				this.updatePatrol(delta, distToPlayer);
				break;
			case 'chase':
				this.updateChase(distToPlayer);
				break;
			case 'attack':
				this.updateAttack(delta);
				break;
			case 'cooldown':
				(this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
				if (this.aiTimer > 500) {
					this.aiState = 'chase';
					this.aiTimer = 0;
				}
				break;
		}

		this.updateIsoPosition();
	}

	private updatePatrol(_delta: number, distToPlayer: number): void {
		if (distToPlayer < this.config.detectionRange) {
			this.aiState = 'chase';
			this.aiTimer = 0;
			return;
		}

		// Random patrol movement
		if (this.aiTimer > 2000) {
			this.aiTimer = 0;
			const angle = Math.random() * Math.PI * 2;
			this.patrolDirection.set(Math.cos(angle), Math.sin(angle));
		}

		// Stay near home (cartesian space)
		const distHome = Phaser.Math.Distance.Between(this.cartX, this.cartY, this.homeX, this.homeY);
		if (distHome > 60) {
			this.patrolDirection.set(this.homeX - this.cartX, this.homeY - this.cartY).normalize();
		}

		(this.body as Phaser.Physics.Arcade.Body).setVelocity(
			this.patrolDirection.x * this.config.speed * 0.5,
			this.patrolDirection.y * this.config.speed * 0.5
		);

		this.setState('moving');
	}

	private updateChase(distToPlayer: number): void {
		if (!this.target || this.target.isInState('dead')) {
			this.aiState = 'patrol';
			return;
		}

		if (distToPlayer > this.config.detectionRange * 1.5) {
			this.aiState = 'patrol';
			this.aiTimer = 0;
			return;
		}

		if (distToPlayer < this.config.attackRange) {
			this.aiState = 'attack';
			this.aiTimer = 0;
			this.attackPhase = 'windup';
			this.attackTimer = this.config.attackWindup;
			(this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
			this.setTint(0xffaa00); // Telegraph: windup glow
			return;
		}

		// Move toward player (cartesian space)
		const dx = this.target.cartX - this.cartX;
		const dy = this.target.cartY - this.cartY;
		const dist = Math.sqrt(dx * dx + dy * dy);
		if (dist > 0) {
			this.facing.set(dx / dist, dy / dist);
			(this.body as Phaser.Physics.Arcade.Body).setVelocity(
				this.facing.x * this.config.speed,
				this.facing.y * this.config.speed
			);
			if (dx < 0) this.setFlipX(true);
			else this.setFlipX(false);
		}

		this.setState('moving');
	}

	private updateAttack(delta: number): void {
		this.attackTimer -= delta;

		if (this.attackTimer <= 0) {
			switch (this.attackPhase) {
				case 'windup':
					this.attackPhase = 'active';
					this.attackTimer = this.config.attackActive;
					this.setTint(0xff0000);
					this.performAttack();
					break;
				case 'active':
					this.attackPhase = 'recovery';
					this.attackTimer = this.config.attackRecovery;
					this.setTint(0x666666);
					break;
				case 'recovery':
					this.attackPhase = 'none';
					this.clearTint();
					this.aiState = 'cooldown';
					this.aiTimer = 0;
					this.setState('idle');
					break;
			}
		}
	}

	private performAttack(): void {
		if (!this.target) return;
		const dist = Phaser.Math.Distance.Between(this.cartX, this.cartY, this.target.cartX, this.target.cartY);
		if (dist < this.config.attackRange + 16) {
			const dx = this.target.cartX - this.cartX;
			const dy = this.target.cartY - this.cartY;
			const len = Math.sqrt(dx * dx + dy * dy) || 1;
			this.target.applyHit(
				this.config.damage,
				(dx / len) * this.config.knockback,
				(dy / len) * this.config.knockback
			);
		}
	}

	applyHit(damage: number, knockbackX: number, knockbackY: number): void {
		if (this.isInState('dead')) return;
		this.health.takeDamage(damage);
		if (!this.health.isDead) {
			(this.body as Phaser.Physics.Arcade.Body).setVelocity(knockbackX, knockbackY);
			this.setTint(0xff0000);
			this.scene.time.delayedCall(150, () => {
				if (this.active) this.clearTint();
			});
		}
	}
}
