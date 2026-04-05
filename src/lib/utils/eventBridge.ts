import { Events } from 'phaser';

export const eventBridge = new Events.EventEmitter();

// Event name constants
export const GameEvents = {
	PLAYER_HEALTH_CHANGED: 'player-health-changed',
	PLAYER_STAMINA_CHANGED: 'player-stamina-changed',
	PLAYER_DIED: 'player-died',
	CURRENT_SCENE_READY: 'current-scene-ready',
	PAUSE_REQUESTED: 'pause-requested',
	RESUME_REQUESTED: 'resume-requested',
	MINIMAP_DATA_UPDATED: 'minimap-data-updated',
	DUNGEON_FLOOR_CHANGED: 'dungeon-floor-changed',
	INPUT_DEVICE_CHANGED: 'input-device-changed',
	FLAVOR_TEXT_RECEIVED: 'flavor-text-received',
	ENEMY_KILLED: 'enemy-killed',
} as const;
