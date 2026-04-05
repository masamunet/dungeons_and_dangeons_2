import { Physics, Scene } from 'phaser';
import { HealthComponent } from './components/HealthComponent';
import { cartToIso, isoDepth } from '../iso/IsoHelper';
import { TILE_SIZE } from '$lib/utils/constants';

export type EntityState = 'idle' | 'moving' | 'attacking' | 'dodging' | 'hit_stun' | 'dead';

/**
 * Base entity using a dual-coordinate system:
 * - Physics body operates in cartesian grid space (this.body.x/y)
 * - Sprite rendering is projected to isometric screen space
 *
 * The sprite's visual position is updated every frame via updateIsoPosition().
 * Use cartX/cartY to get the logical position, and this.x/this.y for screen position.
 */
export abstract class Entity extends Physics.Arcade.Sprite {
	health: HealthComponent;
	currentState: EntityState = 'idle';
	facing: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 1);

	protected stateTimer = 0;
	private shadow: Phaser.GameObjects.Image | null = null;

	constructor(scene: Scene, cartX: number, cartY: number, texture: string, maxHealth: number) {
		// Create the sprite at screen (0,0) initially; updateIsoPosition will fix it
		super(scene, 0, 0, texture);
		scene.add.existing(this);
		scene.physics.add.existing(this);

		this.health = new HealthComponent(maxHealth);
		this.setCollideWorldBounds(false);

		// Position the physics body in cartesian space
		const body = this.body as Phaser.Physics.Arcade.Body;
		body.reset(cartX, cartY);

		// Create shadow
		if (scene.textures.exists('shadow')) {
			this.shadow = scene.add.image(0, 0, 'shadow');
			this.shadow.setDepth(0);
		}

		this.health.onDeath(() => {
			this.setState('dead');
		});

		// Initial position sync
		this.updateIsoPosition();
	}

	/** Cartesian X position (game logic coordinates) */
	get cartX(): number {
		return (this.body as Phaser.Physics.Arcade.Body).x + (this.body as Phaser.Physics.Arcade.Body).halfWidth;
	}

	/** Cartesian Y position (game logic coordinates) */
	get cartY(): number {
		return (this.body as Phaser.Physics.Arcade.Body).y + (this.body as Phaser.Physics.Arcade.Body).halfHeight;
	}

	/** Get cartesian tile coordinates */
	get tileX(): number {
		return Math.floor(this.cartX / TILE_SIZE);
	}

	get tileY(): number {
		return Math.floor(this.cartY / TILE_SIZE);
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

	/**
	 * Project the physics body's cartesian position to isometric screen coordinates.
	 * Call this every frame after physics update.
	 */
	updateIsoPosition(): void {
		// Convert cartesian pixel position to tile-fraction coordinates
		const tileXFrac = this.cartX / TILE_SIZE;
		const tileYFrac = this.cartY / TILE_SIZE;

		// Project to isometric screen space using tile coordinates
		// (same coordinate space as MapRenderer.renderMap)
		const iso = cartToIso(tileXFrac, tileYFrac);

		// Set the sprite's visual position (overrides the physics default)
		this.setPosition(iso.x, iso.y);

		// Depth sorting based on cartesian position
		this.setDepth(isoDepth(tileXFrac, tileYFrac, 5));

		// Update shadow
		if (this.shadow) {
			this.shadow.setPosition(iso.x, iso.y + 10);
			this.shadow.setDepth(this.depth - 0.1);
			this.shadow.setVisible(this.visible);
			this.shadow.setAlpha(this.alpha * 0.5);
		}
	}

	destroy(fromScene?: boolean): void {
		this.shadow?.destroy();
		super.destroy(fromScene);
	}

	abstract update(time: number, delta: number): void;
}
