# Dungeons & Dangeons 2 — 引き継ぎ資料

## プロジェクト概要
ブラウザベースのDiablo 1風ハクスラアクションRPG。ソウルライク戦闘、プロシージャル生成、LLMフレーバーテキスト。

## 開発フェーズ進捗

> 元計画: `.claude/plans/compressed-gliding-torvalds-agent-a7e5f6160d7c3186c.md`

### Phase 1: コアゲームプレイ（完了）

| Step | 内容 | 状態 |
|------|------|------|
| Step 1 | プロジェクト基盤（SvelteKit + Phaser統合） | 完了 |
| Step 2 | 入力システム（キーボード + ゲームパッド） | 完了 |
| Step 3 | アセット生成（プロシージャルテクスチャ） | 完了 |
| Step 4 | ダンジョン生成 & アイソメトリック描画 | 完了 |
| Step 5 | プレイヤー移動 & カメラ | 完了 |
| Step 6 | スタミナ & ドッジロール | 完了 |
| Step 7 | 戦闘システム（攻撃、ガード、パリィ、ジャスト回避、硬直、壁LOS） | 完了 |
| Step 8 | 敵AI（パトロール、追跡、攻撃、スタン） | 完了 |
| Step 9 | HUD（HP/ST/Lvバー、操作ヒント、ダメージ数字） | 完了 |
| Step 10 | LLM基盤（Gemini APIプロキシ、フレーバーテキスト、NPC会話） | 完了 |
| Step 11 | 仕上げ（拠点シーン、スキルツリー、フロア遷移、壁透過） | 完了 |

### Phase 1.5: 戦闘拡張 + UI強化（完了）

| 内容 | 状態 |
|------|------|
| ガード（LB/Lキー）: ダメ軽減70%、低速移動、スタミナ消費 | 完了 |
| パリィ: ガード開始150ms以内でダメ0、敵スタン、スタミナ回復 | 完了 |
| ジャスト回避: ドッジ開始100ms以内で全体スローモ300ms | 完了 |
| 硬直: 被弾20%確率で500msスタン、FPS非依存ノックバック減衰 | 完了 |
| 攻撃壁透過防止: Bresenham LOS + 対角コーナーカット防止 | 完了 |
| スキルツリーGamepad操作: D-Pad/スティック/LB/RB/A/B | 完了 |

### Phase 2: ゲームループ完成（次）

| Step | 内容 | 状態 | LLM関連 |
|------|------|------|---------|
| 2-1 | スキルツリーのステータス反映 | 未着手 | — |
| 2-2 | アイテムドロップ & インベントリ | 未着手 | — |
| 2-3 | ゲームブック風イベント（ダンジョン内選択肢） | 未着手 | **LLM: 状況+選択肢生成** |
| 2-4 | より多くの敵タイプ & ボス | 未着手 | — |
| 2-5 | アイテム命名・フレーバーテキスト | 未着手 | **LLM: アイテム名+説明生成** |
| 2-6 | オーディオ（BGM、SE） | 未着手 | — |

### Phase 3: ワールド & クエスト

| Step | 内容 | 状態 | LLM関連 |
|------|------|------|---------|
| 3-1 | ワールドマップ（複数ダンジョン選択） | 未着手 | — |
| 3-2 | ダンジョンテーマ（石窟、墓地、溶岩、氷穴） | 未着手 | **LLM: テーマ別フレーバー** |
| 3-3 | 固定クエストシステム（掲示板受注、目標検知） | 未着手 | — |
| 3-4 | LLM動的クエスト生成 | 未着手 | **LLM: ワールド状態→クエストJSON** |
| 3-5 | 拠点発展（クエスト結果→NPC追加/ショップ拡張） | 未着手 | — |
| 3-6 | 勢力図 & ワールドロア | 未着手 | **LLM: 勢力変動→歴史テキスト** |
| 3-7 | イベントナレーション（ボス撃破等） | 未着手 | **LLM: 状況→劇的描写** |

