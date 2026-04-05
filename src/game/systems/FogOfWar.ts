import { Scene, GameObjects } from 'phaser';
import { cartToIso } from '../iso/IsoHelper';
import { TILE_SIZE } from '$lib/utils/constants';
import type { DungeonMap } from '../map/DungeonMap';

const VISION_RADIUS_TILES = 6;
const FOG_ALPHA_UNEXPLORED = 0.95;
const FOG_ALPHA_EXPLORED = 0.6;

/**
 * Fog of War system using per-tile alpha.
 * Three states: unexplored (dark), explored (dim), visible (clear).
 * Uses a RenderTexture for the darkness overlay with a light mask.
 */
export class FogOfWar {
	private fogTiles: Map<string, GameObjects.Image> = new Map();
	private explored: Set<string> = new Set();
	private dungeonMap: DungeonMap;
	private scene: Scene;

	constructor(scene: Scene, dungeonMap: DungeonMap) {
		this.scene = scene;
		this.dungeonMap = dungeonMap;
		this.createFogTiles();
	}

	private createFogTiles(): void {
		// Generate fog texture if not exists
		if (!this.scene.textures.exists('fog_tile')) {
			const g = this.scene.make.graphics({ add: false });
			// Black diamond matching iso tile shape
			g.fillStyle(0x000000);
			g.beginPath();
			g.moveTo(32, 0);
			g.lineTo(64, 16);
			g.lineTo(32, 32);
			g.lineTo(0, 16);
			g.closePath();
			g.fillPath();
			g.generateTexture('fog_tile', 64, 32);
			g.destroy();
		}

		// Place fog over every tile
		for (let y = 0; y < this.dungeonMap.height; y++) {
			for (let x = 0; x < this.dungeonMap.width; x++) {
				const iso = cartToIso(x, y);
				const fog = this.scene.add.image(iso.x, iso.y, 'fog_tile');
				fog.setAlpha(FOG_ALPHA_UNEXPLORED);
				fog.setDepth(9000); // Above everything except HUD
				this.fogTiles.set(`${x},${y}`, fog);
			}
		}
	}

	update(playerCartX: number, playerCartY: number): void {
		const playerTileX = playerCartX / TILE_SIZE;
		const playerTileY = playerCartY / TILE_SIZE;
		const r2 = VISION_RADIUS_TILES * VISION_RADIUS_TILES;

		// Reset all visible tiles to explored state
		for (const [key, fog] of this.fogTiles) {
			if (this.explored.has(key)) {
				fog.setAlpha(FOG_ALPHA_EXPLORED);
			}
		}

		// Reveal tiles in vision radius with line-of-sight
		const minX = Math.max(0, Math.floor(playerTileX - VISION_RADIUS_TILES));
		const maxX = Math.min(this.dungeonMap.width - 1, Math.ceil(playerTileX + VISION_RADIUS_TILES));
		const minY = Math.max(0, Math.floor(playerTileY - VISION_RADIUS_TILES));
		const maxY = Math.min(this.dungeonMap.height - 1, Math.ceil(playerTileY + VISION_RADIUS_TILES));

		for (let y = minY; y <= maxY; y++) {
			for (let x = minX; x <= maxX; x++) {
				const dx = x - playerTileX;
				const dy = y - playerTileY;
				const dist2 = dx * dx + dy * dy;

				if (dist2 <= r2) {
					// Simple ray check for line of sight
					if (this.hasLineOfSight(playerTileX, playerTileY, x, y)) {
						const key = `${x},${y}`;
						const fog = this.fogTiles.get(key);
						if (fog) {
							// Smooth falloff: brighter at center, dimmer at edge
							const distFactor = Math.sqrt(dist2) / VISION_RADIUS_TILES;
							const alpha = Math.max(0, distFactor * 0.4);
							fog.setAlpha(alpha);
							this.explored.add(key);
						}
					}
				}
			}
		}
	}

	private hasLineOfSight(x0: number, y0: number, x1: number, y1: number): boolean {
		// Bresenham-style ray march
		const dx = Math.abs(x1 - x0);
		const dy = Math.abs(y1 - y0);
		const sx = x0 < x1 ? 0.5 : -0.5;
		const sy = y0 < y1 ? 0.5 : -0.5;
		const steps = Math.max(dx, dy) * 2;

		if (steps === 0) return true;

		const stepX = (x1 - x0) / steps;
		const stepY = (y1 - y0) / steps;

		let cx = x0;
		let cy = y0;

		for (let i = 0; i < steps; i++) {
			cx += stepX;
			cy += stepY;

			const tileX = Math.floor(cx);
			const tileY = Math.floor(cy);

			// If we hit a wall before reaching target, no line of sight
			if (!this.dungeonMap.isWalkable(tileX, tileY)) {
				// Allow seeing the wall tile itself
				if (tileX === Math.floor(x1) && tileY === Math.floor(y1)) return true;
				return false;
			}
		}
		return true;
	}

	destroy(): void {
		for (const fog of this.fogTiles.values()) {
			fog.destroy();
		}
		this.fogTiles.clear();
		this.explored.clear();
	}
}
