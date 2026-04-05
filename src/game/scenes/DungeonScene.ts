import { Scene } from 'phaser';
import { eventBridge, GameEvents } from '$lib/utils/eventBridge';
import { TILE_SIZE, GAME_BG_COLOR } from '$lib/utils/constants';
import { InputManager } from '../input/InputManager';
import { InputAction } from '../input/InputAction';
import { DungeonGenerator } from '../map/DungeonGenerator';
import { MapRenderer } from '../map/MapRenderer';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { TileType, type DungeonMap } from '../map/DungeonMap';
import { cartToIso, ISO_TILE_WIDTH, ISO_TILE_HEIGHT } from '../iso/IsoHelper';

export class DungeonScene extends Scene {
	private inputManager!: InputManager;
	private player!: Player;
	private enemies: Enemy[] = [];
	private dungeonMap!: DungeonMap;
	private currentFloor = 1;
	private wallBodies: Phaser.Physics.Arcade.StaticGroup | null = null;

	constructor() {
		super('DungeonScene');
	}

	create(): void {
		this.cameras.main.setBackgroundColor(GAME_BG_COLOR);

		// Initialize input
		this.inputManager = new InputManager(this);

		// Generate and render dungeon
		this.generateDungeon();

		// Pause/resume listeners
		eventBridge.on(GameEvents.PAUSE_REQUESTED, () => {
			this.scene.pause();
			this.physics.pause();
		});
		eventBridge.on(GameEvents.RESUME_REQUESTED, () => {
			this.scene.resume();
			this.physics.resume();
		});

		// Listen for player attack events
		this.events.on('player-attack', this.handlePlayerAttack, this);

		eventBridge.emit(GameEvents.CURRENT_SCENE_READY, { scene: 'DungeonScene' });
		eventBridge.emit(GameEvents.DUNGEON_FLOOR_CHANGED, this.currentFloor);
	}

	private generateDungeon(): void {
		// Clean up previous dungeon
		this.enemies.forEach((e) => e.destroy());
		this.enemies = [];
		if (this.wallBodies) {
			this.wallBodies.clear(true, true);
		}

		const generator = new DungeonGenerator();
		this.dungeonMap = generator.generate();

		// Render isometric tiles (visual only)
		const renderer = new MapRenderer();
		renderer.renderMap(this, this.dungeonMap);

		// Create physics collision bodies in cartesian space
		this.wallBodies = this.createCartesianWalls(this.dungeonMap);

		// Set world bounds in cartesian space
		const worldWidth = this.dungeonMap.width * TILE_SIZE;
		const worldHeight = this.dungeonMap.height * TILE_SIZE;
		this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

		// Spawn player in cartesian coordinates
		const playerSpawn = this.dungeonMap.spawnPoints.find((s) => s.type === 'player');
		if (playerSpawn) {
			const cartX = playerSpawn.x * TILE_SIZE + TILE_SIZE / 2;
			const cartY = playerSpawn.y * TILE_SIZE + TILE_SIZE / 2;

			if (this.player) {
				const body = this.player.body as Phaser.Physics.Arcade.Body;
				body.reset(cartX, cartY);
				this.player.health.current = this.player.health.max;
				this.player.health.isDead = false;
				this.player.setState('idle');
				this.player.setAlpha(1);
				this.player.clearTint();
				this.player.updateIsoPosition();
			} else {
				this.player = new Player(this, cartX, cartY, this.inputManager);
			}
		}

		// Spawn enemies in cartesian coordinates
		const enemySpawns = this.dungeonMap.spawnPoints.filter((s) => s.type === 'enemy');
		for (const spawn of enemySpawns) {
			const enemy = new Enemy(
				this,
				spawn.x * TILE_SIZE + TILE_SIZE / 2,
				spawn.y * TILE_SIZE + TILE_SIZE / 2
			);
			enemy.setTarget(this.player);
			this.enemies.push(enemy);
		}

		// Physics collisions (all in cartesian space)
		this.physics.add.collider(this.player, this.wallBodies);
		for (const enemy of this.enemies) {
			this.physics.add.collider(enemy, this.wallBodies);
		}

		// Camera follows player's isometric screen position
		this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

		// Camera bounds: compute isometric extent of the map
		const isoBounds = this.computeIsoBounds(this.dungeonMap.width, this.dungeonMap.height);
		this.cameras.main.setBounds(
			isoBounds.minX - 100, isoBounds.minY - 100,
			isoBounds.width + 200, isoBounds.height + 200
		);
		this.cameras.main.setZoom(1.5);

		// Emit minimap data
		eventBridge.emit(GameEvents.MINIMAP_DATA_UPDATED, this.dungeonMap.tiles);
	}