### Phase 4: 永続化 & 品質

| Step | 内容 | 状態 |
|------|------|------|
| 4-1 | セーブ/ロード（LocalStorage → IndexedDB） | 未着手 |
| 4-2 | フォグ・オブ・ウォー再実装（WebGL shader） | 未着手 |
| 4-3 | プロシージャル敵・アイテム生成（EnemyFactory/ItemFactory） | 未着手 |

### LLMロードマップまとめ

```
Phase 1 (完了)
  └─ フレーバーテキスト（フロア遷移時）     ← 実装済み
  └─ NPC会話（Eキー）                      ← 実装済み
  └─ APIインフラ（プロキシ、キャッシュ）    ← 実装済み

Phase 2 (次)
  └─ ゲームブック風イベント (Step 2-3)      ← 最も早く実装可能なLLM拡張
  └─ アイテム命名 (Step 2-5)               ← アイテムシステム後

Phase 3
  └─ テーマ別フレーバー (Step 3-2)
  └─ LLM動的クエスト生成 (Step 3-4)
  └─ ワールドロア・歴史生成 (Step 3-6)
  └─ イベントナレーション (Step 3-7)
```

## 技術スタック
- **SvelteKit** (SSR無効) + **TailwindCSS v4** — UIシェル、HUD、メニュー
- **Phaser 3** (v3.90) — ゲームエンジン（キャンバス内）
- **TypeScript** — 全ファイル
- **Gemini Flash 2.5 API** — `/api/gemini` 経由のフレーバーテキスト/NPC会話

## アーキテクチャ

### デュアル座標系（最重要）
```
物理/ゲームロジック: 直交グリッド空間 (cartesian)
  → Entity.x, Entity.y = 物理ボディ位置 (不可視)
  → TILE_SIZE = 32px/タイル
  → 衝突判定、AI距離計算、すべてここで行う

描画: アイソメトリック画面空間 (isometric)
  → Entity.visual = 見えるスプライト
  → cartToIso(tileX, tileY) で変換
  → ISO_TILE_WIDTH=64, ISO_TILE_HEIGHT=32
  → 毎フレーム updateIsoPosition() で投影
  → visualOffsetX: エフェクト用オフセット（wobble等）
```

### Phaser ↔ Svelte 通信
`eventBridge` (Phaser.Events.EventEmitter) で状態同期。
Phaser→Svelte: HP変更、スタミナ変更、フロア変更、NPC会話
Svelte→Phaser: ポーズ/レジューム

### シーンフロー
```
BootScene (テクスチャ生成) → HubScene (拠点) → DungeonScene (ダンジョン)
                                ↑                    ↓ (ESCで帰還)
                                └────────────────────┘
```

## ファイル構造と役割

### ゲームエンジン (`src/game/`)
| ファイル | 役割 |
|---------|------|
| `main.ts` | Phaser.Game 生成、シーン登録 |
| `iso/IsoHelper.ts` | `cartToIso()`, `isoDepth()`, `screenDirToCart()` |
| `scenes/BootScene.ts` | テクスチャ生成（wall_top, wall_left, wall_right, tile_floor, player, enemy_skeleton, shadow） |
| `scenes/HubScene.ts` | 拠点シーン。NPC配置、インタラクト、ダンジョン入口 |
| `scenes/DungeonScene.ts` | メインゲームプレイ。ダンジョン生成、戦闘、フロア遷移、ジャスト回避スローモ管理 |
| `map/DungeonGenerator.ts` | BSPダンジョン生成（部屋+コリドー+スポーンポイント） |
| `map/DungeonMap.ts` | タイルデータ構造 (TileType enum, isWalkable, hasLineOfSight) |
| `map/MapRenderer.ts` | アイソメトリックタイル描画、壁透過制御 |
| `entities/Entity.ts` | 基底エンティティ。物理ボディ(不可視) + visual(可視) + shadow + visualOffsetX |
| `entities/Player.ts` | プレイヤー。入力処理、攻撃、ドッジ、ガード、パリィ、スタミナ |
| `entities/Enemy.ts` | 敵AI (FSM: patrol→chase→attack→cooldown→stunned)、LOS攻撃チェック |
| `entities/components/HealthComponent.ts` | HP管理、ダメージ/死亡コールバック |
| `entities/components/StaminaComponent.ts` | スタミナ管理、リジェネ遅延、疲労状態、recover() |
| `input/InputManager.ts` | キーボード+ゲームパッド統合入力 |
| `input/InputAction.ts` | アクション列挙 (ATTACK, DODGE, GUARD, INTERACT, etc.) |
| `input/InputBindings.ts` | キー/ボタンマッピング（データ駆動） |
| `config/gameConfig.ts` | バランス定数（攻撃、ガード、パリィ、ドッジ、硬直、ノックバック減衰） |
| `config/skillConfig.ts` | スキルツリー定義（15スキル、3ツリー、XPテーブル） |
| `systems/TorchLight.ts` | トーチのゆらぎライト効果 |
| `systems/FogOfWar.ts` | フォグ（現在無効、要再実装） |

