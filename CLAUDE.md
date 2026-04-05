# Dungeons & Dangeons 2

Browser-based Diablo 1-style action RPG with souls-like combat.

## Tech Stack
- **SvelteKit** (SSR disabled) + **TailwindCSS v4** for UI shell
- **Phaser 3** for game engine (embedded in Svelte)
- **TypeScript** throughout
- **Gemini Flash 2.5 API** for TRPG-style flavor text (proxied via `/api/gemini`)

## Project Structure
- `src/game/` — All Phaser engine code (scenes, input, entities, combat, map, AI)
- `src/lib/components/` — Svelte UI components (HUD, menus)
- `src/lib/stores/` — Svelte stores for game state
- `src/lib/utils/` — EventBridge (Phaser<->Svelte comms), constants
- `src/routes/` — SvelteKit routes and API endpoints

## Architecture
- Phaser and Svelte communicate via `eventBridge` (Phaser.Events.EventEmitter)
- Input system: `InputManager` aggregates `KeyboardProvider` + `GamepadProvider`
- All gameplay code uses `InputAction` enum, never raw key/button codes
- HUD is hybrid: Svelte for persistent UI, Phaser for game-synced effects

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run check` — Type checking

## Key Design Decisions
- Top-down with Y-sort (not isometric) for Phase 1
- Arcade Physics (not Matter.js)
- BSP dungeon generation
- Souls-like combat: windup/active/recovery phases, stamina, i-frame dodges

## Environment Variables
- `GEMINI_API_KEY` — Required for LLM flavor text generation
