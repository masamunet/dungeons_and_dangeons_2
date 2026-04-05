import { Scene } from 'phaser';
import { eventBridge, GameEvents } from '$lib/utils/eventBridge';
import { TILE_SIZE } from '$lib/utils/constants';

export class BootScene extends Scene {
	constructor() {
		super('BootScene');
	}

	preload(): void {
		// Generate all placeholder textures programmatically
		this.generateTileTextures();
		this.generatePlayerTexture();
		this.generateEnemyTexture();
	}

	create(): void {
		eventBridge.emit(GameEvents.CURRENT_SCENE_READY, { scene: 'BootScene' });
		this.scene.start('DungeonScene');
	}

	private generateTileTextures(): void {
		const T = TILE_SIZE;

		// Floor tile - dark stone
		const floor = this.make.graphics({ add: false });
		floor.fillStyle(0x2a2a3a);
		floor.fillRect(0, 0, T, T);
		floor.lineStyle(1, 0x1a1a2a);
		floor.strokeRect(0, 0, T, T);
		// Add subtle stone texture dots
		floor.fillStyle(0x252535);
		floor.fillRect(4, 4, 2, 2);
		floor.fillRect(14, 8, 2, 2);
		floor.fillRect(24, 20, 2, 2);
		floor.fillRect(8, 26, 2, 2);
		floor.generateTexture('tile_floor', T, T);
		floor.destroy();

		// Wall tile - darker, taller feel
		const wall = this.make.graphics({ add: false });
		wall.fillStyle(0x1a1a28);
		wall.fillRect(0, 0, T, T);
		wall.lineStyle(1, 0x0f0f1a);
		wall.strokeRect(0, 0, T, T);
		// Brick pattern
		wall.lineStyle(1, 0x151524);
		wall.lineBetween(0, T / 2, T, T / 2);
		wall.lineBetween(T / 2, 0, T / 2, T / 2);
		wall.lineBetween(T / 4, T / 2, T / 4, T);
		wall.lineBetween((T * 3) / 4, T / 2, (T * 3) / 4, T);
		wall.generateTexture('tile_wall', T, T);
		wall.destroy();

		// Corridor tile
		const corridor = this.make.graphics({ add: false });
		corridor.fillStyle(0x282838);
		corridor.fillRect(0, 0, T, T);
		corridor.lineStyle(1, 0x1e1e2e);
		corridor.strokeRect(0, 0, T, T);
		corridor.generateTexture('tile_corridor', T, T);
		corridor.destroy();

		// Stairs down
		const stairs = this.make.graphics({ add: false });
		stairs.fillStyle(0x2a2a3a);
		stairs.fillRect(0, 0, T, T);
		stairs.fillStyle(0x4a3a2a);
		for (let i = 0; i < 4; i++) {
			stairs.fillRect(4 + i * 2, 4 + i * 6, T - 8 - i * 4, 4);
		}
		stairs.generateTexture('tile_stairs_down', T, T);
		stairs.destroy();
	}

	private generatePlayerTexture(): void {
		const g = this.make.graphics({ add: false });
		const S = 24;

		// Body
		g.fillStyle(0x8b6914);
		g.fillRect(4, 6, 16, 14);

		// Head
		g.fillStyle(0xdbb878);
		g.fillRect(7, 0, 10, 8);

		// Legs
		g.fillStyle(0x4a3520);
		g.fillRect(5, 18, 5, 6);
		g.fillRect(14, 18, 5, 6);

		g.generateTexture('player', S, S);
		g.destroy();
	}

	private generateEnemyTexture(): void {
		const g = this.make.graphics({ add: false });
		const S = 24;

		// Skeleton body - white bones
		g.fillStyle(0xccccaa);
		g.fillRect(8, 2, 8, 6); // skull
		g.fillStyle(0x111111);
		g.fillRect(9, 3, 2, 2); // eye
		g.fillRect(13, 3, 2, 2); // eye

		g.fillStyle(0xbbbb99);
		g.fillRect(6, 8, 12, 8); // ribcage
		g.fillStyle(0x1a1a2e);
		g.fillRect(8, 9, 2, 5); // rib gap
		g.fillRect(12, 9, 2, 5); // rib gap

		g.fillStyle(0xaaaa88);
		g.fillRect(6, 16, 4, 8); // leg
		g.fillRect(14, 16, 4, 8); // leg

		g.generateTexture('enemy_skeleton', S, S);
		g.destroy();
	}
}