### UI (`src/lib/`)
| ファイル | 役割 |
|---------|------|
| `components/PhaserGame.svelte` | Phaser↔Svelte ブリッジ |
| `components/hud/HudOverlay.svelte` | HP/ST/Lvバー、フロア表示、NPC会話、フレーバーテキスト、操作ヒント |
| `components/menus/SkillTree.svelte` | スキルツリーUI（キーボード+ゲームパッド完全対応） |
| `stores/gameState.ts` | HP、スタミナ、フロアのSvelteストア |
| `stores/skillState.ts` | XP、レベル、スキルポイント、スキルボーナス |
| `utils/eventBridge.ts` | Phaser↔Svelte通信バス |
| `utils/geminiClient.ts` | Gemini APIクライアント（非同期、フォールバック付き） |

## 壁描画システム（解決済み）

### 構造
壁ブロックは3つのスプライトで構成:
1. **wall_top** — 天井ダイアモンド面。depth = `isoDepth(x, y)`
2. **wall_left** — 左下面(SW)。`(x, y+1)`に壁がなければ描画。depth = `isoDepth(x, y) + 1`
3. **wall_right** — 右下面(SE)。`(x+1, y)`に壁がなければ描画。depth = `isoDepth(x, y) + 1`

### 深度ソート
```
床タイル:     depth = -1000 (固定、エンティティと比較しない)
壁天井:       depth = (x+y)*10
壁側面:       depth = (x+y)*10 + 1
エンティティ: depth = (tileXFrac+tileYFrac)*10
```

### 壁透過 (Diablo 1式)
- **天井(top)のみ**が透過対象。壁側面は常に不透明
- 条件: 壁がプレイヤーより南 (`dx+dy > 0`) かつ距離2.5以内
- alpha 0.15 で透過

## 戦闘システム（実装済み）

### 攻撃
- windup(200ms) → active(150ms) → recovery(300ms)
- スタミナ消費15、range 28、ノックバック80
- **壁透過防止**: Bresenham LOSで攻撃前にプレイヤー↔敵の間の壁をチェック
  - 対角コーナーカット防止（両隣接タイルが壁なら遮断）
  - 安全イテレーション上限付き
  - DOORタイルはLOS通過可能

### ドッジロール
- iフレーム(50ms後200ms間)、スタミナ消費25、クールダウン400ms
- 8方向指定可能

### ガード (L / LBキー)
- ボタンホールド中のみ維持、離すとidle
- 被ダメージ70%軽減 (`guardDamageReduction`)
- 移動速度40% (`guardSpeedMultiplier`)
- 被弾時スタミナ消費12 (`guardStaminaCostPerHit`)
- スタミナ切れでガードブレイク → フルダメージ被弾
- 視覚: 青tint (`Player.GUARD_TINT = 0x4488ff`)
- ノックバック30%に軽減 (`guardKnockbackMultiplier`)

