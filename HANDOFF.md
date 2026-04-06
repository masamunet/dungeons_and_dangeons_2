# Dungeons & Dangeons 2 — 引き継ぎ資料

## プロジェクト概要
ブラウザベースのDiablo 1風ハクスラアクションRPG。ソウルライク戦闘、プロシージャル生成、LLMフレーバーテキスト。

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

## 1. スキルツリーのステータス反映 ★最優先

### 現状
`skillState.ts` の `skillBonuses` ストアにボーナス計算済みだが、Player のパラメータに未接続。

### 実装
- `Player.ts` に `applySkillBonuses(bonuses: Record<string, number>)` メソッド追加
- `DungeonScene.ts` の `create()` で `skillBonuses` を subscribe して Player に適用
- 対象ステータス:
  ```
  maxHealth, attackDamage, speed, maxStamina, damageReduction,
  attackArc, iframeDuration, attackWindupReduction, visionRadius,
  healthRegen, lifeSteal, dropRate, staminaRegenRate,
  berserkDamageBonus, dodgeSpeed, dodgeDuration
  ```

## 2. プロシージャルワールド生成システム

### ビジョン
Minecraftのようにワールド全体がプロシージャル生成され、LLMが補強する。

### ワールド構造
```
ワールド (World)
  ├── 拠点 (Hub) — 1つ。クエスト結果で発展
  ├── ダンジョン A — プロシージャル生成、複数フロア
  ├── ダンジョン B — 別シード、別テーマ
  └── ... (ワールドマップから選択)
```

### 実装計画

#### Phase 2-1: ワールドマップ
- `src/game/scenes/WorldMapScene.ts` 新規作成
- 複数ダンジョンをノードとして配置（グラフ構造）
- プロシージャル生成: シード値からダンジョン位置・テーマ・難易度を決定
- HubScene → WorldMapScene → DungeonScene のフロー

#### Phase 2-2: ダンジョンテーマ
- `DungeonGenerator.generate(config, theme)` にテーマパラメータ追加
- テーマ例: 石窟、地下墓地、溶岩洞、氷穴
- テーマごとにタイルカラー、敵タイプ、BGM変更
- LLMがテーマに合わせたフレーバーテキストを生成

#### Phase 2-3: プロシージャル敵・アイテム生成
- `EnemyFactory.ts`: テーマ+フロアレベルから敵ステータスを生成
- `ItemFactory.ts`: ランダムアイテム生成（武器/防具/消耗品）
- LLMが生成されたアイテムにフレーバーテキストと名前を付与
- ドロップテーブル: 敵タイプ→アイテムプール

## 3. クエストシステム

### 設計
```
クエストの結果 → 拠点の発展、勢力図の更新（アルゴリズム）
拠点の発展、勢力図の更新 → ワールドの変化（歴史、ロア）（LLM）
```

### Phase 3-1: 固定クエスト
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
- HubScene の掲示板からクエスト受注
- DungeonScene で目標達成を検知 → 完了通知

### Phase 3-2: LLM生成クエスト
- Gemini APIに現在のワールド状態を送り、クエストJSONを生成
- `geminiClient.ts` の `fetchGemini('quest', ...)` が既に対応

### Phase 3-3: 拠点発展システム
- `src/lib/stores/hubState.ts` 新規作成
- クエスト完了 → 拠点レベルアップ → NPC追加/ショップ拡張
- 勢力図: 複数勢力のスコアをアルゴリズムで計算
- 勢力変動をLLMに送り、ワールドの歴史・ロアテキストを生成

## 4. LLM統合の全体設計

### 現在の実装
- `/api/gemini/+server.ts`: サーバーサイドproxy (APIキー保護)
- 4タイプ対応: `flavor_text`, `dialogue`, `quest`, `item_description`
- `geminiClient.ts`: 非同期フェッチ、フォールバック日本語テキスト
- インメモリキャッシュ (5分TTL)

### 拡張計画

#### LLMが担当する領域
| 領域 | トリガー | 入力コンテキスト |
|------|---------|----------------|
| フレーバーテキスト | フロア遷移時 | フロア番号、テーマ |
| NPC会話 | NPC Eキー | NPC名、役職、拠点レベル |
| クエスト生成 | 掲示板アクセス | ワールド状態、完了クエスト |
| アイテム命名 | アイテムドロップ時 | アイテム種別、レアリティ |
| ワールドロア | 勢力変動時 | 勢力スコア、歴史ログ |
| イベントナレーション | ボス撃破/クエスト完了 | 状況詳細 |

#### ゲームブック風体験 (火吹山の魔法使い)
- ダンジョン内の特定ポイント（ランダム配置）で選択肢イベント発生
- LLMが状況+選択肢を生成 → プレイヤーが選択 → LLMが結果を生成
- 選択結果がゲーム内に影響（HP回復/ダメージ/アイテム発見/罠）
- Svelte UIでモーダル表示、ゲームパッド対応（十字キーで選択、Aで決定）

## 5. その他の未実装タスク（優先度順）
1. アイテムドロップ & インベントリシステム
2. より多くの敵タイプ & ボス（EnemyFactory）
3. フォグ・オブ・ウォー再実装（WebGL shader方式推奨）
4. オーディオ（BGM、SE）
5. セーブ/ロード（LocalStorage → IndexedDB）

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
