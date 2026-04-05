import { Scene } from 'phaser';
import { eventBridge, GameEvents } from '$lib/utils/eventBridge';
import { ISO_TILE_WIDTH, ISO_TILE_HEIGHT } from '../iso/IsoHelper';

export class BootScene extends Scene {
	constructor() {
		super('BootScene');
	}

	create(): void {
		this.generateIsoTileTextures();
		this.generatePlayerTexture();
		this.generateEnemyTexture();
		this.generateShadowTexture();

		eventBridge.emit(GameEvents.CURRENT_SCENE_READY, { scene: 'BootScene' });
		this.scene.start('HubScene');
	}

	private generateIsoTileTextures(): void {
		const W = ISO_TILE_WIDTH;
		const H = ISO_TILE_HEIGHT;
		const WALL_HEIGHT = 24; // Vertical height for wall sides

		// --- Floor tile: dark stone diamond ---
		this.makeIsoDiamond('tile_floor', W, H, (g) => {
			// Base fill
			g.fillStyle(0x2a2a3a);
			this.fillDiamond(g, W, H);
			// Border
			g.lineStyle(1, 0x1e1e2e);
			this.strokeDiamond(g, W, H);
			// Stone texture dots
			g.fillStyle(0x222232);
			g.fillRect(W * 0.3, H * 0.35, 2, 1);
			g.fillRect(W * 0.6, H * 0.5, 2, 1);
			g.fillRect(W * 0.4, H * 0.65, 2, 1);
		});

		// --- Corridor tile ---
		this.makeIsoDiamond('tile_corridor', W, H, (g) => {
			g.fillStyle(0x262636);
			this.fillDiamond(g, W, H);
			g.lineStyle(1, 0x1c1c2c);
			this.strokeDiamond(g, W, H);
		});

		// --- Wall block: 3 separate faces ---

		// TOP face (diamond ceiling)
		const wallTopG = this.make.graphics({ add: false });
		wallTopG.fillStyle(0x1a1a28);
		this.fillDiamondAt(wallTopG, 0, 0, W, H);
		wallTopG.lineStyle(1, 0x141422);
		wallTopG.lineBetween(W * 0.25, H * 0.25, W * 0.75, H * 0.25);
		wallTopG.lineBetween(W * 0.25, H * 0.75, W * 0.75, H * 0.75);
		wallTopG.lineStyle(1, 0x0f0f1a);
		this.strokeDiamondAt(wallTopG, 0, 0, W, H);
		wallTopG.generateTexture('wall_top', W, H);
		wallTopG.destroy();

		// LEFT face (south-west face, darker)
		// Parallelogram: left edge of diamond → drops straight down by WALL_HEIGHT
		// Texture size: W/2 x (H/2 + WALL_HEIGHT) = 32 x 40
		// In texture coords: top-left(0,0)=diamond left, top-right(32,16)=diamond bottom
		const LW = W / 2;  // 32
		const LH = H / 2 + WALL_HEIGHT; // 16 + 24 = 40
		const wallLeftG = this.make.graphics({ add: false });
		wallLeftG.fillStyle(0x121220);
		wallLeftG.beginPath();
		wallLeftG.moveTo(0, 0);           // diamond left point
		wallLeftG.lineTo(LW, H / 2);     // diamond bottom point
		wallLeftG.lineTo(LW, H / 2 + WALL_HEIGHT); // bottom-right
		wallLeftG.lineTo(0, WALL_HEIGHT); // bottom-left
		wallLeftG.closePath();
		wallLeftG.fillPath();
		wallLeftG.lineStyle(1, 0x0a0a16);
		wallLeftG.lineBetween(0, WALL_HEIGHT, LW, H / 2 + WALL_HEIGHT);
		wallLeftG.generateTexture('wall_left', LW, LH);
		wallLeftG.destroy();

		// RIGHT face (south-east face, slightly lighter)
		// Texture size: W/2 x (H/2 + WALL_HEIGHT) = 32 x 40
		// In texture coords: top-left(0,16)=diamond bottom, top-right(32,0)=diamond right
		const RW = W / 2;  // 32
		const RH = H / 2 + WALL_HEIGHT; // 40
		const wallRightG = this.make.graphics({ add: false });
		wallRightG.fillStyle(0x18182a);
		wallRightG.beginPath();
		wallRightG.moveTo(0, H / 2);           // diamond bottom point
		wallRightG.lineTo(RW, 0);              // diamond right point
		wallRightG.lineTo(RW, WALL_HEIGHT);    // bottom-right
		wallRightG.lineTo(0, H / 2 + WALL_HEIGHT); // bottom-left
		wallRightG.closePath();
		wallRightG.fillPath();
		wallRightG.lineStyle(1, 0x0a0a16);
		wallRightG.lineBetween(0, H / 2 + WALL_HEIGHT, RW, WALL_HEIGHT);
		wallRightG.generateTexture('wall_right', RW, RH);
		wallRightG.destroy();

		// --- Stairs down tile ---
		this.makeIsoDiamond('tile_stairs_down', W, H, (g) => {
			g.fillStyle(0x2a2a3a);
			this.fillDiamond(g, W, H);
			// Step lines
			g.lineStyle(2, 0x4a3a2a);
			g.lineBetween(W * 0.2, H * 0.4, W * 0.8, H * 0.4);
			g.lineBetween(W * 0.25, H * 0.55, W * 0.75, H * 0.55);
			g.lineBetween(W * 0.3, H * 0.7, W * 0.7, H * 0.7);
			g.lineStyle(1, 0x1e1e2e);
			this.strokeDiamond(g, W, H);
		});
	}