### パリィ
- ガード開始から150ms以内 (`parryWindowMs`) に敵の攻撃を受けた場合
- 効果: ダメージ0、スタミナ10回復、敵を800ms硬直
- 視覚: 画面白フラッシュ + 敵黄色tint
- タイミング: `performance.now()`ベース（timeScale非依存）

### ジャスト回避
- ドッジ開始100ms以内 (`justDodgeWindowMs`) にiフレーム中で敵攻撃回避
- 効果: ゲーム全体スローモ（time + physics + tweens全て）300ms間
- タイムスケール: `justDodgeSlowMoScale = 0.3`
- 復帰: `performance.now()`ベース、`checkSlowMoEnd()`がupdate毎にチェック
- シーン終了時: cleanup()で全timeScale復旧

### 硬直 (Stagger)
- 被弾時20%確率 (`staggerChance`) で500ms硬直 (`staggerDurationMs`)
- プレイヤー・敵共通
- 硬直中: 移動不可、攻撃不可、ノックバック1.5倍
- ノックバック減衰: フレームレート非依存の指数減衰 `Math.pow(knockbackDecayRate, delta/16.67)`
- 視覚: wobble（`visualOffsetX`ツイーン → `updateIsoPosition`で適用）、プレイヤー=オレンジtint、敵=黄色tint

### 敵AI FSM
- patrol → chase(検知120px) → attack(テレグラフ400ms) → cooldown → stunned
- stunned: パリィ/スタッガー時、指数減衰でノックバック
- `applyStun(duration, preserveVelocity)`: ノックバック保持オプション付き
- 攻撃前にLOSチェック（壁越しに攻撃しない）

### 安全設計
- 全 `delayedCall` コールバックに `this.active` チェック
- Entity死亡時: `killTweensOf(this)` + `visualOffsetX = 0` + `clearVisualTint()`
- eventBridgeリスナー: 名前付きメソッドで保持、`cleanup()`で`off()`
- シーンイベント: `cleanup()`で`off()`、蓄積防止

## スキルツリー（実装済み）

### 操作
| 入力 | キーボード | ゲームパッド |
|------|-----------|-------------|
| 移動 | WASD / 矢印 | D-Pad / 左スティック |
| ツリー切替 | Q / E | LB / RB |
| 割り振り | Enter / J / Space | A (Cross) |
| 閉じる | TAB / ESC | B (Circle) / Select / Start |

### 実装詳細
- フォーカスリング: ツリーカラーに合わせた`ring-2`（赤/緑/紫）
- グリッド: データ駆動（行数はスキルデータから動的生成）
- ゲームパッド: 独自 `requestAnimationFrame` ポーリング
  - スティック: 閾値0.5のエッジ検出（前フレーム比較）
- 入力分離: `+page.svelte`(captureフェーズ) で `preventDefault`、SkillTree(bubbleフェーズ)でナビゲーション
- スキルツリー中: ゲームはポーズ状態 (`scene.pause()` + `physics.pause()`)

## 入力設計

### イベントフェーズ分離
```
+page.svelte (capture phase, window)
  ├── TAB/I → toggleSkillTree()
  ├── ESC → closeSkillTree()
  └── スキルツリー中 → preventDefault() のみ（stopPropagation無し）

SkillTree.svelte (bubble phase, window)
  └── WASD/矢印/Q/E/Enter/Space → ナビゲーション

Phaser InputManager (scene内)
  └── ポーズ中は scene.pause() で無効
```

### ゲームパッドポーリング
```
+page.svelte: 常時RAF
  ├── Select(8) → toggleSkillTree
  ├── スキルツリー中 → B(1)/Start(9) で閉じる → early return
  └── スキルツリー外 → B(1) で gamepad-cancel emit

SkillTree.svelte: マウント中のみRAF
  └── D-Pad/スティック/A/LB/RB
```

