# Phase 1 Implementation Plan: Dungeons & Dangeons 2

**Browser-based Diablo 1-style Action RPG**
**Tech Stack**: SvelteKit + Phaser 3 + TailwindCSS + TypeScript

---

## Table of Contents

1. [Directory Structure](#1-directory-structure)
2. [Key Files & Responsibilities](#2-key-files--responsibilities)
3. [Core System Designs](#3-core-system-designs)
4. [Phaser 3 / SvelteKit Integration](#4-phaser-3--sveltekit-integration)
5. [Gemini API Proxy Route Design](#5-gemini-api-proxy-route-design)
6. [Implementation Order](#6-implementation-order)
7. [Technical Decisions & Rationale](#7-technical-decisions--rationale)

---

## 1. Directory Structure

```
dungeons_and_dangeons_2/
├── src/
│   ├── app.html                          # SvelteKit shell HTML
│   ├── app.css                           # TailwindCSS directives (@tailwind base/components/utilities)
│   ├── app.d.ts                          # SvelteKit type augmentations
│   │
│   ├── lib/
│   │   ├── components/                   # Svelte UI components (non-game)
│   │   │   ├── hud/
│   │   │   │   ├── HealthBar.svelte
│   │   │   │   ├── StaminaBar.svelte
│   │   │   │   ├── Minimap.svelte
│   │   │   │   └── HudOverlay.svelte     # Composite HUD container
│   │   │   ├── menus/
│   │   │   │   ├── MainMenu.svelte
│   │   │   │   ├── PauseMenu.svelte
│   │   │   │   └── GameOverScreen.svelte
│   │   │   └── PhaserGame.svelte         # Phaser <-> Svelte bridge component
│   │   │
│   │   ├── stores/                       # Svelte stores for UI state
│   │   │   ├── gameState.ts              # Player HP/stamina/level reactive state
│   │   │   ├── uiState.ts               # Menu open/closed, screen transitions
│   │   │   └── inputState.ts            # Last-used device type (for UI icon switching)
│   │   │
│   │   └── utils/                        # Shared utilities
│   │       ├── eventBridge.ts            # Phaser EventEmitter for Svelte <-> Phaser comms
│   │       └── constants.ts              # Shared constants (tile sizes, game dimensions)
│   │
│   ├── routes/
│   │   ├── +layout.svelte               # Root layout (TailwindCSS, global providers)
│   │   ├── +layout.ts                   # Disable SSR: export const ssr = false
│   │   ├── +page.svelte                 # Main game page (mounts PhaserGame + HUD)
│   │   └── api/
│   │       └── gemini/
│   │           └── +server.ts           # Gemini Flash 2.5 proxy endpoint
│   │
│   └── game/                            # === ALL PHASER ENGINE CODE ===
│       ├── main.ts                      # Phaser.Game config & StartGame() factory
│       │
│       ├── scenes/
│       │   ├── BootScene.ts             # Asset loading, system init
│       │   ├── PreloaderScene.ts        # Loading screen, progress bar
│       │   ├── DungeonScene.ts          # Main gameplay scene
│       │   └── UIScene.ts              # Phaser-side HUD elements (damage numbers, effects)
│       │
│       ├── input/
│       │   ├── InputAction.ts           # Enum of all game actions
│       │   ├── InputProvider.ts         # Abstract InputProvider interface
│       │   ├── KeyboardProvider.ts      # Keyboard implementation
│       │   ├── GamepadProvider.ts       # Gamepad implementation
│       │   ├── InputManager.ts          # Aggregates providers, polls & emits actions
│       │   └── InputBindings.ts         # Default key/button -> action mappings
│       │
│       ├── entities/
│       │   ├── Entity.ts               # Base entity (position, health, sprite)
│       │   ├── Player.ts               # Player character
│       │   ├── Enemy.ts                # Base enemy
│       │   ├── enemies/
│       │   │   ├── Skeleton.ts          # Skeleton enemy type
│       │   │   └── Slime.ts            # Slime enemy type
│       │   └── components/             # Entity component mixins
│       │       ├── HealthComponent.ts
│       │       ├── StaminaComponent.ts
│       │       ├── CombatComponent.ts
│       │       └── MovementComponent.ts
│       │
│       ├── combat/
│       │   ├── CombatSystem.ts          # Damage calc, hitbox management
│       │   ├── AttackData.ts            # Attack definitions (damage, range, windup, recovery)
│       │   ├── DodgeSystem.ts           # Roll/dodge with i-frames
│       │   └── HitboxManager.ts         # Collision zones for attacks
│       │
│       ├── map/
│       │   ├── DungeonGenerator.ts      # BSP or drunkard-walk procedural generation
│       │   ├── TileRegistry.ts          # Tile type definitions and properties
│       │   ├── DungeonMap.ts            # Runtime map data structure
│       │   └── MapRenderer.ts           # Phaser tilemap creation from DungeonMap
│       │
│       ├── ai/
│       │   ├── AIBehavior.ts            # Base AI behavior interface
│       │   ├── ChaseState.ts            # Chase player state
│       │   ├── PatrolState.ts           # Patrol area state
│       │   ├── AttackState.ts           # Attack engagement state
│       │   └── StateMachine.ts          # Generic FSM for AI
│       │
│       ├── systems/
│       │   ├── AnimationSystem.ts       # Sprite animation management
│       │   └── CameraSystem.ts          # Camera follow, screen shake, bounds
│       │
│       └── config/
│           ├── gameConfig.ts            # Game balance constants
│           ├── tileConfig.ts            # Tile dimensions, sprite mappings
│           └── enemyConfig.ts           # Enemy stat tables
│
├── static/
│   └── assets/
│       ├── sprites/                     # Character/enemy spritesheets
│       ├── tiles/                       # Tileset images
│       ├── ui/                          # HUD/menu art
│       └── audio/                       # SFX and music
│
├── svelte.config.js
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 2. Key Files & Responsibilities

### 2.1 SvelteKit Shell

**`src/routes/+layout.ts`**
```typescript
// Disable SSR globally - Phaser requires browser APIs
export const ssr = false;
```
Phaser accesses `window`, `document`, and `canvas` directly. SSR must be disabled at the layout level so the entire app is client-rendered.

**`src/routes/+page.svelte`**
- Mounts `<PhaserGame>` component
- Overlays `<HudOverlay>` (Svelte/Tailwind) on top of the canvas
- Manages menu state transitions (main menu -> gameplay -> pause -> game over)
- Listens to `eventBridge` for game state changes to update Svelte stores

**`src/lib/components/PhaserGame.svelte`**
- Creates a `<div id="game-container">` for Phaser to attach to
- Calls `StartGame(container)` in `onMount`
- Stores Phaser.Game reference for cleanup in `onDestroy`
- Exports a typed reference `{ game: Phaser.Game | null; scene: Phaser.Scene | null }`
- Listens to `eventBridge` for `current-scene-ready` to track active scene

**`src/lib/utils/eventBridge.ts`**
```typescript
import { Events } from 'phaser';
export const eventBridge = new Events.EventEmitter();
```
Central communication bus between Phaser scenes and Svelte components. Events include:
- `player-health-changed` (HP updates for HUD)
- `player-stamina-changed` (stamina for HUD)
- `player-died` (trigger game over screen)
- `current-scene-ready` (scene lifecycle)
- `pause-requested` / `resume-requested` (menu control)
- `minimap-data-updated` (dungeon reveal state)

**`src/lib/stores/gameState.ts`**
```typescript
import { writable } from 'svelte/store';

export const playerHealth = writable({ current: 100, max: 100 });
export const playerStamina = writable({ current: 100, max: 100 });
export const playerLevel = writable(1);
export const dungeonFloor = writable(1);
export const minimapData = writable<number[][]>([]);
```
Svelte stores driven by eventBridge events. The HUD components subscribe to these reactively.

### 2.2 Phaser Game Core

**`src/game/main.ts`**
Factory function that creates the Phaser.Game instance:
```typescript
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 960,
  height: 640,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  pixelArt: true,          // Critical for Diablo 1 aesthetic
  physics: {
    default: 'arcade',     // Arcade physics for movement/collision
    arcade: {
      gravity: { x: 0, y: 0 },   // Top-down, no gravity
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  input: {
    gamepad: true           // Enable gamepad from boot
  },
  scene: [BootScene, PreloaderScene, DungeonScene, UIScene]
};

export function StartGame(parent: string | HTMLElement): Phaser.Game {
  return new Phaser.Game({ ...config, parent });
}
```

Key decisions:
- `pixelArt: true` enables nearest-neighbor scaling (essential for retro style)
- Arcade physics is sufficient for Phase 1 (top-down movement, overlap detection)
- `Phaser.Scale.FIT` makes the game responsive within its container
- Gamepad input enabled in config from the start

### 2.3 Scene Breakdown

**`BootScene.ts`** - Runs first. Loads the absolute minimum assets needed for the preloader (loading bar sprites, fonts). Initializes the InputManager singleton. Transitions to PreloaderScene.

**`PreloaderScene.ts`** - Loads all game assets (spritesheets, tilemaps, audio). Shows a loading progress bar. Transitions to DungeonScene when complete.

**`DungeonScene.ts`** - The main gameplay scene. Responsibilities:
- Generates dungeon via DungeonGenerator
- Creates tilemap via MapRenderer
- Spawns Player and Enemy entities
- Runs the game loop (input polling -> entity updates -> combat resolution -> rendering)
- Manages physics groups and collisions
- Emits state changes to eventBridge

**`UIScene.ts`** - Runs in parallel with DungeonScene (launched, not started). Handles Phaser-rendered HUD elements that must be pixel-synced with gameplay: damage number popups, hit flash effects, enemy health bars above sprites. Keeps these separate from the main scene's camera.

---

## 3. Core System Designs

### 3.1 Input System

The input system is the most architecturally critical piece. It must be a first-class abstraction that makes gamepad and keyboard indistinguishable to gameplay code.

**`InputAction.ts`** - Defines all possible player actions as an enum:
```typescript
export enum InputAction {
  MOVE_UP,
  MOVE_DOWN,
  MOVE_LEFT,
  MOVE_RIGHT,
  ATTACK,
  DODGE,
  INTERACT,
  PAUSE,
  // Analog stick produces continuous values
  MOVE_X,   // -1.0 to 1.0
  MOVE_Y,   // -1.0 to 1.0
}
```

**`InputProvider.ts`** - Abstract interface each provider implements:
```typescript
export interface InputProvider {
  readonly type: 'keyboard' | 'gamepad';
  update(scene: Phaser.Scene): void;
  isActionActive(action: InputAction): boolean;
  isActionJustPressed(action: InputAction): boolean;
  getAxisValue(action: InputAction.MOVE_X | InputAction.MOVE_Y): number;
  isConnected(): boolean;
}
```

**`KeyboardProvider.ts`** - Wraps `scene.input.keyboard`:
- Maps WASD + arrow keys to directional actions
- Space = dodge, J/left-click = attack, E = interact, Escape = pause
- Keyboard returns 0 or 1 for axes (digital, no analog)
- `isActionJustPressed` uses Phaser's `JustDown` utility

**`GamepadProvider.ts`** - Wraps `scene.input.gamepad`:
- Left stick maps to MOVE_X / MOVE_Y with deadzone (0.15)
- D-pad maps to directional booleans
- Face buttons: South = attack, East = dodge, North = interact, Start = pause
- Returns true analog values from sticks (0.0 to 1.0)
- Handles gamepad connection/disconnection events

**`InputManager.ts`** - Singleton that aggregates providers:
```typescript
export class InputManager {
  private providers: InputProvider[] = [];
  private activeProvider: InputProvider | null = null;

  constructor(scene: Phaser.Scene) {
    this.providers.push(new KeyboardProvider(scene));
    this.providers.push(new GamepadProvider(scene));
  }

  update(scene: Phaser.Scene): void {
    // Poll all providers, track which one last had input
    for (const provider of this.providers) {
      provider.update(scene);
    }
    // Auto-detect active provider based on last input received
    this.detectActiveProvider();
  }

  isActionActive(action: InputAction): boolean {
    // Check ALL providers - allows seamless switching mid-play
    return this.providers.some(p => p.isConnected() && p.isActionActive(action));
  }

  isActionJustPressed(action: InputAction): boolean {
    return this.providers.some(p => p.isConnected() && p.isActionJustPressed(action));
  }

  getMovementVector(): Phaser.Math.Vector2 {
    // Prefer analog stick if gamepad active, otherwise keyboard digital
    // Normalize the vector so diagonal movement is not faster
    const x = this.getBestAxisValue(InputAction.MOVE_X);
    const y = this.getBestAxisValue(InputAction.MOVE_Y);
    const vec = new Phaser.Math.Vector2(x, y);
    if (vec.length() > 1) vec.normalize();
    return vec;
  }

  getActiveDeviceType(): 'keyboard' | 'gamepad' {
    return this.activeProvider?.type ?? 'keyboard';
  }
}
```

Usage in DungeonScene:
```typescript
update(time: number, delta: number) {
  this.inputManager.update(this);
  const movement = this.inputManager.getMovementVector();
  this.player.move(movement, delta);

  if (this.inputManager.isActionJustPressed(InputAction.ATTACK)) {
    this.player.attack();
  }
  if (this.inputManager.isActionJustPressed(InputAction.DODGE)) {
    this.player.dodge();
  }
}
```

**`InputBindings.ts`** - Data-driven mapping configuration:
```typescript
export const DEFAULT_KEYBOARD_BINDINGS: Record<InputAction, string[]> = {
  [InputAction.MOVE_UP]: ['W', 'UP'],
  [InputAction.MOVE_DOWN]: ['S', 'DOWN'],
  [InputAction.MOVE_LEFT]: ['A', 'LEFT'],
  [InputAction.MOVE_RIGHT]: ['D', 'RIGHT'],
  [InputAction.ATTACK]: ['J', 'SPACE'],
  [InputAction.DODGE]: ['K', 'SHIFT'],
  [InputAction.INTERACT]: ['E'],
  [InputAction.PAUSE]: ['ESC'],
};

export const DEFAULT_GAMEPAD_BINDINGS: Record<InputAction, number[]> = {
  [InputAction.ATTACK]: [0],    // A / Cross
  [InputAction.DODGE]: [1],     // B / Circle
  [InputAction.INTERACT]: [3],  // Y / Triangle
  [InputAction.PAUSE]: [9],     // Start
};
```

This data-driven approach makes future rebinding support trivial.

### 3.2 Combat System (Souls-like)

The combat system enforces deliberate, punishing gameplay through commitment windows and stamina management.

**Core Principles:**
- Every action (attack, dodge) has a **windup**, **active**, and **recovery** phase
- Player is **committed** during windup and recovery (cannot cancel)
- Stamina is spent on attacks and dodges; depleted stamina means vulnerability
- Dodge grants **invincibility frames** (i-frames) during the active phase
- Enemies telegraph attacks with visual tells

**`CombatSystem.ts`**:
```typescript
export class CombatSystem {
  resolveAttack(attacker: Entity, target: Entity, attackData: AttackData): void {
    // 1. Check if target is in i-frame state -> miss
    // 2. Check if attack hitbox overlaps target hurtbox
    // 3. Calculate damage (base + modifiers)
    // 4. Apply damage to target health
    // 5. Apply knockback
    // 6. Emit events (damage numbers, screen shake)
  }
}
```

**`AttackData.ts`** - Defines attack properties:
```typescript
export interface AttackData {
  name: string;
  damage: number;
  staminaCost: number;
  windupMs: number;     // Time before hitbox activates
  activeMs: number;     // Duration hitbox is live
  recoveryMs: number;   // Locked animation after attack
  knockback: number;    // Push-back force on hit
  range: number;        // Hitbox reach in pixels
  arc: number;          // Attack cone angle in degrees
}
```

**`DodgeSystem.ts`**:
```typescript
export class DodgeSystem {
  private readonly DODGE_SPEED = 300;
  private readonly DODGE_DURATION_MS = 300;
  private readonly IFRAME_START_MS = 50;    // i-frames begin 50ms into dodge
  private readonly IFRAME_DURATION_MS = 200; // i-frames last 200ms
  private readonly DODGE_STAMINA_COST = 25;
  private readonly DODGE_COOLDOWN_MS = 400;

  executeDodge(entity: Entity, direction: Phaser.Math.Vector2): void {
    // 1. Check stamina >= cost
    // 2. Deduct stamina
    // 3. Set entity velocity in dodge direction
    // 4. Start i-frame timer
    // 5. Lock input during dodge animation
    // 6. Start cooldown timer
  }
}
```

**`StaminaComponent.ts`**:
- Current / max stamina
- Regeneration rate (pauses briefly after spending stamina - 0.8s delay, then regenerates)
- Depleted state: when stamina hits 0, enter "exhausted" (slower regen, cannot dodge for 1.5s)

**Combat State Machine for Player:**
```
IDLE -> ATTACKING (on attack input + enough stamina)
IDLE -> DODGING (on dodge input + enough stamina)
IDLE -> MOVING (on movement input)
ATTACKING -> IDLE (after recovery ends)
DODGING -> IDLE (after dodge ends)
MOVING -> IDLE (on no input)
MOVING -> ATTACKING / DODGING (if conditions met)
HIT_STUN -> IDLE (after stun duration)
DEAD (terminal)
```

### 3.3 Map / Dungeon Generation System

Uses a **BSP (Binary Space Partitioning)** algorithm for Phase 1, producing Diablo 1-style rectangular rooms connected by corridors.

**`DungeonGenerator.ts`**:
```typescript
export interface DungeonConfig {
  width: number;           // Grid width in tiles (e.g., 48)
  height: number;          // Grid height in tiles (e.g., 48)
  minRoomSize: number;     // Minimum room dimension (5)
  maxRoomSize: number;     // Maximum room dimension (12)
  maxDepth: number;        // BSP recursion depth (5)
  corridorWidth: number;   // 1-2 tiles
}

export class DungeonGenerator {
  generate(config: DungeonConfig): DungeonMap {
    // 1. Create BSP tree by recursively splitting the grid
    // 2. Place rooms in leaf nodes
    // 3. Connect sibling rooms with L-shaped corridors
    // 4. Place entrance (stairs up) and exit (stairs down)
    // 5. Place enemies in rooms (not starting room)
    // 6. Return DungeonMap with tile data + entity spawn points
  }
}
```

**`DungeonMap.ts`** - Runtime data structure:
```typescript
export enum TileType {
  WALL = 0,
  FLOOR = 1,
  CORRIDOR = 2,
  DOOR = 3,
  STAIRS_UP = 4,
  STAIRS_DOWN = 5,
}

export interface SpawnPoint {
  x: number;
  y: number;
  type: 'player' | 'enemy';
  enemyType?: string;
}

export class DungeonMap {
  tiles: TileType[][];
  spawnPoints: SpawnPoint[];
  rooms: Phaser.Geom.Rectangle[];
  width: number;
  height: number;

  getTileAt(x: number, y: number): TileType;
  isWalkable(x: number, y: number): boolean;
  getStartRoom(): Phaser.Geom.Rectangle;
}
```

**`MapRenderer.ts`** - Creates Phaser tilemap from DungeonMap:
```typescript
export class MapRenderer {
  createTilemap(scene: Phaser.Scene, dungeonMap: DungeonMap): Phaser.Tilemaps.Tilemap {
    // 1. Create blank tilemap with correct dimensions
    // 2. Add tileset image
    // 3. Create ground layer (floors, corridors)
    // 4. Create wall layer (walls, doors)
    // 5. Create decoration layer (stairs, props)
    // 6. Set collision on wall tiles
    // 7. Configure depth sorting for pseudo-3D look
    // 8. Return tilemap for physics collisions
  }
}
```

**Tile rendering approach for Diablo 1 style:**
- Use a top-down perspective (not true isometric) for Phase 1 simplicity
- Tiles are 32x32 pixels
- Walls are taller sprites (32x48) that overlap floor tiles for depth
- Depth sorting via Y-position (entities behind walls are occluded)
- Dark fog-of-war / line-of-sight reveal (explored vs. unexplored)

### 3.4 Entity System

Uses a **composition** pattern rather than deep inheritance. Entities are Phaser game objects enhanced with component mixins.

**`Entity.ts`** - Base class:
```typescript
export abstract class Entity extends Phaser.Physics.Arcade.Sprite {
  public health: HealthComponent;
  public movement: MovementComponent;

  protected stateMachine: StateMachine;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.health = new HealthComponent(this, 100);
    this.movement = new MovementComponent(this, 100);
  }

  update(time: number, delta: number): void {
    this.stateMachine.update(time, delta);
    this.health.update(delta);
  }

  // Depth sorting for top-down pseudo-3D
  postUpdate(): void {
    this.setDepth(this.y);
  }
}
```

**`Player.ts`**:
```typescript
export class Player extends Entity {
  public stamina: StaminaComponent;
  public combat: CombatComponent;

  private inputManager: InputManager;

  constructor(scene: Phaser.Scene, x: number, y: number, inputManager: InputManager) {
    super(scene, x, y, 'player');
    this.stamina = new StaminaComponent(this, 100);
    this.combat = new CombatComponent(this, playerAttackData);
    this.inputManager = inputManager;
    this.setupStateMachine();
    this.setupAnimations();
  }
}
```

### 3.5 Enemy AI System

Uses a **finite state machine** (FSM) per enemy. Simple but extensible for Phase 1.

**`StateMachine.ts`** - Generic FSM:
```typescript
export class StateMachine {
  private currentState: AIBehavior;
  private states: Map<string, AIBehavior>;

  addState(name: string, state: AIBehavior): void;
  setState(name: string): void;
  update(time: number, delta: number): void {
    const transition = this.currentState.update(time, delta);
    if (transition) this.setState(transition);
  }
}
```

**`AIBehavior.ts`** - Interface:
```typescript
export interface AIBehavior {
  enter(): void;
  update(time: number, delta: number): string | null;  // Returns state name to transition to, or null
  exit(): void;
}
```

**Phase 1 enemy states:**
- **PatrolState**: Move randomly within room bounds. Transition to Chase when player enters detection radius.
- **ChaseState**: Move toward player. Transition to Attack when in range. Transition to Patrol if player leaves chase radius.
- **AttackState**: Execute attack animation with telegraph. Transition to Chase after recovery. Souls-like: enemy commits to attack direction.

---

## 4. Phaser 3 / SvelteKit Integration

### 4.1 Lifecycle Management

The critical integration point is that Phaser runs its own game loop (`requestAnimationFrame`) independently of Svelte's reactivity. They communicate exclusively through `eventBridge`.

**Mount sequence:**
1. SvelteKit loads `+page.svelte` (client-side only, SSR disabled)
2. `+page.svelte` mounts `<PhaserGame>` component
3. `PhaserGame.svelte` `onMount` calls `StartGame(containerDiv)`
4. Phaser creates `<canvas>` inside `game-container` div
5. BootScene runs, emits `current-scene-ready` via eventBridge
6. Svelte tracks the active scene reference

**Destroy sequence:**
1. SvelteKit navigation away from game page (or component unmount)
2. `PhaserGame.svelte` `onDestroy` calls `game.destroy(true)`
3. Phaser cleans up canvas, event listeners, physics, textures

**Pause/Resume:**
- When Svelte menus overlay (pause, inventory), emit `pause-requested` on eventBridge
- DungeonScene listens and calls `this.scene.pause()` + `this.physics.pause()`
- On resume, Svelte emits `resume-requested`

### 4.2 State Synchronization Flow

```
Phaser (game loop)                        Svelte (reactive UI)
─────────────────                        ──────────────────
Player takes damage                       
  -> entity.health.takeDamage(20)         
  -> HealthComponent emits event          
     via eventBridge                      
  -> eventBridge.emit(                    -> +page.svelte listener
       'player-health-changed',              -> gameState.playerHealth.set({
       { current: 80, max: 100 })                 current: 80, max: 100 })
                                              -> <HealthBar> reactively updates
                                                 (Tailwind-styled width transition)
```

### 4.3 HUD Architecture (Hybrid Approach)

**Svelte-rendered HUD** (via TailwindCSS, overlaid on canvas):
- Health bar (animated width transitions via CSS)
- Stamina bar
- Minimap (canvas element within Svelte, or simple grid)
- Floor indicator
- Pause/inventory button prompts (switch icons based on input device)

**Phaser-rendered HUD** (UIScene, running in parallel):
- Floating damage numbers (must be pixel-synced with entity positions)
- Enemy health bars (follow enemy sprites)
- Combat telegraphs and indicators
- Screen-shake and flash effects

This split means stable UI lives in Svelte (better for accessibility, styling, transitions) while fast game-synced overlays live in Phaser.

### 4.4 Component Structure in +page.svelte

```svelte
<script lang="ts">
  import PhaserGame from '$lib/components/PhaserGame.svelte';
  import HudOverlay from '$lib/components/hud/HudOverlay.svelte';
  import PauseMenu from '$lib/components/menus/PauseMenu.svelte';
  import GameOverScreen from '$lib/components/menus/GameOverScreen.svelte';
  import { uiState } from '$lib/stores/uiState';
</script>

<div class="relative w-full h-screen bg-black">
  <!-- Phaser canvas fills container -->
  <PhaserGame />

  <!-- Svelte HUD floats above canvas -->
  <HudOverlay />

  <!-- Conditional overlays -->
  {#if $uiState.paused}
    <PauseMenu />
  {/if}

  {#if $uiState.gameOver}
    <GameOverScreen />
  {/if}
</div>
```

---

## 5. Gemini API Proxy Route Design

### 5.1 Why a Server-Side Proxy

The Gemini API key must not be exposed to the client. SvelteKit's server route (`+server.ts`) acts as a proxy, keeping the API key in environment variables on the server.

### 5.2 Route: `src/routes/api/gemini/+server.ts`

```typescript
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GEMINI_API_KEY } from '$env/static/private';

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

interface GeminiRequest {
  prompt: string;
  context?: string;        // Game state context (current floor, enemies killed, etc.)
  type: 'flavor_text' | 'dialogue' | 'quest' | 'item_description';
  maxTokens?: number;
}

export const POST: RequestHandler = async ({ request }) => {
  const body: GeminiRequest = await request.json();

  // Build system prompt based on request type
  const systemPrompt = buildSystemPrompt(body.type, body.context);

  const geminiPayload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\n${body.prompt}` }]
      }
    ],
    generationConfig: {
      maxOutputTokens: body.maxTokens ?? 256,
      temperature: 0.8,
      topP: 0.95,
    }
  };

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(geminiPayload)
  });

  if (!response.ok) {
    throw error(response.status, 'Gemini API request failed');
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  return json({ text, type: body.type });
};

function buildSystemPrompt(type: string, context?: string): string {
  const base = 'You are a dark fantasy narrator for a dungeon crawler RPG. Your tone is grim, atmospheric, and concise.';

  switch (type) {
    case 'flavor_text':
      return `${base} Generate a brief atmospheric description (1-2 sentences) for a dungeon area. ${context ?? ''}`;
    case 'dialogue':
      return `${base} Generate NPC dialogue. Stay in character. ${context ?? ''}`;
    case 'quest':
      return `${base} Generate a brief quest with objective, reward hint, and atmospheric context. Return as JSON: { "title": "...", "description": "...", "objective": "...", "reward_hint": "..." }. ${context ?? ''}`;
    case 'item_description':
      return `${base} Generate a short item flavor text (1 sentence). ${context ?? ''}`;
    default:
      return base;
  }
}
```

### 5.3 Client-Side Usage

```typescript
// From Phaser scene or Svelte component
async function fetchFlavorText(floorLevel: number): Promise<string> {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'flavor_text',
      prompt: 'Describe the entrance to a new dungeon floor.',
      context: `The player is on floor ${floorLevel}. The dungeon grows darker and more dangerous.`
    })
  });
  const data = await res.json();
  return data.text;
}
```

### 5.4 Rate Limiting and Caching (Phase 1 Foundation)

- Add a simple in-memory cache keyed on `type + prompt_hash` to avoid duplicate API calls
- Implement a basic request queue (max 2 concurrent requests to Gemini)
- Non-blocking: game never waits for LLM response to continue; text appears asynchronously

---

## 6. Implementation Order

### Step 1: Project Scaffolding (Day 1)

1. Initialize SvelteKit project: `npx sv create` with TypeScript, TailwindCSS
2. Install dependencies: `npm install phaser`
3. Configure `svelte.config.js` (adapter-auto or adapter-static)
4. Set `ssr = false` in `+layout.ts`
5. Create `src/game/main.ts` with basic Phaser config
6. Create `src/lib/components/PhaserGame.svelte` bridge component
7. Create `src/lib/utils/eventBridge.ts`
8. Mount PhaserGame in `+page.svelte`
9. Create BootScene that just renders a colored background
10. **Verify**: Phaser canvas renders inside SvelteKit page

### Step 2: Input System (Day 2)

1. Create `InputAction` enum
2. Create `InputProvider` interface
3. Implement `KeyboardProvider` with WASD + arrow keys
4. Implement `GamepadProvider` with deadzone and button mapping
5. Create `InputManager` that aggregates both providers
6. Create `InputBindings` default mappings
7. Wire InputManager into BootScene, log input to console
8. **Verify**: Both keyboard and gamepad produce consistent action events

### Step 3: Asset Loading & Placeholder Art (Day 2-3)

1. Create placeholder tileset (32x32 floor/wall tiles) - even colored rectangles
2. Create placeholder player spritesheet (4-directional, idle + walk + attack frames)
3. Create placeholder enemy sprites
4. Set up BootScene to load all assets
5. Set up PreloaderScene with loading bar
6. **Verify**: Assets load, preloader transitions to gameplay

### Step 4: Dungeon Generation & Map Rendering (Day 3-4)

1. Implement `DungeonGenerator` with BSP algorithm
2. Implement `DungeonMap` data structure
3. Implement `TileRegistry` with tile type definitions
4. Implement `MapRenderer` to create Phaser tilemaps from DungeonMap
5. Create `DungeonScene` that generates and renders a dungeon
6. Add wall collision layers
7. Set up camera bounds to match dungeon size
8. **Verify**: Procedurally generated dungeon renders with walls and floors

### Step 5: Player Movement & Camera (Day 4-5)

1. Implement `Entity` base class extending Arcade Sprite
2. Implement `MovementComponent`
3. Implement `Player` class
4. Wire `InputManager` to Player movement in DungeonScene
5. Add `CameraSystem` - camera follows player, bounded to map
6. Add Y-based depth sorting for entities
7. Add walk animation playback based on movement direction
8. **Verify**: Player moves through dungeon with gamepad or keyboard, camera follows

### Step 6: Stamina System & Dodge/Roll (Day 5-6)

1. Implement `StaminaComponent` with regen delay and exhaustion
2. Implement `DodgeSystem` with i-frames
3. Add dodge animation to Player
4. Wire dodge to InputManager DODGE action
5. Add stamina cost and cooldown enforcement
6. **Verify**: Player can dodge-roll with i-frames, stamina depletes and regenerates

### Step 7: Combat System (Day 6-8)

1. Define `AttackData` for player attacks
2. Implement `CombatComponent` with windup/active/recovery phases
3. Implement `HitboxManager` for attack collision zones
4. Implement `CombatSystem` for damage resolution
5. Add attack animation to Player
6. Add knockback on hit
7. Wire attack to InputManager ATTACK action
8. Add player state machine (idle/moving/attacking/dodging/hit/dead)
9. **Verify**: Player can attack, attacks have commitment windows, hitboxes work

### Step 8: Enemy AI (Day 8-10)

1. Implement `StateMachine` generic FSM
2. Implement `PatrolState`, `ChaseState`, `AttackState`
3. Implement `Enemy` base class with HealthComponent
4. Implement `Skeleton` enemy with specific stats/animations
5. Define enemy attack data with telegraph timing
6. Spawn enemies in dungeon rooms (from DungeonGenerator spawn points)
7. Add enemy-player collision and combat
8. Add enemy death (with simple animation/fade)
9. **Verify**: Enemies patrol, chase player, attack with telegraphs, can be killed

### Step 9: HUD (Day 10-11)

1. Create Svelte `HealthBar.svelte` component (Tailwind styled)
2. Create Svelte `StaminaBar.svelte` component
3. Create Svelte `Minimap.svelte` (simple grid based on DungeonMap explored tiles)
4. Create `HudOverlay.svelte` composite
5. Wire eventBridge events to Svelte stores
6. Set up UIScene for floating damage numbers
7. Add screen shake on player hit
8. Show input-appropriate button prompts (keyboard vs gamepad icons)
9. **Verify**: HUD shows real-time health/stamina, minimap reveals explored areas

### Step 10: Gemini API Foundation (Day 11-12)

1. Create `src/routes/api/gemini/+server.ts` proxy endpoint
2. Add `GEMINI_API_KEY` to `.env`
3. Implement `buildSystemPrompt` for different request types
4. Add basic in-memory response cache
5. Create client-side fetch utility in `src/lib/utils/`
6. Add flavor text popup when entering a new dungeon floor
7. **Verify**: Floor transition triggers LLM call, flavor text displays in-game

### Step 11: Polish & Integration (Day 12-14)

1. Main menu screen (Svelte, Tailwind)
2. Pause menu with resume/quit options
3. Game over screen on player death
4. Floor transitions (stairs down -> regenerate dungeon, increment floor counter)
5. Basic audio (ambient dungeon sound, attack SFX, hit SFX)
6. Fog of war / visibility radius around player
7. Bug fixing and balance tuning
8. **Verify**: Complete core loop: menu -> enter dungeon -> fight -> die or descend -> repeat

---

## 7. Technical Decisions & Rationale

### 7.1 Top-Down vs Isometric

**Decision: Top-down with pseudo-depth (Phase 1), true isometric (Phase 2+)**

Rationale: True isometric in Phaser 3 requires coordinate transforms for all input, pathfinding, and collision. It adds significant complexity to every system. Top-down with Y-sorting and tall wall sprites achieves the Diablo 1 visual feel with 1/3 of the complexity. Phase 2 can migrate to isometric rendering once the core systems are stable.

### 7.2 Arcade Physics vs Matter.js

**Decision: Arcade Physics**

Rationale: Top-down dungeon crawler needs axis-aligned collision (walls) and overlap detection (hitboxes). Arcade physics handles this efficiently. Matter.js adds polygon collisions and physics simulations we do not need. Attack hitboxes use temporary overlap zones, not persistent physics bodies.

### 7.3 Component Composition vs ECS

**Decision: Component composition on Phaser sprites (not a full ECS)**

Rationale: A full ECS (like bitecs) adds architectural overhead that is not justified for Phase 1's entity count (< 50 active entities). Component composition on Phaser's built-in sprite class gives us reuse without framework overhead. If Phase 2+ needs thousands of entities (large world chunks), we can introduce a proper ECS then.

### 7.4 Svelte HUD vs Phaser HUD

**Decision: Hybrid - Svelte for persistent UI, Phaser for game-synced effects**

Rationale: Svelte + Tailwind produces better-looking, more accessible, more maintainable UI (health bars, menus, inventory). But floating damage numbers and combat indicators must move at 60fps in sync with game entities, which requires Phaser rendering. The UIScene approach (parallel scene) keeps these separate from gameplay physics.

### 7.5 Phaser 3 vs Phaser 4 (Phaser CE)

**Decision: Phaser 3 (v3.85+)**

Rationale: Phaser 3 is stable, well-documented, has the largest ecosystem of plugins and examples. The official Svelte template targets Phaser 3. Phaser 4 is not yet production-ready.

### 7.6 BSP Dungeon Generation vs Wave Function Collapse

**Decision: BSP for Phase 1**

Rationale: BSP produces clean, Diablo 1-style rectangular rooms with guaranteed connectivity. It is deterministic given a seed, simple to implement, and easy to debug. WFC or more advanced algorithms can be layered on in future phases for more organic cave systems.

---

## Package Dependencies

```json
{
  "dependencies": {
    "phaser": "^3.85.0"
  },
  "devDependencies": {
    "@sveltejs/kit": "^2.x",
    "@sveltejs/adapter-auto": "^3.x",
    "svelte": "^5.x",
    "typescript": "^5.x",
    "vite": "^6.x",
    "@tailwindcss/vite": "^4.x",
    "tailwindcss": "^4.x"
  }
}
```

---

## Open Questions for Future Phases

1. **Save system**: LocalStorage for Phase 1 quicksave? IndexedDB for larger save data?
2. **Multiplayer**: Not in scope, but should Entity/InputManager be designed with network prediction in mind?
3. **Asset pipeline**: Will there be custom pixel art, or procedurally tinted/recolored base sprites?
4. **Mobile support**: Touch input provider for later? Affects InputProvider interface design.
5. **Modding**: Should game config be JSON-loadable for community content?

---

## References

- [Official Phaser 3 + Svelte Template](https://github.com/phaserjs/template-svelte)
- [Phaser 3 Gamepad API](https://docs.phaser.io/api-documentation/class/input-gamepad-gamepad)
- [phaser3-merged-input plugin](https://github.com/GaryStanton/phaser3-merged-input) (reference for input patterns)
- [Phaser 3 Procedural Dungeon Generation](https://itnext.io/modular-game-worlds-in-phaser-3-tilemaps-3-procedural-dungeon-3bc19b841cd)
- [Phaser 3 Isometric Tilemap Examples](https://phaser.io/examples/v3.85.0/tilemap/isometric/view/create-isometric-manually)
- [Gemini API Reference](https://ai.google.dev/api)
- [DungeonDash - Open Source Phaser 3 Dungeon Crawler](https://github.com/mipearson/dungeondash)
