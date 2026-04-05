import { Scene, Tilemaps } from 'phaser';
import { DungeonMap, TileType } from './DungeonMap';
import { TILE_SIZE } from '$lib/utils/constants';

export class MapRenderer {
	createTilemap(scene: Scene, dungeonMap: DungeonMap): Tilemaps.Tilemap {
		const mapData = new Tilemaps.MapData({
			width: dungeonMap.width,
			height: dungeonMap.height,
			tileWidth: TILE_SIZE,
			tileHeight: TILE_SIZE,
		});

		const tilemap = new Tilemaps.Tilemap(scene, mapData);

		// Create a tileset from generated textures - use a canvas-based approach
		// We'll use simple sprites for each tile instead of a tilemap for flexibility with generated textures
		const groundLayer = scene.add.group();
		const wallLayer = scene.add.group();

		for (let y = 0; y < dungeonMap.height; y++) {
			for (let x = 0; x < dungeonMap.width; x++) {
				const tile = dungeonMap.getTile(x, y);
				const px = x * TILE_SIZE + TILE_SIZE / 2;
				const py = y * TILE_SIZE + TILE_SIZE / 2;

				switch (tile) {
					case TileType.FLOOR:
						groundLayer.add(scene.add.image(px, py, 'tile_floor').setDepth(0));
						break;
					case TileType.CORRIDOR:
						groundLayer.add(scene.add.image(px, py, 'tile_corridor').setDepth(0));
						break;
					case TileType.STAIRS_DOWN:
						groundLayer.add(scene.add.image(px, py, 'tile_stairs_down').setDepth(0));
						break;
					case TileType.WALL: {
						// Only render walls adjacent to walkable tiles (visible walls)
						if (this.isAdjacentToWalkable(dungeonMap, x, y)) {
							wallLayer.add(scene.add.image(px, py, 'tile_wall').setDepth(1));
						}
						break;
					}
				}
			}
		}

		return tilemap;
	}

	createCollisionBodies(scene: Scene, dungeonMap: DungeonMap): Phaser.Physics.Arcade.StaticGroup {
		const walls = scene.physics.add.staticGroup();

		for (let y = 0; y < dungeonMap.height; y++) {
			for (let x = 0; x < dungeonMap.width; x++) {
				if (!dungeonMap.isWalkable(x, y)) {
					// Only add collision for walls near walkable tiles
					if (this.isAdjacentToWalkable(dungeonMap, x, y)) {
						const wall = walls.create(
							x * TILE_SIZE + TILE_SIZE / 2,
							y * TILE_SIZE + TILE_SIZE / 2,
							'tile_wall'
						) as Phaser.Physics.Arcade.Sprite;
						wall.setVisible(true);
						wall.setDepth(1);
						wall.refreshBody();
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
}
