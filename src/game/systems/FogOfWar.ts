import { Scene, GameObjects } from 'phaser';
import { TILE_SIZE } from '$lib/utils/constants';
import type { DungeonMap } from '../map/DungeonMap';

const VISION_RADIUS_TILES = 6;

/**
 * Fog of War using a single RenderTexture overlay.
 * A large black texture covers the map. Each frame, we "erase" a circular
 * area around the player to reveal the dungeon. Previously explored areas
 * remain partially revealed.
 *
 * This avoids the per-tile diamond artifacts of the previous approach.
 */
export class FogOfWar {
	private fogRT: GameObjects.RenderTexture;
	private lightBrush: GameObjects.Image;
	private explored: Set<string> = new Set();
	private dungeonMap: DungeonMap;
	private scene: Scene;
	private rtWidth: number;
	private rtHeight: number;
	private offsetX: number;
	private offsetY: number;

	constructor(scene: Scene, dungeonMap: DungeonMap) {
		this.scene = scene;
		this.dungeonMap = dungeonMap;

		// Calculate the isometric extent of the map for RT sizing
		// Use a generous bounding box
		const maxTiles = Math.max(dungeonMap.width, dungeonMap.height);
		this.rtWidth = maxTiles * 64 + 512;
		this.rtHeight = maxTiles * 32 + 512;
		this.offsetX = -this.rtWidth / 2;
		this.offsetY = -128;

		// Create the RenderTexture filled with black
		this.fogRT = scene.add.renderTexture(
			this.offsetX, this.offsetY,
			this.rtWidth, this.rtHeight
		);
		this.fogRT.setOrigin(0, 0);
		this.fogRT.setDepth(9000);
		this.fogRT.fill(0x000000, 0.88);
		this.fogRT.setScrollFactor(1);

		// Create a radial gradient brush for erasing fog
		this.lightBrush = this.createLightBrush(scene);
	}

	private createLightBrush(scene: Scene): GameObjects.Image {
		const key = 'fog_light_brush';
		if (!scene.textures.exists(key)) {
			const size = 512;
			const canvas = document.createElement('canvas');
			canvas.width = size;
			canvas.height = size;
			const ctx = canvas.getContext('2d')!;

			const gradient = ctx.createRadialGradient(
				size / 2, size / 2, 0,
				size / 2, size / 2, size / 2
			);
			gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
			gradient.addColorStop(0.3, 'rgba(255, 255, 255, 1.0)');
			gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.6)');
			gradient.addColorStop(0.85, 'rgba(255, 255, 255, 0.15)');
			gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

			ctx.fillStyle = gradient;
			ctx.fillRect(0, 0, size, size);

			scene.textures.addCanvas(key, canvas);
		}

		const brush = scene.make.image({ key, add: false });
		brush.setBlendMode(Phaser.BlendModes.ERASE);
		return brush;
	}

	update(playerCartX: number, playerCartY: number): void {
		const playerTileX = playerCartX / TILE_SIZE;
		const playerTileY = playerCartY / TILE_SIZE;

		// Get the player's isometric screen position
		const isoX = (playerTileX - playerTileY) * 32; // ISO_TILE_WIDTH / 2
		const isoY = (playerTileX + playerTileY) * 16; // ISO_TILE_HEIGHT / 2

		// Convert to RT-local coordinates
		const localX = isoX - this.offsetX;
		const localY = isoY - this.offsetY;

		// Mark nearby tiles as explored (persistent dim reveal)
		const r = VISION_RADIUS_TILES;
		const minTX = Math.max(0, Math.floor(playerTileX - r));
		const maxTX = Math.min(this.dungeonMap.width - 1, Math.ceil(playerTileX + r));
		const minTY = Math.max(0, Math.floor(playerTileY - r));
		const maxTY = Math.min(this.dungeonMap.height - 1, Math.ceil(playerTileY + r));

		for (let ty = minTY; ty <= maxTY; ty++) {
			for (let tx = minTX; tx <= maxTX; tx++) {
				const dx = tx - playerTileX;
				const dy = ty - playerTileY;
				if (dx * dx + dy * dy <= r * r) {
					this.explored.add(`${tx},${ty}`);
				}
			}
		}

		// Clear and redraw the fog each frame
		this.fogRT.clear();
		this.fogRT.fill(0x000000, 0.85);

		// Dim reveal for explored areas
		this.lightBrush.setScale(0.6);
		this.lightBrush.setAlpha(0.5);
		for (const key of this.explored) {
			const [tx, ty] = key.split(',').map(Number);
			const tIsoX = (tx - ty) * 32;
			const tIsoY = (tx + ty) * 16;
			this.fogRT.draw(this.lightBrush, tIsoX - this.offsetX, tIsoY - this.offsetY);
		}

		// Bright torch around player - multiple passes for stronger erase
		this.lightBrush.setScale(3.0);
		this.lightBrush.setAlpha(1.0);
		this.fogRT.draw(this.lightBrush, localX, localY);
		// Second pass for brighter center
		this.lightBrush.setScale(1.5);
		this.fogRT.draw(this.lightBrush, localX, localY);
	}

	/** Check if a tile is currently within the player's visible radius */
	isTileVisible(tileX: number, tileY: number): boolean {
		// Simple distance check — called from DungeonScene for enemy visibility
		return this.explored.has(`${Math.floor(tileX)},${Math.floor(tileY)}`);
	}

	/** More precise: is the tile in the CURRENT vision (not just explored)? */
	isTileInVision(tileX: number, tileY: number, playerCartX: number, playerCartY: number): boolean {
		const ptx = playerCartX / TILE_SIZE;
		const pty = playerCartY / TILE_SIZE;
		const dx = tileX - ptx;
		const dy = tileY - pty;
		return dx * dx + dy * dy <= VISION_RADIUS_TILES * VISION_RADIUS_TILES;
	}

	destroy(): void {
		this.fogRT.destroy();
		this.lightBrush.destroy();
	}
}
