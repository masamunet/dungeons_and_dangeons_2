import { Scene } from 'phaser';
import { DungeonMap, TileType } from './DungeonMap';
import { tileToIso, isoDepth, ISO_TILE_HEIGHT } from '../iso/IsoHelper';

const WALL_EXTRA_HEIGHT = 24;

interface WallSprites {
	top: Phaser.GameObjects.Image;
	sides: Phaser.GameObjects.Image;
}

export class MapRenderer {
	/** Wall side sprites indexed by "tileX,tileY" for transparency control */
	private wallSides: Map<string, Phaser.GameObjects.Image> = new Map();

	renderMap(scene: Scene, dungeonMap: DungeonMap): void {
		this.wallSides.clear();

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

						// Wall TOP: diamond face, low depth (floor-level)
						const topImg = scene.add.image(isoPos.x, isoPos.y, 'tile_wall_top');
						topImg.setDepth(depth + 2);

						// Wall SIDES: extrusion, high depth to occlude entities behind
						const sidesImg = scene.add.image(isoPos.x, isoPos.y, 'tile_wall_sides');
						// Origin: pin so the diamond area of the texture aligns with the tile position
						// The texture is 64x56. The diamond top area occupies y=0..32, sides occupy y=16..56.
						// We want the center of the diamond (y=16 in texture) at the tile position.
						sidesImg.setOrigin(0.5, (ISO_TILE_HEIGHT / 2) / (ISO_TILE_HEIGHT + WALL_EXTRA_HEIGHT));
						sidesImg.setDepth(depth + 14);

						this.wallSides.set(`${x},${y}`, sidesImg);
						break;
					}
				}
			}
		}
	}

	/**
	 * Diablo 1-style wall transparency: when a wall's side extrusion
	 * could occlude the player, make it semi-transparent.
	 * Only the SIDES become transparent; the top face stays opaque.
	 */
	updateWallTransparency(playerTileX: number, playerTileY: number): void {
		const playerSum = playerTileX + playerTileY;

		for (const [key, sidesImg] of this.wallSides) {
			const [wx, wy] = key.split(',').map(Number);
			const dx = Math.abs(wx - playerTileX);
			const dy = Math.abs(wy - playerTileY);
			const wallSum = wx + wy;

			// Wall is south of player (higher x+y) and close by → its sides could occlude
			if (dx + dy < 3 && wallSum > playerSum && wallSum <= playerSum + 3) {
				sidesImg.setAlpha(0.3);
			} else {
				sidesImg.setAlpha(1.0);
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
