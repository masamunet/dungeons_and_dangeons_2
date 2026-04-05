import { Scene } from 'phaser';
import { DungeonMap, TileType } from './DungeonMap';
import { tileToIso, isoDepth, ISO_TILE_HEIGHT } from '../iso/IsoHelper';

const WALL_EXTRA_HEIGHT = 24;
// Extrusion covers 24 screen px south = 24/16 = 1.5 tiles of depth
const WALL_DEPTH_OFFSET = 15;

export class MapRenderer {
	wallImages: Map<string, Phaser.GameObjects.Image> = new Map();

	renderMap(scene: Scene, dungeonMap: DungeonMap): void {
		this.wallImages.clear();

		for (let y = 0; y < dungeonMap.height; y++) {
			for (let x = 0; x < dungeonMap.width; x++) {
				const tile = dungeonMap.getTile(x, y);
				const isoPos = tileToIso(x, y);
				const depth = isoDepth(x, y);

				switch (tile) {
					case TileType.FLOOR:
						scene.add.image(isoPos.x, isoPos.y, 'tile_floor').setDepth(depth);
						break;
					case TileType.CORRIDOR:
						scene.add.image(isoPos.x, isoPos.y, 'tile_corridor').setDepth(depth);
						break;
					case TileType.STAIRS_DOWN:
						scene.add.image(isoPos.x, isoPos.y, 'tile_stairs_down').setDepth(depth);
						break;
					case TileType.WALL: {
						if (!this.isAdjacentToWalkable(dungeonMap, x, y)) break;

						const wallImg = scene.add.image(isoPos.x, isoPos.y, 'tile_wall');
						// Origin: align diamond top of texture with tile position
						// Texture is 64x56, diamond center is at (32, 16)
						// So originY = 16/56 ≈ 0.286 puts diamond center at tile pos
						wallImg.setOrigin(0.5, 16 / (ISO_TILE_HEIGHT + WALL_EXTRA_HEIGHT));
						// Depth: based on visual bottom of extrusion (~1.5 tiles south)
						wallImg.setDepth(depth + WALL_DEPTH_OFFSET);
						this.wallImages.set(`${x},${y}`, wallImg);
						break;
					}
				}
			}
		}
	}

	/**
	 * Diablo 1-style: walls near the player that could occlude them become transparent.
	 */
	updateWallTransparency(playerTileX: number, playerTileY: number): void {
		const playerSum = playerTileX + playerTileY;

		for (const [key, wallImg] of this.wallImages) {
			const [wx, wy] = key.split(',').map(Number);
			const dx = Math.abs(wx - playerTileX);
			const dy = Math.abs(wy - playerTileY);
			const wallSum = wx + wy;

			// Wall is south of player (higher x+y, closer to camera) and nearby
			// → its extrusion could visually cover the player
			if (dx + dy < 3 && wallSum > playerSum && wallSum <= playerSum + 3) {
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
