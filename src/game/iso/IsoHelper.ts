/**
 * Isometric coordinate conversion utilities.
 *
 * The game uses a "staggered isometric" (Diablo 1 style) projection:
 * - Internal game logic runs in cartesian grid space (x, y)
 * - Rendering projects grid positions to isometric screen space
 * - Physics/collision uses cartesian coordinates internally
 *
 * Tile dimensions in isometric space:
 *   ISO_TILE_WIDTH  = 64  (diamond width)
 *   ISO_TILE_HEIGHT = 32  (diamond height, half of width for 2:1 ratio)
 */

export const ISO_TILE_WIDTH = 64;
export const ISO_TILE_HEIGHT = 32;

/** Convert cartesian grid position to isometric screen position */
export function cartToIso(cartX: number, cartY: number): { x: number; y: number } {
	return {
		x: (cartX - cartY) * (ISO_TILE_WIDTH / 2),
		y: (cartX + cartY) * (ISO_TILE_HEIGHT / 2),
	};
}

/** Convert isometric screen position back to cartesian grid position */
export function isoToCart(isoX: number, isoY: number): { x: number; y: number } {
	return {
		x: (isoX / (ISO_TILE_WIDTH / 2) + isoY / (ISO_TILE_HEIGHT / 2)) / 2,
		y: (isoY / (ISO_TILE_HEIGHT / 2) - isoX / (ISO_TILE_WIDTH / 2)) / 2,
	};
}

/** Convert grid tile coordinates to isometric screen pixel position (tile center) */
export function tileToIso(tileX: number, tileY: number): { x: number; y: number } {
	return cartToIso(tileX, tileY);
}

/** Convert cartesian velocity to isometric velocity for visual movement */
export function cartVelocityToIso(vx: number, vy: number): { x: number; y: number } {
	return {
		x: (vx - vy) * 0.5,  // Simplified: ISO_TILE_WIDTH / TILE_SIZE / 2
		y: (vx + vy) * 0.25, // Simplified: ISO_TILE_HEIGHT / TILE_SIZE / 2
	};
}

/**
 * Convert screen input direction to cartesian world direction.
 * When player presses "right" on screen, they should move along the
 * isometric axis (southeast in cartesian terms).
 */
export function screenDirToCart(screenX: number, screenY: number): { x: number; y: number } {
	// Inverse of the isometric projection applied to direction vectors
	// Screen right (1,0) -> cart (1, -1) normalized
	// Screen down  (0,1) -> cart (1,  1) normalized
	const cartX = screenX + screenY;
	const cartY = -screenX + screenY;
	const len = Math.sqrt(cartX * cartX + cartY * cartY);
	if (len === 0) return { x: 0, y: 0 };
	return { x: cartX / len, y: cartY / len };
}

/** Depth value for isometric sorting: objects further "south" in grid are drawn on top */
export function isoDepth(cartX: number, cartY: number, layerOffset = 0): number {
	return (cartX + cartY) * 10 + layerOffset;
}
