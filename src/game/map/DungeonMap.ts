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
}
