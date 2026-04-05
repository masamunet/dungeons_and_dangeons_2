import type { Scene } from 'phaser';
import { InputAction } from './InputAction';
import { DEFAULT_KEYBOARD_BINDINGS } from './InputBindings';
import type { InputProvider } from './InputProvider';

export class KeyboardProvider implements InputProvider {
	readonly type = 'keyboard' as const;

	private keys: Map<string, Phaser.Input.Keyboard.Key> = new Map();
	private bindings = DEFAULT_KEYBOARD_BINDINGS;
	private recentInput = false;

	constructor(scene: Scene) {
		if (!scene.input.keyboard) return;

		const allKeys = new Set<string>();
		for (const keys of Object.values(this.bindings)) {
			for (const key of keys) {
				allKeys.add(key);
			}
		}

		for (const keyName of allKeys) {
			const keyCode = Phaser.Input.Keyboard.KeyCodes[keyName as keyof typeof Phaser.Input.Keyboard.KeyCodes];
			if (keyCode !== undefined) {
				this.keys.set(keyName, scene.input.keyboard.addKey(keyCode, false));
			}
		}
	}

	update(_scene: Scene): void {
		this.recentInput = false;
		for (const key of this.keys.values()) {
			if (key.isDown) {
				this.recentInput = true;
				break;
			}
		}
	}

	isActionActive(action: InputAction): boolean {
		const keyNames = this.bindings[action];
		if (!keyNames) return false;
		return keyNames.some((name) => this.keys.get(name)?.isDown === true);
	}

	isActionJustPressed(action: InputAction): boolean {
		const keyNames = this.bindings[action];
		if (!keyNames) return false;
		return keyNames.some((name) => {
			const key = this.keys.get(name);
			return key ? Phaser.Input.Keyboard.JustDown(key) : false;
		});
	}

	getAxisValue(axis: 'x' | 'y'): number {
		if (axis === 'x') {
			const left = this.isActionActive(InputAction.MOVE_LEFT) ? -1 : 0;
			const right = this.isActionActive(InputAction.MOVE_RIGHT) ? 1 : 0;
			return left + right;
		}
		const up = this.isActionActive(InputAction.MOVE_UP) ? -1 : 0;
		const down = this.isActionActive(InputAction.MOVE_DOWN) ? 1 : 0;
		return up + down;
	}

	isConnected(): boolean {
		return true;
	}

	hadRecentInput(): boolean {
		return this.recentInput;
	}
}
