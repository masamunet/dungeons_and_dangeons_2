import { DungeonMap, TileType } from './DungeonMap';
import type { Room } from './DungeonMap';
import { DUNGEON_CONFIG } from '../config/gameConfig';

interface BSPNode {
	x: number;
	y: number;
	width: number;
	height: number;
	left?: BSPNode;
	right?: BSPNode;
	room?: Room;
}

export class DungeonGenerator {
	generate(config = DUNGEON_CONFIG): DungeonMap {
		const map = new DungeonMap(config.width, config.height);

		// Build BSP tree
		const root: BSPNode = { x: 1, y: 1, width: config.width - 2, height: config.height - 2 };
		this.splitNode(root, 0, config.maxDepth, config.minRoomSize);

		// Place rooms in leaf nodes
		this.placeRooms(root, map, config.minRoomSize, config.maxRoomSize);

		// Connect rooms with corridors
		this.connectRooms(root, map, config.corridorWidth);

		// Place stairs in the last room
		if (map.rooms.length >= 2) {
			const lastRoom = map.rooms[map.rooms.length - 1];
			map.setTile(lastRoom.centerX, lastRoom.centerY, TileType.STAIRS_DOWN);
		}

		// Place spawn points
		const startRoom = map.getStartRoom();
		map.spawnPoints.push({
			x: startRoom.centerX,
			y: startRoom.centerY,
			type: 'player',
		});

		// Spawn enemies in rooms (skip start room)
		for (let i = 1; i < map.rooms.length; i++) {
			const room = map.rooms[i];
			const enemyCount = 1 + Math.floor(Math.random() * 3);
			for (let j = 0; j < enemyCount; j++) {
				const ex = room.x + 1 + Math.floor(Math.random() * (room.width - 2));
				const ey = room.y + 1 + Math.floor(Math.random() * (room.height - 2));
				map.spawnPoints.push({ x: ex, y: ey, type: 'enemy', enemyType: 'skeleton' });
			}
		}

		return map;
	}

	private splitNode(node: BSPNode, depth: number, maxDepth: number, minSize: number): void {
		if (depth >= maxDepth) return;
		if (node.width < minSize * 2 + 1 && node.height < minSize * 2 + 1) return;

		const splitH = node.width < node.height
			? true
			: node.height < node.width
				? false
				: Math.random() > 0.5;

		if (splitH) {
			if (node.height < minSize * 2 + 1) return;
			const split = minSize + Math.floor(Math.random() * (node.height - minSize * 2));
			node.left = { x: node.x, y: node.y, width: node.width, height: split };
			node.right = { x: node.x, y: node.y + split, width: node.width, height: node.height - split };
		} else {
			if (node.width < minSize * 2 + 1) return;
			const split = minSize + Math.floor(Math.random() * (node.width - minSize * 2));
			node.left = { x: node.x, y: node.y, width: split, height: node.height };
			node.right = { x: node.x + split, y: node.y, width: node.width - split, height: node.height };
		}

		this.splitNode(node.left, depth + 1, maxDepth, minSize);
		this.splitNode(node.right, depth + 1, maxDepth, minSize);
	}

	private placeRooms(node: BSPNode, map: DungeonMap, minSize: number, maxSize: number): void {
		if (node.left && node.right) {
			this.placeRooms(node.left, map, minSize, maxSize);
			this.placeRooms(node.right, map, minSize, maxSize);
			return;
		}

		// Leaf node - place a room
		const roomW = minSize + Math.floor(Math.random() * Math.min(maxSize - minSize, node.width - minSize));
		const roomH = minSize + Math.floor(Math.random() * Math.min(maxSize - minSize, node.height - minSize));
		const roomX = node.x + Math.floor(Math.random() * (node.width - roomW));
		const roomY = node.y + Math.floor(Math.random() * (node.height - roomH));

		const room: Room = {
			x: roomX,
			y: roomY,
			width: roomW,
			height: roomH,
			centerX: Math.floor(roomX + roomW / 2),
			centerY: Math.floor(roomY + roomH / 2),
		};

		node.room = room;
		map.rooms.push(room);

		// Carve floor tiles
		for (let y = roomY; y < roomY + roomH; y++) {
			for (let x = roomX; x < roomX + roomW; x++) {
				map.setTile(x, y, TileType.FLOOR);
			}
		}
	}

	private connectRooms(node: BSPNode, map: DungeonMap, corridorWidth: number): void {
		if (!node.left || !node.right) return;

		this.connectRooms(node.left, map, corridorWidth);
		this.connectRooms(node.right, map, corridorWidth);

		const roomA = this.getRoom(node.left);
		const roomB = this.getRoom(node.right);
		if (!roomA || !roomB) return;

		this.carveCorridor(map, roomA.centerX, roomA.centerY, roomB.centerX, roomB.centerY, corridorWidth);
	}

	private getRoom(node: BSPNode): Room | null {
		if (node.room) return node.room;
		if (node.left) {
			const room = this.getRoom(node.left);
			if (room) return room;
		}
		if (node.right) {
			return this.getRoom(node.right);
		}
		return null;
	}

	private carveCorridor(map: DungeonMap, x1: number, y1: number, x2: number, y2: number, width: number): void {
		const hw = Math.floor(width / 2);

		// L-shaped corridor: horizontal then vertical
		const midX = x2;
		const midY = y1;

		// Horizontal segment
		const startX = Math.min(x1, midX);
		const endX = Math.max(x1, midX);
		for (let x = startX; x <= endX; x++) {
			for (let dy = -hw; dy <= hw; dy++) {
				if (map.getTile(x, y1 + dy) === TileType.WALL) {
					map.setTile(x, y1 + dy, TileType.CORRIDOR);
				}
			}
		}

		// Vertical segment
		const startY = Math.min(midY, y2);
		const endY = Math.max(midY, y2);
		for (let y = startY; y <= endY; y++) {
			for (let dx = -hw; dx <= hw; dx++) {
				if (map.getTile(x2 + dx, y) === TileType.WALL) {
					map.setTile(x2 + dx, y, TileType.CORRIDOR);
				}
			}
		}
	}
}
