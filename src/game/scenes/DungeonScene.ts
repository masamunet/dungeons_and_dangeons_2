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

export class DungeonScene extends Scene {
	private inputManager!: InputManager;
	private player!: Player;
	private enemies: Enemy[] = [];
	private walls!: Phaser.Physics.Arcade.StaticGroup;
	private dungeonMap!: DungeonMap;
	private currentFloor = 1;

	constructor() {
		super('DungeonScene');
	}

	create(): void {
		this.cameras.main.setBackgroundColor(GAME_BG_COLOR);

		// Initialize input
		this.inputManager = new InputManager(this);

		// Generate and render dungeon
		this.generateDungeon();

		// Set up pause listener
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

		const generator = new DungeonGenerator();
		this.dungeonMap = generator.generate();

		const renderer = new MapRenderer();
		renderer.createTilemap(this, this.dungeonMap);
		this.walls = renderer.createCollisionBodies(this, this.dungeonMap);

		// Set world bounds
		const worldWidth = this.dungeonMap.width * TILE_SIZE;
		const worldHeight = this.dungeonMap.height * TILE_SIZE;
		this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

		// Spawn player
		const playerSpawn = this.dungeonMap.spawnPoints.find((s) => s.type === 'player');
		if (playerSpawn) {
			if (this.player) {
				this.player.setPosition(
					playerSpawn.x * TILE_SIZE + TILE_SIZE / 2,
					playerSpawn.y * TILE_SIZE + TILE_SIZE / 2
				);
				this.player.health.current = this.player.health.max;
				this.player.health.isDead = false;
				this.player.setState('idle');
				this.player.setAlpha(1);
				this.player.clearTint();
			} else {
				this.player = new Player(
					this,
					playerSpawn.x * TILE_SIZE + TILE_SIZE / 2,
					playerSpawn.y * TILE_SIZE + TILE_SIZE / 2,
					this.inputManager
				);
			}
		}

		// Spawn enemies
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

		// Collisions: player <-> walls, enemies <-> walls
		this.physics.add.collider(this.player, this.walls);
		for (const enemy of this.enemies) {
			this.physics.add.collider(enemy, this.walls);
		}

		// Camera follow player
		this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
		this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
		this.cameras.main.setZoom(2);

		// Emit minimap data
		eventBridge.emit(GameEvents.MINIMAP_DATA_UPDATED, this.dungeonMap.tiles);
	}

	update(time: number, delta: number): void {
		// Update input
		this.inputManager.update(this);

		// Update player
		if (this.player && this.player.active) {
			this.player.update(time, delta);
		}

		// Update enemies
		for (const enemy of this.enemies) {
			if (enemy.active) {
				enemy.update(time, delta);
			}
		}

		// Clean up destroyed enemies
		this.enemies = this.enemies.filter((e) => e.active);

		// Post-update input (snapshot for just-pressed)
		this.inputManager.postUpdate();

		// Check stairs interaction
		this.checkStairsInteraction();
	}

	private handlePlayerAttack(data: {
		x: number; y: number; damage: number;
		knockback: number; range: number;
		facingX: number; facingY: number;
	}): void {
		// Show attack visual
		const hitCircle = this.add.circle(data.x, data.y, data.range * 0.6, 0xff4444, 0.3);
		hitCircle.setDepth(1000);
		this.tweens.add({
			targets: hitCircle,
			alpha: 0,
			scale: 1.5,
			duration: 200,
			onComplete: () => hitCircle.destroy(),
		});

		// Check hit against enemies
		for (const enemy of this.enemies) {
			if (!enemy.active || enemy.health.isDead) continue;
			const dist = Phaser.Math.Distance.Between(data.x, data.y, enemy.x, enemy.y);
			if (dist < data.range + 12) {
				const dx = enemy.x - this.player.x;
				const dy = enemy.y - this.player.y;
				const len = Math.sqrt(dx * dx + dy * dy) || 1;
				enemy.applyHit(data.damage, (dx / len) * data.knockback, (dy / len) * data.knockback);

				// Damage number
				this.showDamageNumber(enemy.x, enemy.y - 16, data.damage);
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

		const tileX = Math.floor(this.player.x / TILE_SIZE);
		const tileY = Math.floor(this.player.y / TILE_SIZE);
		const tile = this.dungeonMap.getTile(tileX, tileY);

		// Standing on stairs + interact
		if (tile === TileType.STAIRS_DOWN && this.inputManager.isActionJustPressed(InputAction.INTERACT)) {
			this.descendFloor();
		}
	}

	private descendFloor(): void {
		this.currentFloor++;
		eventBridge.emit(GameEvents.DUNGEON_FLOOR_CHANGED, this.currentFloor);

		// Fade out -> regenerate -> fade in
		this.cameras.main.fadeOut(500, 0, 0, 0);
		this.cameras.main.once('camerafadeoutcomplete', () => {
			this.generateDungeon();
			this.cameras.main.fadeIn(500, 0, 0, 0);
		});
	}
}