---

# 次の作業

> 各StepのIDはフェーズ進捗表に対応

## Phase 2: ゲームループ完成（次に着手）

### Step 2-1: スキルツリーのステータス反映 ★最優先
`skillState.ts` の `skillBonuses` ストアにボーナス計算済みだが、Player のパラメータに未接続。
- `Player.ts` に `applySkillBonuses(bonuses: Record<string, number>)` メソッド追加
- `DungeonScene.ts` の `create()` で `skillBonuses` を subscribe して Player に適用
- 対象: maxHealth, attackDamage, speed, maxStamina, damageReduction, attackArc, iframeDuration, attackWindupReduction, visionRadius, healthRegen, lifeSteal, dropRate, staminaRegenRate, berserkDamageBonus, dodgeSpeed, dodgeDuration

### Step 2-2: アイテムドロップ & インベントリ
- `ItemFactory.ts`: ランダムアイテム生成（武器/防具/消耗品）
- ドロップテーブル: 敵タイプ→アイテムプール
- インベントリUI（Svelte、ゲームパッド対応）

### Step 2-3: ゲームブック風イベント ★最速のLLM拡張
- ダンジョン内にランダム配置のイベントポイント
- LLMが状況+選択肢を生成 → プレイヤーが選択 → LLMが結果を生成
- 選択結果: HP回復/ダメージ/アイテム発見/罠
- Svelte UIモーダル、ゲームパッド対応（十字キーで選択、Aで決定）
- 実装:
  ```typescript
  interface GameBookEvent {
    description: string;     // LLM生成: 状況描写
    choices: Array<{
      text: string;          // 選択肢テキスト
      outcome: 'positive' | 'negative' | 'neutral';
    }>;
  }
  ```

### Step 2-4: 敵タイプ追加 & ボス
- `EnemyFactory.ts`: テーマ+フロアレベルから敵ステータスを生成
- 複数の敵タイプ（スライム、ゴースト等）
- フロアボス（専用攻撃パターン）

### Step 2-5: アイテム命名（LLM）
- `fetchGemini('item_description', ...)` でアイテムにフレーバーテキスト付与
- APIタイプ定義は既に存在（`type: 'item_description'`）
- Step 2-2のアイテムシステム完成後に接続

### Step 2-6: オーディオ
- BGM（拠点、ダンジョン、ボス）
- SE（攻撃、ヒット、ドッジ、パリィ、ガード、死亡）

## Phase 3: ワールド & クエスト

### Step 3-1: ワールドマップ
- `src/game/scenes/WorldMapScene.ts` 新規作成
- 複数ダンジョンをノード配置（グラフ構造）
- シード値からダンジョン位置・テーマ・難易度を決定
- HubScene → WorldMapScene → DungeonScene のフロー

### Step 3-2: ダンジョンテーマ（LLM）
- `DungeonGenerator.generate(config, theme)` にテーマパラメータ追加
- テーマ例: 石窟、地下墓地、溶岩洞、氷穴
- テーマごとにタイルカラー、敵タイプ、BGM変更
- LLMがテーマに合わせたフレーバーテキストを生成

### Step 3-3: 固定クエストシステム
- `src/game/config/questConfig.ts` 新規作成
- データ駆動のクエスト定義:
  ```typescript
  interface Quest {
    id: string;
    title: string;
    description: string;
    objective: QuestObjective; // kill_enemies, reach_floor, find_item, talk_npc
    reward: QuestReward;       // xp, gold, item, hub_upgrade
    prerequisites: string[];   // 前提クエストID
  }
  ```
- `src/lib/stores/questState.ts`: アクティブ/完了クエスト管理
- HubScene の掲示板からクエスト受注、DungeonScene で目標検知

### Step 3-4: LLM動的クエスト生成
- Gemini APIに現在のワールド状態を送り、クエストJSONを生成
- `geminiClient.ts` の `fetchGemini('quest', ...)` が既に対応
- プロンプト: 拠点レベル + 完了クエスト一覧 + 最深フロア + 勢力図

