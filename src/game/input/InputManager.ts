import type { Scene } from 'phaser';
import { InputAction } from './InputAction';
import type { InputProvider } from './InputProvider';
import { KeyboardProvider } from './KeyboardProvider';
import { GamepadProvider } from './GamepadProvider';
import { eventBridge, GameEvents } from '$lib/utils/eventBridge';

export class InputManager {
	private providers: InputProvider[] = [];
	private gamepadProvider: GamepadProvider;
	private activeDeviceType: 'keyboard' | 'gamepad' = 'keyboard';

	constructor(scene: Scene) {
		this.providers.push(new KeyboardProvider(scene));
		this.gamepadProvider = new GamepadProvider();
		this.providers.push(this.gamepadProvider);
	}

	update(scene: Scene): void {
		for (const provider of this.providers) {
			provider.update(scene);
		}

		// Auto-detect active device based on most recent input
		let newDevice = this.activeDeviceType;
		for (const provider of this.providers) {
			if (provider.hadRecentInput()) {
				newDevice = provider.type;
			}
		}
		if (newDevice !== this.activeDeviceType) {
			this.activeDeviceType = newDevice;
			eventBridge.emit(GameEvents.INPUT_DEVICE_CHANGED, newDevice);
		}
	}

	postUpdate(): void {
		this.gamepadProvider.postUpdate();
	}

	isActionActive(action: InputAction): boolean {
		return this.providers.some((p) => p.isConnected() && p.isActionActive(action));
	}

	isActionJustPressed(action: InputAction): boolean {
		return this.providers.some((p) => p.isConnected() && p.isActionJustPressed(action));
	}

	getMovementVector(): Phaser.Math.Vector2 {
		let x = 0;
		let y = 0;

		for (const provider of this.providers) {
			if (!provider.isConnected()) continue;
			const px = provider.getAxisValue('x');
			const py = provider.getAxisValue('y');
			// Use the provider with the largest magnitude
			if (Math.abs(px) > Math.abs(x)) x = px;
			if (Math.abs(py) > Math.abs(y)) y = py;
		}

		const vec = new Phaser.Math.Vector2(x, y);
		if (vec.length() > 1) vec.normalize();
		return vec;
	}

	getActiveDeviceType(): 'keyboard' | 'gamepad' {
		return this.activeDeviceType;
	}
}
