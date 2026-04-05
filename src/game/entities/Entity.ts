import { Physics, Scene, GameObjects } from 'phaser';
import { HealthComponent } from './components/HealthComponent';
import { cartToIso, isoDepth } from '../iso/IsoHelper';
import { TILE_SIZE } from '$lib/utils/constants';

export type EntityState = 'idle' | 'moving' | 'attacking' | 'dodging' | 'guarding' | 'hit_stun' | 'staggered' | 'dead';

/**
 * Base entity using a dual-coordinate system:
 * - Physics body (this) operates invisibly in cartesian grid space
 * - A separate visual sprite is projected to isometric screen space
 *
 * IMPORTANT: this.x / this.y = cartesian physics position (do NOT use for display)
 * Use this.visual for the on-screen representation.
 */
export abstract class Entity extends Physics.Arcade.Sprite {
	health: HealthComponent;
	currentState: EntityState = 'idle';
	facing: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 1);

	/** The visible sprite rendered in isometric space */
	visual: GameObjects.Image;
	private shadow: GameObjects.Image | null = null;

	protected stateTimer = 0;

	constructor(scene: Scene, cartX: number, cartY: number, texture: string, maxHealth: number) {
		// Physics sprite is invisible, stays in cartesian space
		super(scene, cartX, cartY, texture);
		scene.add.existing(this);
		scene.physics.add.existing(this);
		this.setVisible(false); // Hide the physics sprite

		this.health = new HealthComponent(maxHealth);
		this.setCollideWorldBounds(false);

		// Create visible sprite for isometric rendering
		// Origin: feet are at ~87.5% of sprite height (21/24px for 24px sprites)
		// This places feet exactly at the isometric tile center
		this.visual = scene.add.image(0, 0, texture);
		this.visual.setOrigin(0.5, 0.875);

		// Create shadow
		if (scene.textures.exists('shadow')) {
			this.shadow = scene.add.image(0, 0, 'shadow');
		}

		this.health.onDeath(() => {
			this.setState('dead');
		});

		this.updateIsoPosition();
	}

	/** Cartesian X position (game logic / physics) */
	get cartX(): number {
		return this.x;
	}

	/** Cartesian Y position (game logic / physics) */
	get cartY(): number {
		return this.y;
	}

	/** Get cartesian tile coordinates */
	get tileX(): number {
		return Math.floor(this.x / TILE_SIZE);
	}

	get tileY(): number {
		return Math.floor(this.y / TILE_SIZE);
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
	 * Project the cartesian physics position to isometric screen coordinates
	 * on the VISUAL sprite only. The physics sprite stays in cartesian space.
	 */
	updateIsoPosition(): void {
		const tileXFrac = this.x / TILE_SIZE;
		const tileYFrac = this.y / TILE_SIZE;

		const iso = cartToIso(tileXFrac, tileYFrac);
		const depth = isoDepth(tileXFrac, tileYFrac);

		// Update visual sprite — same depth space as tiles for proper occlusion
		this.visual.setPosition(iso.x, iso.y);
		this.visual.setDepth(depth);

		// Shadow at feet position (origin 0.875 on 24px sprite = 3px below iso.y)
		if (this.shadow) {
			this.shadow.setPosition(iso.x, iso.y + 3);
			this.shadow.setDepth(depth - 0.1);
			this.shadow.setVisible(this.visual.visible);
			this.shadow.setAlpha(this.visual.alpha * 0.5);
		}
	}

	/** Proxy visual properties to the visual sprite */
	setVisualTint(tint: number): void {
		this.visual.setTint(tint);
	}

	clearVisualTint(): void {
		this.visual.clearTint();
	}

	setVisualAlpha(alpha: number): void {
		this.visual.setAlpha(alpha);
	}

	setVisualFlipX(flip: boolean): void {
		this.visual.setFlipX(flip);
	}

	destroy(fromScene?: boolean): void {
		this.shadow?.destroy();
		this.visual?.destroy();
		super.destroy(fromScene);
	}

	abstract update(time: number, delta: number): void;
}
