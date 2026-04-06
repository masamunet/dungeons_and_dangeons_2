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
		return tile === TileType.FLOOR || tile === TileType.CORRIDOR || tile === TileType.STAIRS_DOWN;
	}

	getStartRoom(): Room {
		return this.rooms[0];
	}

	/**
	 * Check line of sight between two tile coordinates using Bresenham's algorithm.
	 * Returns true if there are no walls between the two points.
	 */
	hasLineOfSight(x0: number, y0: number, x1: number, y1: number): boolean {
		let ix0 = Math.floor(x0);
		let iy0 = Math.floor(y0);
		const ix1 = Math.floor(x1);
		const iy1 = Math.floor(y1);

		const dx = Math.abs(ix1 - ix0);
		const dy = Math.abs(iy1 - iy0);
		const sx = ix0 < ix1 ? 1 : -1;
		const sy = iy0 < iy1 ? 1 : -1;
		let err = dx - dy;

		while (true) {
			// Skip the start tile itself
			if (!(ix0 === Math.floor(x0) && iy0 === Math.floor(y0))) {
				if (!this.isWalkable(ix0, iy0)) return false;
			}
			if (ix0 === ix1 && iy0 === iy1) break;
			const e2 = 2 * err;
			if (e2 > -dy) { err -= dy; ix0 += sx; }
			if (e2 < dx) { err += dx; iy0 += sy; }
		}
		return true;
	}
}