	private generatePlayerTexture(): void {
		const g = this.make.graphics({ add: false });
		const S = 24;

		// Shadow is separate now

		// Body - armored look
		g.fillStyle(0x7a5c14);
		g.fillRect(6, 6, 12, 10);

		// Head
		g.fillStyle(0xdbb878);
		g.fillRect(8, 0, 8, 7);

		// Helmet hint
		g.fillStyle(0x555555);
		g.fillRect(8, 0, 8, 3);

		// Legs
		g.fillStyle(0x3a2a18);
		g.fillRect(7, 15, 4, 6);
		g.fillRect(13, 15, 4, 6);

		// Sword arm
		g.fillStyle(0xaaaaaa);
		g.fillRect(18, 8, 2, 8);

		g.generateTexture('player', S, S);
		g.destroy();
	}

	private generateEnemyTexture(): void {
		const g = this.make.graphics({ add: false });
		const S = 24;

		// Skull
		g.fillStyle(0xccccaa);
		g.fillRect(8, 1, 8, 6);
		g.fillStyle(0x111111);
		g.fillRect(9, 2, 2, 2);
		g.fillRect(13, 2, 2, 2);
		g.fillRect(11, 5, 2, 1); // nose

		// Ribcage
		g.fillStyle(0xbbbb99);
		g.fillRect(6, 7, 12, 7);
		g.fillStyle(0x1a1a2e);
		g.fillRect(8, 8, 2, 4);
		g.fillRect(12, 8, 2, 4);

		// Pelvis + legs
		g.fillStyle(0xaaaa88);
		g.fillRect(7, 14, 10, 2);
		g.fillRect(7, 16, 4, 6);
		g.fillRect(13, 16, 4, 6);

		g.generateTexture('enemy_skeleton', S, S);
		g.destroy();
	}

	private generateShadowTexture(): void {
		const g = this.make.graphics({ add: false });
		g.fillStyle(0x000000, 0.3);
		g.fillEllipse(12, 4, 20, 8);
		g.generateTexture('shadow', 24, 8);
		g.destroy();
	}

	// --- Diamond drawing helpers ---

	private makeIsoDiamond(key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void): void {
		const g = this.make.graphics({ add: false });
		draw(g);
		g.generateTexture(key, w, h);
		g.destroy();
	}

	private fillDiamond(g: Phaser.GameObjects.Graphics, w: number, h: number): void {
		this.fillDiamondAt(g, 0, 0, w, h);
	}

	private fillDiamondAt(g: Phaser.GameObjects.Graphics, ox: number, oy: number, w: number, h: number): void {
		g.beginPath();
		g.moveTo(ox + w / 2, oy);        // top
		g.lineTo(ox + w, oy + h / 2);    // right
		g.lineTo(ox + w / 2, oy + h);    // bottom
		g.lineTo(ox, oy + h / 2);        // left
		g.closePath();
		g.fillPath();
	}

	private strokeDiamond(g: Phaser.GameObjects.Graphics, w: number, h: number): void {
		this.strokeDiamondAt(g, 0, 0, w, h);
	}

	private strokeDiamondAt(g: Phaser.GameObjects.Graphics, ox: number, oy: number, w: number, h: number): void {
		g.beginPath();
		g.moveTo(ox + w / 2, oy);
		g.lineTo(ox + w, oy + h / 2);
		g.lineTo(ox + w / 2, oy + h);
		g.lineTo(ox, oy + h / 2);
		g.closePath();
		g.strokePath();
	}
}
