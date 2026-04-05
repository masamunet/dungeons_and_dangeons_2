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
| `scenes/DungeonScene.ts` | メインゲームプレイ。ダンジョン生成、戦闘、フロア遷移 |
| `map/DungeonGenerator.ts` | BSPダンジョン生成（部屋+コリドー+スポーンポイント） |
| `map/DungeonMap.ts` | タイルデータ構造 (TileType enum, isWalkable) |
| `map/MapRenderer.ts` | アイソメトリックタイル描画、壁透過制御 |
| `entities/Entity.ts` | 基底エンティティ。物理ボディ(不可視) + visual(可視) + shadow |
| `entities/Player.ts` | プレイヤー。入力処理、攻撃、ドッジ、スタミナ |
| `entities/Enemy.ts` | 敵AI (FSM: patrol→chase→attack→cooldown) |
| `entities/components/HealthComponent.ts` | HP管理、ダメージ/死亡コールバック |
| `entities/components/StaminaComponent.ts` | スタミナ管理、リジェネ遅延、疲労状態 |
| `input/InputManager.ts` | キーボード+ゲームパッド統合入力 |
| `input/InputAction.ts` | アクション列挙 (ATTACK, DODGE, GUARD, INTERACT, etc.) |
| `input/InputBindings.ts` | キー/ボタンマッピング（データ駆動） |
| `config/gameConfig.ts` | バランス定数（攻撃、ガード、パリィ、ドッジ、硬直） |
| `config/skillConfig.ts` | スキルツリー定義（15スキル、3ツリー、XPテーブル） |
| `systems/TorchLight.ts` | トーチのゆらぎライト効果 |
| `systems/FogOfWar.ts` | フォグ（現在無効、要再実装） |

### UI (`src/lib/`)
| ファイル | 役割 |
|---------|------|
| `components/PhaserGame.svelte` | Phaser↔Svelte ブリッジ |
| `components/hud/HudOverlay.svelte` | HP/ST/Lvバー、フロア表示、NPC会話、フレーバーテキスト |
| `components/menus/SkillTree.svelte` | スキルツリーUI（TAB/Selectで開閉） |
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

### テクスチャ配置座標
```
左面: position = (iso.x - 32, iso.y), origin(0, 0)
       → テクスチャ(0,0) = ダイアモンド左点
右面: position = (iso.x, iso.y), origin(0, 0)
       → テクスチャ(0,16) = ダイアモンド下点, (32,0) = 右点
```

## 現在の戦闘システム

### 実装済み
- **攻撃**: windup(200ms) → active(150ms) → recovery(300ms)、スタミナ消費15
- **ドッジロール**: iフレーム(50ms後200ms間)、スタミナ消費25、クールダウン400ms
- **敵AI FSM**: patrol → chase(検知120px) → attack(テレグラフ400ms) → cooldown
- **ダメージ数字**: アイソメトリック位置に浮遊テキスト
- **攻撃ヒット判定**: プレイヤーの facing 方向に range 分オフセットした座標と敵の距離判定

### 未実装（定数は gameConfig.ts に定義済み）
- ガード (GUARD = LB/Lキー、InputBindings登録済み)
- パリィ (ガード開始150ms以内に被弾)
- ジャスト回避 (ドッジ開始100ms以内に被弾、スローモ300ms)
- 硬直 (被弾時20%確率、500ms)

---

# 次の作業

## 1. 戦闘システム拡張

### 1-1. ガード (LB / L キー)
**ファイル**: `src/game/entities/Player.ts`

- `EntityState`に`'guarding'`追加済み（Entity.ts）
- `InputAction.GUARD`追加済み、LB(4)/Lキーにバインド済み
- ガード中:
  - 移動速度 × 0.4 (`guardSpeedMultiplier`)
  - 被ダメージ × 0.3 (`1 - guardDamageReduction`)
  - 被弾時スタミナ消費12 (`guardStaminaCostPerHit`)
  - スタミナ切れでガード解除、通常被弾
- 視覚: 青系tint (0x4488ff)
- ボタン押している間だけ維持（離すとidle）

### 1-2. パリィ
- ガード開始から150ms以内 (`parryWindowMs`) に敵の攻撃を受けた場合
- 効果:
  - ダメージ0
  - スタミナ10回復 (`parryStaminaRecover`)
  - 攻撃した敵を800ms硬直 (`parryStunDurationMs`)
  - 画面フラッシュ白 + SE
- 視覚: パリィ成功時に白フラッシュ、敵に黄色tint
- **敵側にstunDuration管理が必要** → Enemy.tsにstun状態追加

### 1-3. ジャスト回避
**ファイル**: `src/game/entities/Player.ts`

- ドッジ開始から100ms以内 (`justDodgeWindowMs`) にiフレームで敵攻撃を回避
- 効果:
  - ゲーム全体のタイムスケール0.3で300ms (`justDodgeSlowMoMs`)
  - `this.scene.time.timeScale = 0.3` → 戻す
