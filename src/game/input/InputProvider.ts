import type { Scene } from 'phaser';
import type { InputAction } from './InputAction';

export interface InputProvider {
	readonly type: 'keyboard' | 'gamepad';
	update(scene: Scene): void;
	isActionActive(action: InputAction): boolean;
	isActionJustPressed(action: InputAction): boolean;
	getAxisValue(axis: 'x' | 'y'): number;
	isConnected(): boolean;
	hadRecentInput(): boolean;
}
