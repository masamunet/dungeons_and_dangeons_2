import { Physics, Scene } from 'phaser';
import { HealthComponent } from './components/HealthComponent';

export type EntityState = 'idle' | 'moving' | 'attacking' | 'dodging' | 'hit_stun' | 'dead';

export abstract class Entity extends Physics.Arcade.Sprite {
	health: HealthComponent;
	currentState: EntityState = 'idle';
	facing: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 1); // Default facing down

	protected stateTimer = 0;

	constructor(scene: Scene, x: number, y: number, texture: string, maxHealth: number) {
		super(scene, x, y, texture);
		scene.add.existing(this);
		scene.physics.add.existing(this);

		this.health = new HealthComponent(maxHealth);
		this.setCollideWorldBounds(false);

		this.health.onDeath(() => {
			this.setState('dead');
		});
	}

	setState(state: EntityState): void {
		this.currentState = state;
		this.stateTimer = 0;
	}

	isInState(...states: EntityState[]): boolean {
		return states.includes(this.currentState);
	}

	canAct(): boolean {
		return !this.isInState('attacking', 'dodging', 'hit_stun', 'dead');
	}

	updateDepth(): void {
		this.setDepth(this.y + 10);
	}

	abstract update(time: number, delta: number): void;
}