### Step 3-5: 拠点発展システム
- `src/lib/stores/hubState.ts` 新規作成
- クエスト完了 → 拠点レベルアップ → NPC追加/ショップ拡張
- 勢力図: 複数勢力のスコアをアルゴリズムで計算

### Step 3-6: ワールドロア & 歴史生成（LLM）
- 勢力変動をLLMに送り、ワールドの歴史的出来事を生成
- `buildSystemPrompt()` に `'world_lore'` タイプ追加

### Step 3-7: イベントナレーション（LLM）
- ボス撃破/クエスト完了時にTRPG風の劇的描写
- `buildSystemPrompt()` に `'event_narration'` タイプ追加

## Phase 4: 永続化 & 品質

### Step 4-1: セーブ/ロード
- LocalStorage → IndexedDB
- ワールド状態、インベントリ、クエスト進行

### Step 4-2: フォグ・オブ・ウォー再実装
- WebGL shader方式推奨（現RenderTexture方式はパフォーマンス問題）

### Step 4-3: プロシージャル敵・アイテム生成
- EnemyFactory + ItemFactory のフル実装
- テーマ+フロアレベルからのパラメトリック生成

## LLM統合インフラ（実装済み）

### 現在稼働中
- `/api/gemini/+server.ts`: サーバーサイドproxy (APIキー保護)
- 4タイプ対応: `flavor_text`, `dialogue`, `quest`, `item_description`
- `geminiClient.ts`: 非同期フェッチ、フォールバック日本語テキスト
- インメモリキャッシュ (5分TTL)

### LLM担当領域の全体像
| 領域 | トリガー | Phase | 依存先 |
|------|---------|-------|--------|
| フレーバーテキスト | フロア遷移時 | ✅完了 | — |
| NPC会話 | NPC Eキー | ✅完了 | — |
| ゲームブックイベント | ダンジョン内ポイント | Phase 2-3 | イベントポイント配置 |
| アイテム命名 | アイテムドロップ時 | Phase 2-5 | アイテムシステム (2-2) |
| テーマ別フレーバー | ダンジョン生成時 | Phase 3-2 | テーマシステム (3-1) |
| クエスト生成 | 掲示板アクセス | Phase 3-4 | クエストシステム (3-3) |
| ワールドロア | 勢力変動時 | Phase 3-6 | 拠点発展 (3-5) |
| イベントナレーション | ボス撃破/クエスト完了 | Phase 3-7 | クエスト (3-3) + ボス (2-4) |

## コマンド
```bash
npm run dev      # 開発サーバー (port 5173)
npm run build    # プロダクションビルド
npm run check    # 型チェック
```

## 環境変数
```
GEMINI_API_KEY=your_key   # .env に設定
```

## 既知の問題
- フォグ・オブ・ウォーは無効（RenderTextureのサイズ/パフォーマンス問題）
- HubScene の壁透過は未実装（DungeonScene のみ）
- スキルツリーのステータスボーナスがゲーム内に反映されていない
- BootScene → HubScene の遷移がHMRで失敗することがある（リロードで解決）
- ゲームパッドポーリングが +page.svelte と SkillTree.svelte で二重に走る（将来的に統合推奨）

## 設計上の意図的選択（変更時は注意）
- **タイミングウィンドウ**: パリィ/ジャスト回避は `performance.now()` ベース（反射神経系なのでtimeScale非依存）
- **硬直**: `stateTimer` (Phaser delta蓄積) ベース（ゲーム内現象なのでスローモ中は長く感じる = 正しい）
- **LOS対角**: 両隣接タイルが壁の場合のみ遮断（片方が開いていれば通過 = 許容的設計）
- **visualOffsetX**: publicフィールド（Phaserツイーンが直接アクセスする必要があるため）
- **ガードブレイク**: スタミナ切れ → フルダメージ（将来的に専用スタン追加を検討）
