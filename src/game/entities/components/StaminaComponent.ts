import { STAMINA_REGEN_RATE, STAMINA_REGEN_DELAY } from '$lib/utils/constants';

export class StaminaComponent {
	current: number;
	max: number;
	isExhausted = false;

	private regenDelay = 0;
	private exhaustionTimer = 0;
	private readonly EXHAUSTION_DURATION = 1500;

	constructor(max: number) {
		this.max = max;
		this.current = max;
	}

	spend(amount: number): boolean {
		if (this.current < amount) return false;
		this.current -= amount;
		this.regenDelay = STAMINA_REGEN_DELAY;

		if (this.current <= 0) {
			this.current = 0;
			this.isExhausted = true;
			this.exhaustionTimer = this.EXHAUSTION_DURATION;
		}

		return true;
	}

	update(delta: number): void {
		if (this.isExhausted) {
			this.exhaustionTimer -= delta;
			if (this.exhaustionTimer <= 0) {
				this.isExhausted = false;
			}
		}

		if (this.regenDelay > 0) {
			this.regenDelay -= delta;
			return;
		}

		if (this.current < this.max) {
			const rate = this.isExhausted ? STAMINA_REGEN_RATE * 0.5 : STAMINA_REGEN_RATE;
			this.current = Math.min(this.max, this.current + rate * (delta / 1000));
		}
	}

	recover(amount: number): void {
		this.current = Math.min(this.max, this.current + amount);
	}

	canSpend(amount: number): boolean {
		return this.current >= amount && !this.isExhausted;
	}

	getPercent(): number {
		return this.current / this.max;
	}
}
