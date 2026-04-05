# Dungeons & Dangeons 2

Diablo 1完全再現を目指すブラウザベースのハクスラ・ソウルライク・アクションRPG。

## こだわり
- Diablo 1の完全な見た目（アイソメトリック、壁ブロック3面構成、天井透過）
- スキルツリー
- Gemini Flash 2.5 APIでTRPG/ゲームブック（火吹山の魔法使い系）風フレーバーテキスト・NPC会話
- 完全なゲームパッド+キーボード操作（設計に最初から組み込み）
- Minecraftのようなプロシージャルワールド生成、LLM補助で新世界構築
- ダンジョンだけでなくワールドによりプロシージャル生成される敵やアイテム
- 固定クエスト + LLM都度生成クエスト、結果でワールドに影響

## ゲームループ
```
ワールド > 拠点 > ダンジョン
クエストによってダンジョンに潜る動機づけ
クエストの結果 → 拠点の発展、勢力図の更新（アルゴリズム）
拠点の発展、勢力図の更新 → ワールドの変化（歴史、ロア）（LLM）
```

## Tech Stack
- **SvelteKit** (SSR disabled) + **TailwindCSS v4** — UIシェル
- **Phaser 3** (v3.90) — ゲームエンジン（Canvas内）
- **TypeScript** throughout
- **Gemini Flash 2.5 API** — `/api/gemini` 経由TRPG風テキスト生成

## Architecture
- **デュアル座標系**: 物理=直交(cartesian)、描画=アイソメトリック(iso)
- **壁ブロック3面**: wall_top(天井) + wall_left(SW面) + wall_right(SE面)、隣接壁で面省略
- **床は固定低レイヤー**(depth -1000)、壁とエンティティだけで深度ソート
- Phaser↔Svelte通信: `eventBridge` (Phaser.Events.EventEmitter)
- 入力: `InputManager` → `KeyboardProvider` + `GamepadProvider`、`InputAction` enum
- HUDハイブリッド: Svelte=永続UI、Phaser=ダメージ数字等

## Commands
- `npm run dev` — 開発サーバー (port 5173)
- `npm run build` — プロダクションビルド
- `npm run check` — 型チェック

## Environment Variables
- `GEMINI_API_KEY` — Gemini API用（.envに設定）

## 引き継ぎ
**HANDOFF.md** に完全な引き継ぎ資料あり:
- 全ファイルの役割一覧
- 壁描画システムの詳細解説
- 戦闘システムの現状と次の実装仕様
- ワールド生成・クエスト・LLM統合の全体設計
- 既知の問題リスト