- 判定: 敵攻撃のactive phaseにプレイヤーのiframe中で距離が近い場合にトリガー
- 視覚: スローモ中に青白いフィルター

### 1-4. 硬直 (Stagger)
**ファイル**: `src/game/entities/Entity.ts`, `Player.ts`, `Enemy.ts`

- `EntityState`に`'staggered'`追加済み
- 被弾時20%確率 (`staggerChance`) で500ms硬直 (`staggerDurationMs`)
- 硬直中: 移動不可、攻撃不可、ノックバック大
- 敵もプレイヤーも同じ確率で硬直
- 視覚: ぐらつきアニメーション（左右に揺れる tween）

### 1-5. 攻撃の壁透過防止 ★新規
**ファイル**: `src/game/scenes/DungeonScene.ts` の `handlePlayerAttack()`

現状: プレイヤーの攻撃は facing 方向に range 分オフセットした座標と敵の距離だけで判定。壁の向こうの敵にも当たる。

修正:
- 攻撃判定前に**プレイヤー→敵の直線上に壁があるか**をチェック
- `DungeonMap.isWalkable()` を使ったレイキャスト:
  ```
  function hasLineOfSight(map, x0, y0, x1, y1): boolean
    // Bresenham的にタイルを辿り、壁があればfalse
  ```
- `handlePlayerAttack()` 内で `hasLineOfSight` が true の敵のみダメージ
- 敵の攻撃(`Enemy.performAttack()`)にも同様のチェック追加

参考: `FogOfWar.ts` に `hasLineOfSight` の実装が既にある（現在無効だが流用可能）

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

#### Phase 3-1: ワールドマップ
- `src/game/scenes/WorldMapScene.ts` 新規作成
- 複数ダンジョンをノードとして配置（グラフ構造）
- プロシージャル生成: シード値からダンジョン位置・テーマ・難易度を決定
- HubScene → WorldMapScene → DungeonScene のフロー

#### Phase 3-2: ダンジョンテーマ
- `DungeonGenerator.generate(config, theme)` にテーマパラメータ追加
- テーマ例: 石窟、地下墓地、溶岩洞、氷穴
- テーマごとにタイルカラー、敵タイプ、BGM変更
- LLMがテーマに合わせたフレーバーテキストを生成

#### Phase 3-3: プロシージャル敵・アイテム生成
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

### Phase 3-4: 固定クエスト
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

### Phase 3-5: LLM生成クエスト
- Gemini APIに現在のワールド状態を送り、クエストJSONを生成
- プロンプト:
  ```
  現在の状態: {拠点レベル, 完了クエスト一覧, 最深到達フロア, 勢力図}
  この状態に基づいて新しいクエストを生成してください。
  JSON形式: {title, description, objective, reward_hint}
  ```
- 生成されたクエストは `type: 'quest'` で `/api/gemini` 経由
- `geminiClient.ts` の `fetchGemini('quest', ...)` が既に対応

### Phase 3-6: 拠点発展システム
- `src/lib/stores/hubState.ts` 新規作成:
  ```typescript
  hubLevel: writable(1),
  unlockedShops: writable(['blacksmith']),
  factionStanding: writable<Record<string, number>>({}),
  hubHistory: writable<string[]>([])  // LLMが生成する歴史ログ
  ```
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

#### プロンプトテンプレート設計
`buildSystemPrompt()` を拡張:
```typescript
case 'world_lore':
  return `${base}\n以下の勢力変動に基づいてワールドの歴史的出来事を1段落で記述:
  ${context}`;
case 'event_narration':
  return `${base}\n以下のゲームイベントをTRPG風に劇的に描写(2-3文):
  ${context}`;
```

#### ゲームブック風体験 (火吹山の魔法使い)
- ダンジョン内の特定ポイント（ランダム配置）で選択肢イベント発生
- LLMが状況+選択肢を生成 → プレイヤーが選択 → LLMが結果を生成
- 選択結果がゲーム内に影響（HP回復/ダメージ/アイテム発見/罠）
- 実装:
  ```typescript
  interface GameBookEvent {
    description: string;     // LLM生成: 状況描写
    choices: Array<{
      text: string;          // 選択肢テキスト
      outcome: 'positive' | 'negative' | 'neutral';  // アルゴリズム決定
    }>;
  }
  ```
- Svelte UIでモーダル表示、ゲームパッド対応（十字キーで選択、Aで決定）

## 5. その他の未実装タスク（優先度順）
1. アイテムドロップ & インベントリシステム
2. スキルツリーのステータス反映（`skillBonuses` → Player パラメータ）
3. より多くの敵タイプ & ボス（EnemyFactory）
4. フォグ・オブ・ウォー再実装（WebGL shader方式推奨）
5. オーディオ（BGM、SE）
6. セーブ/ロード（LocalStorage → IndexedDB）

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
