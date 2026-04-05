import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { DungeonScene } from './scenes/DungeonScene';
import { GAME_WIDTH, GAME_HEIGHT, GAME_BG_COLOR } from '$lib/utils/constants';

export function StartGame(parent: string | HTMLElement): Phaser.Game {
	const config: Phaser.Types.Core.GameConfig = {
		type: Phaser.AUTO,
		width: GAME_WIDTH,
		height: GAME_HEIGHT,
		parent,
		backgroundColor: GAME_BG_COLOR,
		pixelArt: true,
		physics: {
			default: 'arcade',
			arcade: {
				gravity: { x: 0, y: 0 },
				debug: false,
			},
		},
		scale: {
			mode: Phaser.Scale.FIT,
			autoCenter: Phaser.Scale.CENTER_BOTH,
		},
		input: {
			gamepad: true,
		},
		scene: [BootScene, DungeonScene],
	};

	return new Phaser.Game(config);
}
