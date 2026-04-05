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
	renderMap(scene: Scene, dungeonMap: DungeonMap): { wallPositions: Array<{ x: number; y: number; tileX: number; tileY: number }> } {
		const wallPositions: Array<{ x: number; y: number; tileX: number; tileY: number }> = [];

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
							// Wall has extra height, anchor at bottom of the diamond face
							const wallImg = scene.add.image(isoPos.x, isoPos.y, 'tile_wall');
							// Offset upward by half the wall extra height so the base aligns
							wallImg.setOrigin(0.5, 1 - (ISO_TILE_HEIGHT / 2) / (ISO_TILE_HEIGHT + WALL_EXTRA_HEIGHT));
							wallImg.setDepth(depth + 1);
							wallPositions.push({ x: isoPos.x, y: isoPos.y, tileX: x, tileY: y });
						}
						break;
					}
				}
			}
		}

		return { wallPositions };
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
