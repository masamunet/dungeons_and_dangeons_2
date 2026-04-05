import { Scene, GameObjects } from 'phaser';
import { TILE_SIZE } from '$lib/utils/constants';
import type { DungeonMap } from '../map/DungeonMap';

const VISION_RADIUS_TILES = 6;

/**
 * Fog of War using two RenderTextures:
 * - exploredRT: persistent layer, tiles are permanently dimly revealed once explored
 * - fogRT: redrawn each frame by compositing exploredRT + player torch
 *
 * This avoids redrawing all explored tiles every frame.
 */
export class FogOfWar {
	private fogRT: GameObjects.RenderTexture;
	private exploredRT: Phaser.GameObjects.RenderTexture;
	private lightBrush: GameObjects.Image;
	private exploredBrush: GameObjects.Image;
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

		const maxTiles = Math.max(dungeonMap.width, dungeonMap.height);
		this.rtWidth = maxTiles * 64 + 512;
		this.rtHeight = maxTiles * 32 + 512;
		this.offsetX = -this.rtWidth / 2;
		this.offsetY = -128;

		// Persistent explored layer (accumulates over time, never cleared)
		this.exploredRT = scene.make.renderTexture({ x: 0, y: 0, width: this.rtWidth, height: this.rtHeight, add: false });
		this.exploredRT.fill(0x000000, 1.0); // Start fully black

		// Visible fog overlay (redrawn each frame)
		this.fogRT = scene.add.renderTexture(this.offsetX, this.offsetY, this.rtWidth, this.rtHeight);
		this.fogRT.setOrigin(0, 0);
		this.fogRT.setDepth(9000);

		// Brushes
		this.lightBrush = this.createBrush(scene, 'fog_torch_brush', 512);
		this.exploredBrush = this.createBrush(scene, 'fog_explored_brush', 128);
	}

	private createBrush(scene: Scene, key: string, size: number): GameObjects.Image {
		if (!scene.textures.exists(key)) {
			const canvas = document.createElement('canvas');
			canvas.width = size;
			canvas.height = size;
			const ctx = canvas.getContext('2d')!;
			const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
			gradient.addColorStop(0, 'rgba(255,255,255,1)');
			gradient.addColorStop(0.3, 'rgba(255,255,255,1)');
			gradient.addColorStop(0.6, 'rgba(255,255,255,0.6)');
			gradient.addColorStop(0.85, 'rgba(255,255,255,0.15)');
			gradient.addColorStop(1, 'rgba(255,255,255,0)');
			ctx.fillStyle = gradient;
			ctx.fillRect(0, 0, size, size);
			scene.textures.addCanvas(key, canvas);
		}
		const img = scene.make.image({ key, add: false });
		img.setBlendMode(Phaser.BlendModes.ERASE);
		return img;
	}

	update(playerCartX: number, playerCartY: number): void {
		const ptx = playerCartX / TILE_SIZE;
		const pty = playerCartY / TILE_SIZE;

		// Mark newly explored tiles and draw them ONCE on the persistent layer
		const r = VISION_RADIUS_TILES;
		const minTX = Math.max(0, Math.floor(ptx - r));
		const maxTX = Math.min(this.dungeonMap.width - 1, Math.ceil(ptx + r));
		const minTY = Math.max(0, Math.floor(pty - r));
		const maxTY = Math.min(this.dungeonMap.height - 1, Math.ceil(pty + r));

		let newExplored = false;
		for (let ty = minTY; ty <= maxTY; ty++) {
			for (let tx = minTX; tx <= maxTX; tx++) {
				const dx = tx - ptx;
				const dy = ty - pty;
				if (dx * dx + dy * dy <= r * r) {
					const key = `${tx},${ty}`;
					if (!this.explored.has(key)) {
						this.explored.add(key);
						newExplored = true;
						// Draw dim reveal on persistent layer (only once per tile)
						const isoX = (tx - ty) * 32;
						const isoY = (tx + ty) * 16;
						this.exploredBrush.setScale(0.6);
						this.exploredBrush.setAlpha(0.4);
						this.exploredRT.draw(this.exploredBrush, isoX - this.offsetX, isoY - this.offsetY);
					}
				}
			}
		}

		// Compose final fog: start from explored state, add player torch
		// Copy exploredRT -> fogRT, then erase player area
		this.fogRT.clear();
		this.fogRT.draw(this.exploredRT, 0, 0);

		// Player torch - erase a large bright circle
		const isoX = (ptx - pty) * 32;
		const isoY = (ptx + pty) * 16;
		const localX = isoX - this.offsetX;
		const localY = isoY - this.offsetY;

		this.lightBrush.setScale(3.0);
		this.lightBrush.setAlpha(1.0);
		this.fogRT.draw(this.lightBrush, localX, localY);
		this.lightBrush.setScale(1.5);
		this.fogRT.draw(this.lightBrush, localX, localY);
	}

	isTileVisible(tileX: number, tileY: number): boolean {
		return this.explored.has(`${Math.floor(tileX)},${Math.floor(tileY)}`);
	}

	isTileInVision(tileX: number, tileY: number, playerCartX: number, playerCartY: number): boolean {
		const ptx = playerCartX / TILE_SIZE;
		const pty = playerCartY / TILE_SIZE;
		const dx = tileX - ptx;
		const dy = tileY - pty;
		return dx * dx + dy * dy <= VISION_RADIUS_TILES * VISION_RADIUS_TILES;
	}

	destroy(): void {
		this.fogRT.destroy();
		this.exploredRT.destroy();
		this.lightBrush.destroy();
		this.exploredBrush.destroy();
	}
}
