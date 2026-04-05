import { Scene } from 'phaser';
import { eventBridge, GameEvents } from '$lib/utils/eventBridge';
import { InputManager } from '../input/InputManager';
import { InputAction } from '../input/InputAction';
import { cartToIso, isoDepth, ISO_TILE_WIDTH, ISO_TILE_HEIGHT } from '../iso/IsoHelper';
import { fetchNPCDialogueAsync } from '$lib/utils/geminiClient';

const HUB_WIDTH = 16;
const HUB_HEIGHT = 16;

interface HubNPC {
	name: string;
	role: string;
	tileX: number;
	tileY: number;
	visual: Phaser.GameObjects.Image | null;
	label: Phaser.GameObjects.Text | null;
}

export class HubScene extends Scene {
	private inputManager!: InputManager;
	private playerVisual!: Phaser.GameObjects.Image;
	private playerTileX = 8;
	private playerTileY = 10;
	private playerCartX = 0;
	private playerCartY = 0;
	private playerSpeed = 100;

	private npcs: HubNPC[] = [
		{ name: '鍛冶屋グリゼルダ', role: 'blacksmith', tileX: 4, tileY: 4, visual: null, label: null },
		{ name: '薬師メイラ', role: 'alchemist', tileX: 12, tileY: 4, visual: null, label: null },
		{ name: '掲示板', role: 'quest_board', tileX: 8, tileY: 3, visual: null, label: null },
		{ name: 'ダンジョン入口', role: 'dungeon_entrance', tileX: 8, tileY: 13, visual: null, label: null },
	];

	private interactPrompt: Phaser.GameObjects.Text | null = null;
	private nearbyNPC: HubNPC | null = null;

	constructor() {
		super('HubScene');
	}

	create(): void {
		this.cameras.main.setBackgroundColor('#0a0a15');
		this.inputManager = new InputManager(this);

		this.renderHub();
		this.spawnPlayer();
		this.spawnNPCs();

		// Interact prompt (hidden by default)
		this.interactPrompt = this.add.text(0, 0, '[E] 話す', {
			fontFamily: 'Courier New',
			fontSize: '10px',
			color: '#ffdd88',
			backgroundColor: '#00000088',
			padding: { x: 4, y: 2 },
		}).setOrigin(0.5).setDepth(10000).setVisible(false);

		eventBridge.emit(GameEvents.CURRENT_SCENE_READY, { scene: 'HubScene' });
	}

	private renderHub(): void {
		// Simple cobblestone ground for the hub
		for (let y = 0; y < HUB_HEIGHT; y++) {
			for (let x = 0; x < HUB_WIDTH; x++) {
				const iso = cartToIso(x, y);
				const isEdge = x === 0 || y === 0 || x === HUB_WIDTH - 1 || y === HUB_HEIGHT - 1;
				if (isEdge) {
					// Wall TOP face
					this.add.image(iso.x, iso.y, 'tile_wall_top')
						.setDepth(isoDepth(x, y) + 2);
					// Wall SIDE extrusion
					const sides = this.add.image(iso.x, iso.y, 'tile_wall_sides');
					sides.setOrigin(0.5, (ISO_TILE_HEIGHT / 2) / (ISO_TILE_HEIGHT + 24));
					sides.setDepth(isoDepth(x, y) + 14);
				} else {
					const floorImg = this.add.image(iso.x, iso.y, 'tile_floor');
					floorImg.setDepth(isoDepth(x, y));
				}
			}
		}

		// Ground decorations for NPC areas
		this.addAreaMarker(4, 4, 0x884422, 'Blacksmith');
		this.addAreaMarker(12, 4, 0x228844, 'Alchemy');
		this.addAreaMarker(8, 3, 0x886622, 'Quests');
		this.addAreaMarker(8, 13, 0x442244, 'Dungeon');
	}

	private addAreaMarker(tx: number, ty: number, color: number, _label: string): void {
		const iso = cartToIso(tx, ty);
		const marker = this.add.graphics();
		marker.fillStyle(color, 0.3);
		marker.beginPath();
		marker.moveTo(iso.x, iso.y - ISO_TILE_HEIGHT / 2);
		marker.lineTo(iso.x + ISO_TILE_WIDTH / 2, iso.y);
		marker.lineTo(iso.x, iso.y + ISO_TILE_HEIGHT / 2);
		marker.lineTo(iso.x - ISO_TILE_WIDTH / 2, iso.y);
		marker.closePath();
		marker.fillPath();
		marker.setDepth(isoDepth(tx, ty) + 0.5);
	}

	private spawnPlayer(): void {
		this.playerCartX = this.playerTileX * 32 + 16;
		this.playerCartY = this.playerTileY * 32 + 16;
		const iso = cartToIso(this.playerTileX, this.playerTileY);
		this.playerVisual = this.add.image(iso.x, iso.y, 'player');
		this.playerVisual.setOrigin(0.5, 1.0);
		this.playerVisual.setDepth(isoDepth(this.playerTileX, this.playerTileY, 1));

		this.cameras.main.startFollow(this.playerVisual, true, 0.1, 0.1);
		this.cameras.main.setZoom(2.0);
	}

