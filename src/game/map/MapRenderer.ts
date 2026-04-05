import { Scene } from 'phaser';
import { DungeonMap, TileType } from './DungeonMap';
import { tileToIso, isoDepth, ISO_TILE_WIDTH, ISO_TILE_HEIGHT } from '../iso/IsoHelper';

const WALL_HEIGHT = 24;
const FLOOR_DEPTH = -1000; // Floor is ALWAYS behind everything

export class MapRenderer {
	/** All wall sprites (top + faces) per tile for transparency control */
	wallSprites: Map<string, Phaser.GameObjects.Image[]> = new Map();

	renderMap(scene: Scene, dungeonMap: DungeonMap): void {
		this.wallSprites.clear();

		for (let y = 0; y < dungeonMap.height; y++) {
			for (let x = 0; x < dungeonMap.width; x++) {
				const tile = dungeonMap.getTile(x, y);
				const iso = tileToIso(x, y);

				switch (tile) {
					case TileType.FLOOR:
					case TileType.CORRIDOR:
					case TileType.STAIRS_DOWN: {
						const key = tile === TileType.FLOOR ? 'tile_floor'
							: tile === TileType.CORRIDOR ? 'tile_corridor'
							: 'tile_stairs_down';
						scene.add.image(iso.x, iso.y, key).setDepth(FLOOR_DEPTH);
						break;
					}
					case TileType.WALL: {
						if (!this.isAdjacentToWalkable(dungeonMap, x, y)) break;
						this.renderWallBlock(scene, dungeonMap, x, y, iso);
						break;
					}
				}
			}
		}
	}

	private renderWallBlock(
		scene: Scene, map: DungeonMap,
		x: number, y: number,
		iso: { x: number; y: number }
	): void {
		const depth = isoDepth(x, y);
		const sprites: Phaser.GameObjects.Image[] = [];

		// 1. TOP face (ceiling diamond) - always draw
		const top = scene.add.image(iso.x, iso.y, 'wall_top');
		top.setDepth(depth);
		sprites.push(top);

		// 2. LEFT face (south-west) - draw if no wall to iso-south-west
		//    In cartesian: +y direction = iso south-west
		const hasWallSW = !map.isWalkable(x, y + 1) && map.getTile(x, y + 1) === TileType.WALL;
		if (!hasWallSW) {
			const left = scene.add.image(
				iso.x - ISO_TILE_WIDTH / 4,          // shift left by quarter tile
				iso.y + ISO_TILE_HEIGHT / 2,          // shift down to bottom of diamond
				'wall_left'
			);
			left.setOrigin(0.5, 0);                   // anchor at top
			left.setDepth(depth + 1);
			sprites.push(left);
		}

		// 3. RIGHT face (south-east) - draw if no wall to iso-south-east
		//    In cartesian: +x direction = iso south-east
		const hasWallSE = !map.isWalkable(x + 1, y) && map.getTile(x + 1, y) === TileType.WALL;
		if (!hasWallSE) {
			const right = scene.add.image(
				iso.x + ISO_TILE_WIDTH / 4,           // shift right by quarter tile
				iso.y + ISO_TILE_HEIGHT / 2,           // shift down to bottom of diamond
				'wall_right'
			);
			right.setOrigin(0.5, 0);                   // anchor at top
			right.setDepth(depth + 1);
			sprites.push(right);
		}

		this.wallSprites.set(`${x},${y}`, sprites);
	}

	/**
	 * Diablo 1 style: walls near the player that could occlude them become transparent.
	 */
	updateWallTransparency(playerTileX: number, playerTileY: number): void {
		const playerSum = playerTileX + playerTileY;

		for (const [key, sprites] of this.wallSprites) {
			const [wx, wy] = key.split(',').map(Number);
			const dx = Math.abs(wx - playerTileX);
			const dy = Math.abs(wy - playerTileY);
			const wallSum = wx + wy;

			// Wall is south of player (closer to camera) and nearby
			const shouldFade = dx + dy < 3 && wallSum > playerSum && wallSum <= playerSum + 3;
			const alpha = shouldFade ? 0.3 : 1.0;

			for (const sprite of sprites) {
				sprite.setAlpha(alpha);
			}
		}
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
}