	/**
	 * Create invisible static physics bodies in cartesian space for wall collision.
	 * These don't render - the isometric tiles handle visuals.
	 */
	private createCartesianWalls(dungeonMap: DungeonMap): Phaser.Physics.Arcade.StaticGroup {
		const walls = this.physics.add.staticGroup();

		for (let y = 0; y < dungeonMap.height; y++) {
			for (let x = 0; x < dungeonMap.width; x++) {
				if (!dungeonMap.isWalkable(x, y)) {
					// Only add physics near walkable tiles (optimization)
					if (this.isAdjacentToWalkable(dungeonMap, x, y)) {
						const wallBody = walls.create(
							x * TILE_SIZE + TILE_SIZE / 2,
							y * TILE_SIZE + TILE_SIZE / 2,
							undefined  // No texture - invisible
						) as Phaser.Physics.Arcade.Sprite;
						wallBody.setVisible(false);
						wallBody.body!.setSize(TILE_SIZE, TILE_SIZE);
						wallBody.refreshBody();
					}
				}
			}
		}

		return walls;
	}

	private isAdjacentToWalkable(map: DungeonMap, x: number, y: number): boolean {
		for (let dy = -1; dy <= 1; dy++) {
			for (let dx = -1; dx <= 1; dx++) {
				if (dx === 0 && dy === 0) continue;
				if (map.isWalkable(x + dx, y + dy)) return true;
			}
		}
		return false;
	}

	private computeIsoBounds(mapW: number, mapH: number): { minX: number; minY: number; width: number; height: number } {
		// The four corners of the cartesian map in iso space
		const topLeft = cartToIso(0, 0);
		const topRight = cartToIso(mapW * TILE_SIZE, 0);
		const bottomLeft = cartToIso(0, mapH * TILE_SIZE);
		const bottomRight = cartToIso(mapW * TILE_SIZE, mapH * TILE_SIZE);

		const minX = Math.min(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
		const maxX = Math.max(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
		const minY = Math.min(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);
		const maxY = Math.max(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);

		return { minX, minY, width: maxX - minX, height: maxY - minY };
	}

	update(time: number, delta: number): void {
		this.inputManager.update(this);

		if (this.player && this.player.active) {
			this.player.update(time, delta);
		}

		for (const enemy of this.enemies) {
			if (enemy.active) {
				enemy.update(time, delta);
			}
		}

		this.enemies = this.enemies.filter((e) => e.active);

		this.inputManager.postUpdate();
		this.checkStairsInteraction();
	}

	private handlePlayerAttack(data: {
		cartX: number; cartY: number; damage: number;
		knockback: number; range: number;
		facingX: number; facingY: number;
	}): void {
		// Show attack visual at isometric position
		const isoPos = cartToIso(data.cartX, data.cartY);
		const hitCircle = this.add.circle(isoPos.x, isoPos.y, data.range * 0.6, 0xff4444, 0.3);
		hitCircle.setDepth(1000);
		this.tweens.add({
			targets: hitCircle,
			alpha: 0,
			scale: 1.5,
			duration: 200,
			onComplete: () => hitCircle.destroy(),
		});

		// Check hit against enemies using cartesian distance
		for (const enemy of this.enemies) {
			if (!enemy.active || enemy.health.isDead) continue;
			const dist = Phaser.Math.Distance.Between(data.cartX, data.cartY, enemy.cartX, enemy.cartY);
			if (dist < data.range + 12) {
				const dx = enemy.cartX - this.player.cartX;
				const dy = enemy.cartY - this.player.cartY;
				const len = Math.sqrt(dx * dx + dy * dy) || 1;
				enemy.applyHit(data.damage, (dx / len) * data.knockback, (dy / len) * data.knockback);

				// Damage number at isometric position
				const enemyIso = cartToIso(enemy.cartX, enemy.cartY);
				this.showDamageNumber(enemyIso.x, enemyIso.y - 20, data.damage);
			}
		}
	}

	private showDamageNumber(x: number, y: number, damage: number): void {
		const text = this.add.text(x, y, `-${damage}`, {
			fontFamily: 'Courier New',
			fontSize: '12px',
			color: '#ff4444',
			fontStyle: 'bold',
		}).setOrigin(0.5).setDepth(2000);

		this.tweens.add({
			targets: text,
			y: y - 24,
			alpha: 0,
			duration: 600,
			ease: 'Power2',
			onComplete: () => text.destroy(),
		});
	}

	private checkStairsInteraction(): void {
		if (!this.player || this.player.health.isDead) return;

		const tile = this.dungeonMap.getTile(this.player.tileX, this.player.tileY);

		if (tile === TileType.STAIRS_DOWN && this.inputManager.isActionJustPressed(InputAction.INTERACT)) {
			this.descendFloor();
		}
	}

	private descendFloor(): void {
		this.currentFloor++;
		eventBridge.emit(GameEvents.DUNGEON_FLOOR_CHANGED, this.currentFloor);

		this.cameras.main.fadeOut(500, 0, 0, 0);
		this.cameras.main.once('camerafadeoutcomplete', () => {
			this.generateDungeon();
			this.cameras.main.fadeIn(500, 0, 0, 0);
		});
	}
}
