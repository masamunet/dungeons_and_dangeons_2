import type { Scene } from 'phaser';
import { InputAction } from './InputAction';
import { DEFAULT_GAMEPAD_BINDINGS, GAMEPAD_DEADZONE } from './InputBindings';
import type { InputProvider } from './InputProvider';

export class GamepadProvider implements InputProvider {
	readonly type = 'gamepad' as const;

	private bindings = DEFAULT_GAMEPAD_BINDINGS;
	private pad: Phaser.Input.Gamepad.Gamepad | null = null;
	private recentInput = false;
	private prevButtons: Set<number> = new Set();

	update(scene: Scene): void {
		this.recentInput = false;

		if (!scene.input.gamepad) return;

		// Get first connected gamepad
		this.pad = scene.input.gamepad.getPad(0) ?? null;
		if (!this.pad) return;

		// Check if any button is pressed or stick moved
		const hasButton = this.pad.buttons.some((b) => b.pressed);
		const leftStick = this.pad.leftStick;
		const hasStick =
			Math.abs(leftStick.x) > GAMEPAD_DEADZONE ||
			Math.abs(leftStick.y) > GAMEPAD_DEADZONE;

		this.recentInput = hasButton || hasStick;
	}

	isActionActive(action: InputAction): boolean {
		if (!this.pad) return false;
		const buttonIndices = this.bindings[action];
		if (!buttonIndices) return false;
		return buttonIndices.some((idx) => this.pad!.buttons[idx]?.pressed === true);
	}

	isActionJustPressed(action: InputAction): boolean {
		if (!this.pad) return false;
		const buttonIndices = this.bindings[action];
		if (!buttonIndices) return false;

		return buttonIndices.some((idx) => {
			const pressed = this.pad!.buttons[idx]?.pressed === true;
			const wasPressed = this.prevButtons.has(idx);
			return pressed && !wasPressed;
		});
	}

	/** Call at end of frame to snapshot button state for just-pressed detection */
	postUpdate(): void {
		this.prevButtons.clear();
		if (!this.pad) return;
		this.pad.buttons.forEach((b, idx) => {
			if (b.pressed) this.prevButtons.add(idx);
		});
	}

	getAxisValue(axis: 'x' | 'y'): number {
		if (!this.pad) return 0;

		const leftStick = this.pad.leftStick;
		const raw = axis === 'x' ? leftStick.x : leftStick.y;

		// Apply deadzone
		if (Math.abs(raw) < GAMEPAD_DEADZONE) return 0;

		// Also check d-pad as digital input
		if (axis === 'x') {
			const dLeft = this.isActionActive(InputAction.MOVE_LEFT) ? -1 : 0;
			const dRight = this.isActionActive(InputAction.MOVE_RIGHT) ? 1 : 0;
			const digital = dLeft + dRight;
			return digital !== 0 ? digital : raw;
		}

		const dUp = this.isActionActive(InputAction.MOVE_UP) ? -1 : 0;
		const dDown = this.isActionActive(InputAction.MOVE_DOWN) ? 1 : 0;
		const digital = dUp + dDown;
		return digital !== 0 ? digital : raw;
	}

	isConnected(): boolean {
		return this.pad !== null;
	}

	hadRecentInput(): boolean {
		return this.recentInput;
	}
}
