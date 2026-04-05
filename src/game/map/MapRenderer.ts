import { Scene } from 'phaser';
import { DungeonMap, TileType } from './DungeonMap';
import { tileToIso, isoDepth, ISO_TILE_WIDTH, ISO_TILE_HEIGHT } from '../iso/IsoHelper';

const WALL_HEIGHT = 24;
const FLOOR_DEPTH = -1000; // Floor is ALWAYS behind everything

export class MapRenderer {
	/** Wall TOP sprites per tile for transparency control (only tops fade) */
	private wallTops: Map<string, Phaser.GameObjects.Image> = new Map();

	renderMap(scene: Scene, dungeonMap: DungeonMap): void {
		this.wallTops.clear();

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

		// 1. TOP face (ceiling diamond) - fades when occluding player
		const top = scene.add.image(iso.x, iso.y, 'wall_top');
		top.setDepth(depth);
		this.wallTops.set(`${x},${y}`, top);

		// Diamond points relative to iso center:
		// left = (iso.x - 32, iso.y), bottom = (iso.x, iso.y + 16), right = (iso.x + 32, iso.y)

		// 2. LEFT face (SW) - anchored at diamond left point
		const hasWallSW = map.getTile(x, y + 1) === TileType.WALL;
		if (!hasWallSW) {
			const left = scene.add.image(
				iso.x - ISO_TILE_WIDTH / 2,  // diamond left point X
				iso.y,                        // diamond left point Y
				'wall_left'
			);
			left.setOrigin(0, 0);
			left.setDepth(depth + 1);
		}

		// 3. RIGHT face (SE) - anchored so (0,16) hits diamond bottom, (32,0) hits diamond right
		const hasWallSE = map.getTile(x + 1, y) === TileType.WALL;
		if (!hasWallSE) {
			const right = scene.add.image(
				iso.x,                        // texture (0,0) at diamond center X
				iso.y,                        // texture (0,0) at diamond center Y
				'wall_right'
			);
			right.setOrigin(0, 0);
			right.setDepth(depth + 1);
		}
	}

	/**
	 * Diablo 1 style: walls near the player that could occlude them become transparent.
	 */
	updateWallTransparency(playerTileX: number, playerTileY: number): void {
		for (const [key, topImg] of this.wallTops) {
			const [wx, wy] = key.split(',').map(Number);
			const dx = wx - playerTileX;
			const dy = wy - playerTileY;

			// Fade ONLY the ceiling when it's south of the player (occluding from above).
			// Wall side faces always stay opaque.
			const southOffset = dx + dy;
			const dist = Math.abs(dx) + Math.abs(dy);
			const shouldFade = dist < 2.5 && southOffset > 0;

			topImg.setAlpha(shouldFade ? 0.15 : 1.0);
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
