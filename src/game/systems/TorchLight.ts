import { Scene, GameObjects } from 'phaser';

/**
 * A flickering torch light effect around the player.
 * Uses a radial gradient texture that follows the player visual.
 */
export class TorchLight {
	private light: GameObjects.Image;
	private flickerTimer = 0;
	private baseScale = 1.0;

	constructor(scene: Scene) {
		// Generate radial gradient texture
		if (!scene.textures.exists('torch_light')) {
			const size = 256;
			const canvas = document.createElement('canvas');
			canvas.width = size;
			canvas.height = size;
			const ctx = canvas.getContext('2d')!;

			const gradient = ctx.createRadialGradient(
				size / 2, size / 2, 0,
				size / 2, size / 2, size / 2
			);
			gradient.addColorStop(0, 'rgba(255, 200, 100, 0.15)');
			gradient.addColorStop(0.3, 'rgba(255, 150, 50, 0.08)');
			gradient.addColorStop(0.6, 'rgba(200, 100, 20, 0.03)');
			gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

			ctx.fillStyle = gradient;
			ctx.fillRect(0, 0, size, size);

			scene.textures.addCanvas('torch_light', canvas);
		}

		this.light = scene.add.image(0, 0, 'torch_light');
		this.light.setBlendMode(Phaser.BlendModes.ADD);
		this.light.setDepth(9050); // Between fog (9000) and entities (9100+)
		this.light.setScale(2.0);
	}

	update(x: number, y: number, delta: number): void {
		this.light.setPosition(x, y);

		// Flicker effect
		this.flickerTimer += delta;
		const flicker = Math.sin(this.flickerTimer * 0.005) * 0.05
			+ Math.sin(this.flickerTimer * 0.013) * 0.03
			+ Math.sin(this.flickerTimer * 0.029) * 0.02;

		this.light.setScale(2.0 + flicker);
		this.light.setAlpha(0.8 + flicker * 2);
	}

	destroy(): void {
		this.light.destroy();
	}
}