	private spawnNPCs(): void {
		for (const npc of this.npcs) {
			const iso = cartToIso(npc.tileX, npc.tileY);

			if (npc.role === 'quest_board') {
				// Quest board is a static object
				const g = this.add.graphics();
				g.fillStyle(0x664422);
				g.fillRect(iso.x - 8, iso.y - 16, 16, 16);
				g.fillStyle(0xccaa66);
				g.fillRect(iso.x - 6, iso.y - 14, 12, 12);
				g.setDepth(isoDepth(npc.tileX, npc.tileY, 1));
				npc.visual = this.add.image(iso.x, iso.y, '__DEFAULT') as any; // placeholder
			} else if (npc.role === 'dungeon_entrance') {
				const img = this.add.image(iso.x, iso.y, 'tile_stairs_down');
				img.setDepth(isoDepth(npc.tileX, npc.tileY, 1));
				npc.visual = img;
			} else {
				// NPC sprite (reuse enemy skeleton for now, tinted)
				const img = this.add.image(iso.x, iso.y, 'enemy_skeleton');
				img.setOrigin(0.5, 1.0);
				img.setDepth(isoDepth(npc.tileX, npc.tileY, 1));
				if (npc.role === 'blacksmith') img.setTint(0xff8844);
				if (npc.role === 'alchemist') img.setTint(0x44ff88);
				npc.visual = img;
			}

			// Name label
			npc.label = this.add.text(iso.x, iso.y - 20, npc.name, {
				fontFamily: 'Courier New',
				fontSize: '8px',
				color: '#c4b998',
			}).setOrigin(0.5).setDepth(10000);
		}
	}

	update(_time: number, delta: number): void {
		this.inputManager.update(this);

		this.handleMovement(delta);
		this.checkNPCProximity();
		this.handleInteraction();

		this.inputManager.postUpdate();
	}

	private handleMovement(delta: number): void {
		const move = this.inputManager.getMovementVector();
		if (move.length() < 0.1) return;

		// Convert screen input to cartesian movement
		const cartDx = (move.x + move.y);
		const cartDy = (-move.x + move.y);
		const len = Math.sqrt(cartDx * cartDx + cartDy * cartDy) || 1;

		const speed = this.playerSpeed * (delta / 1000);
		this.playerCartX += (cartDx / len) * speed;
		this.playerCartY += (cartDy / len) * speed;

		// Clamp to hub bounds
		this.playerCartX = Phaser.Math.Clamp(this.playerCartX, 40, (HUB_WIDTH - 1) * 32 - 8);
		this.playerCartY = Phaser.Math.Clamp(this.playerCartY, 40, (HUB_HEIGHT - 1) * 32 - 8);

		// Update visual position
		const tileXFrac = this.playerCartX / 32;
		const tileYFrac = this.playerCartY / 32;
		const iso = cartToIso(tileXFrac, tileYFrac);
		this.playerVisual.setPosition(iso.x, iso.y);
		this.playerVisual.setDepth(isoDepth(tileXFrac, tileYFrac, 1));

		if (move.x < -0.1) this.playerVisual.setFlipX(true);
		else if (move.x > 0.1) this.playerVisual.setFlipX(false);
	}

	private checkNPCProximity(): void {
		const ptx = this.playerCartX / 32;
		const pty = this.playerCartY / 32;
		this.nearbyNPC = null;

		for (const npc of this.npcs) {
			const dx = ptx - npc.tileX;
			const dy = pty - npc.tileY;
			if (dx * dx + dy * dy < 4) { // Within ~2 tiles
				this.nearbyNPC = npc;
				break;
			}
		}

		if (this.nearbyNPC && this.interactPrompt) {
			const iso = cartToIso(this.nearbyNPC.tileX, this.nearbyNPC.tileY);
			this.interactPrompt.setPosition(iso.x, iso.y - 30);
			this.interactPrompt.setVisible(true);
			const promptText = this.nearbyNPC.role === 'dungeon_entrance' ? '[E] 入る' :
				this.nearbyNPC.role === 'quest_board' ? '[E] 確認する' : '[E] 話す';
			this.interactPrompt.setText(promptText);
		} else {
			this.interactPrompt?.setVisible(false);
		}
	}

	private handleInteraction(): void {
		if (!this.nearbyNPC) return;
		if (!this.inputManager.isActionJustPressed(InputAction.INTERACT)) return;

		switch (this.nearbyNPC.role) {
			case 'dungeon_entrance':
				this.cameras.main.fadeOut(500, 0, 0, 0);
				this.cameras.main.once('camerafadeoutcomplete', () => {
					this.scene.start('DungeonScene');
				});
				break;
			case 'quest_board':
				eventBridge.emit('hub-interact', { role: 'quest_board', name: this.nearbyNPC.name });
				break;
			case 'blacksmith':
				fetchNPCDialogueAsync(this.nearbyNPC.name, '鍛冶屋。武器や防具を作る職人。');
				break;
			case 'alchemist':
				fetchNPCDialogueAsync(this.nearbyNPC.name, '薬師。回復薬やポーションを調合する。');
				break;
		}
	}
}
