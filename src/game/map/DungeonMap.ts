export enum TileType {
	VOID = -1,
	WALL = 0,
	FLOOR = 1,
	CORRIDOR = 2,
	DOOR = 3,
	STAIRS_DOWN = 4,
}

export interface SpawnPoint {
	x: number;
	y: number;
	type: 'player' | 'enemy';
	enemyType?: string;
}

export interface Room {
	x: number;
	y: number;
	width: number;
	height: number;
	centerX: number;
	centerY: number;
}

export class DungeonMap {
	tiles: TileType[][];
	rooms: Room[] = [];
	spawnPoints: SpawnPoint[] = [];
	width: number;
	height: number;

	constructor(width: number, height: number) {
		this.width = width;
		this.height = height;
		this.tiles = Array.from({ length: height }, () =>
			Array.from({ length: width }, () => TileType.WALL)
		);
	}

	setTile(x: number, y: number, type: TileType): void {
		if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
			this.tiles[y][x] = type;
		}
	}

	getTile(x: number, y: number): TileType {
		if (x < 0 || x >= this.width || y < 0 || y >= this.height) return TileType.WALL;
		return this.tiles[y][x];
	}

	isWalkable(x: number, y: number): boolean {
		const tile = this.getTile(x, y);
		return tile === TileType.FLOOR || tile === TileType.CORRIDOR || tile === TileType.DOOR || tile === TileType.STAIRS_DOWN;
	}

	getStartRoom(): Room {
		return this.rooms[0];
	}

	/**
	 * Check line of sight between two tile coordinates using Bresenham's algorithm.
	 * Returns true if there are no walls between the two points.
	 * Skips both start and end tiles (entities may stand adjacent to walls).
	 */
	hasLineOfSight(x0: number, y0: number, x1: number, y1: number): boolean {
		const startTileX = Math.floor(x0);
		const startTileY = Math.floor(y0);
		const ix1 = Math.floor(x1);
		const iy1 = Math.floor(y1);
		let ix0 = startTileX;
		let iy0 = startTileY;

		const dx = Math.abs(ix1 - ix0);
		const dy = Math.abs(iy1 - iy0);
		const sx = ix0 < ix1 ? 1 : -1;
		const sy = iy0 < iy1 ? 1 : -1;
		let err = dx - dy;

		while (true) {
			// Skip start and end tiles (entities may be at wall edges)
			const isStart = ix0 === startTileX && iy0 === startTileY;
			const isEnd = ix0 === ix1 && iy0 === iy1;
			if (!isStart && !isEnd) {
				if (!this.isWalkable(ix0, iy0)) return false;
			}
			if (isEnd) break;
			const e2 = 2 * err;
			const stepX = e2 > -dy;
			const stepY = e2 < dx;
			// Diagonal step: check both intermediate tiles to prevent corner cutting
			if (stepX && stepY) {
				if (!this.isWalkable(ix0 + sx, iy0) && !this.isWalkable(ix0, iy0 + sy)) {
					return false; // Both adjacent tiles are walls — blocked diagonal
				}
			}
			if (stepX) { err -= dy; ix0 += sx; }
			if (stepY) { err += dx; iy0 += sy; }
		}
		return true;
	}
}
