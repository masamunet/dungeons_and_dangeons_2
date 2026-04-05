export class HealthComponent {
	current: number;
	max: number;
	isDead = false;

	private onDamageCallbacks: Array<(damage: number, current: number) => void> = [];
	private onDeathCallbacks: Array<() => void> = [];

	constructor(max: number) {
		this.max = max;
		this.current = max;
	}

	takeDamage(amount: number): void {
		if (this.isDead) return;
		this.current = Math.max(0, this.current - amount);

		for (const cb of this.onDamageCallbacks) {
			cb(amount, this.current);
		}

		if (this.current <= 0) {
			this.isDead = true;
			for (const cb of this.onDeathCallbacks) {
				cb();
			}
		}
	}

	heal(amount: number): void {
		if (this.isDead) return;
		this.current = Math.min(this.max, this.current + amount);
	}

	onDamage(callback: (damage: number, current: number) => void): void {
		this.onDamageCallbacks.push(callback);
	}

	onDeath(callback: () => void): void {
		this.onDeathCallbacks.push(callback);
	}

	getPercent(): number {
		return this.current / this.max;
	}
}
