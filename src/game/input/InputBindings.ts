import { InputAction } from './InputAction';

export const DEFAULT_KEYBOARD_BINDINGS: Record<InputAction, string[]> = {
	[InputAction.MOVE_UP]: ['W', 'UP'],
	[InputAction.MOVE_DOWN]: ['S', 'DOWN'],
	[InputAction.MOVE_LEFT]: ['A', 'LEFT'],
	[InputAction.MOVE_RIGHT]: ['D', 'RIGHT'],
	[InputAction.ATTACK]: ['J', 'SPACE'],
	[InputAction.DODGE]: ['K', 'SHIFT'],
	[InputAction.INTERACT]: ['E'],
	[InputAction.PAUSE]: ['ESC'],
	[InputAction.INVENTORY]: ['I', 'TAB'],
};

// Standard Gamepad button indices (Gamepad API standard mapping)
// 0=South(A/Cross), 1=East(B/Circle), 2=West(X/Square), 3=North(Y/Triangle)
// 4=L1, 5=R1, 6=L2, 7=R2, 8=Select, 9=Start, 10=L3, 11=R3
// 12=DPadUp, 13=DPadDown, 14=DPadLeft, 15=DPadRight
export const DEFAULT_GAMEPAD_BINDINGS: Record<InputAction, number[]> = {
	[InputAction.MOVE_UP]: [12],     // D-pad up
	[InputAction.MOVE_DOWN]: [13],   // D-pad down
	[InputAction.MOVE_LEFT]: [14],   // D-pad left
	[InputAction.MOVE_RIGHT]: [15],  // D-pad right
	[InputAction.ATTACK]: [0],       // A / Cross
	[InputAction.DODGE]: [1],        // B / Circle
	[InputAction.INTERACT]: [3],     // Y / Triangle
	[InputAction.PAUSE]: [9],        // Start
	[InputAction.INVENTORY]: [8],    // Select/Back
};

export const GAMEPAD_DEADZONE = 0.15;
