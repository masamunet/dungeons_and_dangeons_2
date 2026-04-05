import { Scene } from 'phaser';
import { DungeonMap, TileType } from './DungeonMap';
import { tileToIso, isoDepth, ISO_TILE_HEIGHT } from '../iso/IsoHelper';

const WALL_EXTRA_HEIGHT = 24;

export class MapRenderer {
	/**
	 * Render the dungeon map in isometric projection.
	 * Tiles are placed using isometric coordinates for visuals.
	 * Returns an array of wall tile positions for collision body creation.
	 */
	/** Wall images indexed by "tileX,tileY" for runtime alpha manipulation */
	wallImages: Map<string, Phaser.GameObjects.Image> = new Map();

	renderMap(scene: Scene, dungeonMap: DungeonMap): { wallPositions: Array<{ x: number; y: number; tileX: number; tileY: number }> } {
		const wallPositions: Array<{ x: number; y: number; tileX: number; tileY: number }> = [];
		this.wallImages.clear();

		// Render back-to-front for proper depth (top-left tile first in iso)
		for (let y = 0; y < dungeonMap.height; y++) {
			for (let x = 0; x < dungeonMap.width; x++) {
				const tile = dungeonMap.getTile(x, y);
				const isoPos = tileToIso(x, y);
				const depth = isoDepth(x, y);

				switch (tile) {
					case TileType.FLOOR: {
						const img = scene.add.image(isoPos.x, isoPos.y, 'tile_floor');
						img.setDepth(depth);
						break;
					}
					case TileType.CORRIDOR: {
						const img = scene.add.image(isoPos.x, isoPos.y, 'tile_corridor');
						img.setDepth(depth);
						break;
					}
					case TileType.STAIRS_DOWN: {
						const img = scene.add.image(isoPos.x, isoPos.y, 'tile_stairs_down');
						img.setDepth(depth);
						break;
					}
					case TileType.WALL: {
						if (this.isAdjacentToWalkable(dungeonMap, x, y)) {
							// Wall has extra height (extruded sides extend downward)
							const wallImg = scene.add.image(isoPos.x, isoPos.y, 'tile_wall');
							wallImg.setOrigin(0.5, 1 - (ISO_TILE_HEIGHT / 2) / (ISO_TILE_HEIGHT + WALL_EXTRA_HEIGHT));
							// Normal depth + small offset above floor
							wallImg.setDepth(depth + 2);
							wallPositions.push({ x: isoPos.x, y: isoPos.y, tileX: x, tileY: y });
							this.wallImages.set(`${x},${y}`, wallImg);
						}
						break;
					}
				}
			}
		}

		return { wallPositions };
	}

	/**
	 * Make walls that could occlude the player semi-transparent.
	 * In isometric view, walls to the south-east of the player (higher x+y)
	 * with extrusions can visually cover the player. Make those walls transparent.
	 */
	updateWallTransparency(playerTileX: number, playerTileY: number): void {
		const FADE_RADIUS = 3;

		for (const [key, wallImg] of this.wallImages) {
			const [wx, wy] = key.split(',').map(Number);
			const dx = wx - playerTileX;
			const dy = wy - playerTileY;
			const dist = Math.abs(dx) + Math.abs(dy);

			// Wall is "south" of player in iso terms (higher x+y) AND within radius
			// These walls' extrusions could visually cover the player
			const wallSumXY = wx + wy;
			const playerSumXY = playerTileX + playerTileY;

			if (dist < FADE_RADIUS && wallSumXY >= playerSumXY - 1 && wallSumXY <= playerSumXY + 2) {
				// Wall near player and could occlude - make transparent
				wallImg.setAlpha(0.3);
			} else {
				wallImg.setAlpha(1.0);
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
