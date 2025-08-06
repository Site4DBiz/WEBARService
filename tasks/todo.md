# NextJS + Supabase + MindAR Web ARサービス構築 TODOリスト

## 🎯 プロジェクト概要
NextJS、Supabase、MindARを使用したWeb ARサービスの構築

## 📋 フェーズ1: 環境構築とセットアップ

### 1.1 プロジェクト初期化
- [x] NextJS 15のプロジェクト作成（App Router使用）
- [x] TypeScriptの設定
- [x] ESLint/Prettierの設定
- [x] Tailwind CSSのセットアップ
- [x] プロジェクトディレクトリ構造の設計

### 1.2 Supabase統合
- [x] Supabaseプロジェクトの作成
- [x] Supabase CLIのインストールと設定
- [x] 環境変数の設定（.env.local）
- [x] Supabase Clientの初期化
- [x] 認証ヘルパーの実装

### 1.3 MindAR統合
- [x] MindARライブラリの導入
- [x] TypeScript型定義の作成
- [x] Webpackの設定調整（必要に応じて）
- [x] 基本的なARシーンのセットアップ

## 📋 フェーズ2: データベース設計と実装

### 2.1 データベーススキーマ設計
- [x] ユーザーテーブルの設計
- [x] ARコンテンツテーブルの設計
- [x] ARマーカー情報テーブルの設計
- [x] アクセスログテーブルの設計
- [x] Row Level Security (RLS)ポリシーの設定

### 2.2 Supabase Functions
- [x] ARコンテンツアップロード処理
- [x] マーカー画像処理関数
- [x] アナリティクス集計関数
- [x] 画像最適化処理

## 📋 フェーズ3: 認証システム

### 3.1 認証実装
- [x] ログイン/サインアップページの作成
- [x] OAuth認証の実装（Google, GitHub等）
- [x] メール認証フローの実装
- [x] パスワードリセット機能
- [x] プロフィール管理機能

### 3.2 認証ミドルウェア
- [x] 保護されたルートの実装
- [x] JWTトークン検証
- [x] セッション管理
- [x] ロール別アクセス制御

## 📋 フェーズ4: AR機能開発

### 4.1 ARビューアー実装
- [x] カメラアクセス許可の実装
- [x] ARシーンコンポーネントの作成
- [x] マーカー検出処理の実装
- [x] 3Dモデルローディング機能
- [x] ARコンテンツ表示制御

### 4.2 ARコンテンツ管理
- [x] ARマーカー登録フォーム
- [x] 3Dモデルアップロード機能
- [x] テクスチャ/マテリアル管理
- [x] ARコンテンツプレビュー機能
- [x] バージョン管理システム

### 4.3 AR体験の拡張
- [x] アニメーション制御
- [x] インタラクティブ要素の追加
- [x] 音声/効果音の統合
- [x] マルチマーカー対応
- [x] 画像トラッキングの最適化

## 📋 フェーズ5: 管理画面開発

### 5.1 ダッシュボード
- [x] 利用統計ダッシュボード
- [x] ARコンテンツ一覧
- [x] ユーザー管理インターフェース
- [x] アナリティクスビュー
- [x] システムステータス表示

### 5.2 コンテンツ管理
- [x] ARコンテンツCRUD操作
- [x] バッチ処理機能
- [x] コンテンツ承認ワークフロー
- [x] タグ/カテゴリ管理
- [x] 検索/フィルタリング機能

## 📋 フェーズ6: パフォーマンス最適化

### 6.1 フロントエンド最適化
- [x] 画像最適化（next/image）
- [x] コード分割とlazy loading
- [x] Service Workerの実装
- [x] PWA対応
- [x] キャッシュ戦略の実装

### 6.2 AR最適化
- [x] 3Dモデルの圧縮とLOD
- [x] テクスチャ最適化
- [x] マーカー検出精度の改善
- [x] メモリ使用量の最適化
- [x] フレームレートの安定化

## 📋 フェーズ7: セキュリティ実装

### 7.1 セキュリティ対策
- [ ] CSRFトークンの実装
- [ ] XSS対策
- [ ] SQLインジェクション対策
- [ ] ファイルアップロードの検証
- [ ] レート制限の実装

### 7.2 データ保護
- [ ] 個人情報の暗号化
- [ ] セキュアな通信（HTTPS）
- [ ] アクセスログの記録
- [ ] データバックアップ戦略
- [ ] GDPR/個人情報保護対応

## 📋 フェーズ8: テストとデプロイ

### 8.1 テスト実装
- [ ] ユニットテスト（Jest）
- [ ] 統合テスト
- [ ] E2Eテスト（Playwright）
- [ ] AR機能のテスト
- [ ] パフォーマンステスト

### 8.2 CI/CD
- [ ] GitHub Actions設定
- [ ] 自動テストパイプライン
- [ ] Vercelへのデプロイ設定
- [ ] 環境別デプロイ設定
- [ ] モニタリング設定

## 📋 フェーズ9: 運用準備

### 9.1 ドキュメント作成
- [ ] API仕様書
- [ ] 開発者ガイド
- [ ] ユーザーマニュアル
- [ ] AR体験ガイド
- [ ] トラブルシューティングガイド

### 9.2 監視とアラート
- [ ] エラー監視（Sentry）
- [ ] パフォーマンス監視
- [ ] アップタイム監視
- [ ] ログ収集システム
- [ ] アラート通知設定

## 🚀 追加機能（将来的な拡張）

- [ ] ARコンテンツのソーシャル共有
- [ ] マルチユーザーAR体験
- [ ] AR広告プラットフォーム
- [ ] NFT連携
- [ ] リアルタイムコラボレーション
- [ ] AI生成ARコンテンツ
- [ ] 位置情報ベースAR
- [ ] WebXR対応

## 📝 技術スタック

- **フロントエンド**: Next.js 14, TypeScript, Tailwind CSS
- **AR**: MindAR, Three.js, A-Frame
- **バックエンド**: Supabase (PostgreSQL, Auth, Storage, Functions)
- **デプロイ**: Vercel
- **モニタリング**: Sentry, Vercel Analytics
- **テスト**: Jest, React Testing Library, Playwright

## ⚡ 優先度

1. **高**: フェーズ1-4（基本機能の実装）
2. **中**: フェーズ5-6（管理機能と最適化）
3. **低**: フェーズ7-9（セキュリティと運用）

---

最終更新日: 2025/08/06

## 📝 更新履歴

### 2025/08/06 (20)
- フレームレートの安定化の実装完了
  - FrameRateOptimizerクラス（/src/lib/ar/FrameRateOptimizer.ts）
    - RequestAnimationFrame最適化
    - フレームスキップ処理
    - アダプティブクオリティ調整（自動品質調整）
    - フレームタイミングのスムージング
    - ターゲットFPS設定（15-120fps）
    - リアルタイムFPS統計収集
    - フレーム安定性の計算（ジッター、安定率）
    - パフォーマンスベースの品質自動調整
      - レンダースケール調整（50%-100%）
      - シャドウ品質調整（high/medium/low/none）
      - アンチエイリアス切り替え
      - ポストプロセッシング切り替え
      - パーティクル数・描画距離の動的調整
  - RenderingOptimizerクラス（/src/lib/ar/RenderingOptimizer.ts）
    - フラスタムカリング（視錐台カリング）
    - オクルージョンカリング（遮蔽カリング）
    - ジオメトリバッチング（メッシュ結合）
    - インスタンシング（同一メッシュの効率的描画）
    - シャドウマップ最適化
    - 描画順序の最適化
    - レンダリング統計収集
      - ドローコール数
      - ポリゴン数・頂点数
      - テクスチャ・シェーダープログラム数
      - メモリ使用量
  - PerformanceMonitorコンポーネント（/src/components/ar/PerformanceMonitor.tsx）
    - リアルタイムFPSグラフ表示
    - フレーム統計表示（現在/平均/最小/最大FPS）
    - レンダリング統計表示
    - 品質設定の表示と調整
    - パフォーマンス警告表示
    - 折りたたみ可能なUI
    - 位置調整可能（四隅配置）
  - テストページ（/ar/test-framerate）
    - 3Dシーンのパフォーマンステスト
    - オブジェクト数の動的調整（10-500個）
    - パーティクルシステム（0-10000個）
    - 回転速度調整
    - シャドウ・パーティクルの切り替え
    - 最適化機能の個別切り替え
    - パフォーマンスモニターの統合表示

### 2025/08/06 (19)
- メモリ使用量の最適化の実装完了
  - MemoryProfilerクラス（/src/lib/ar/MemoryProfiler.ts）
    - リアルタイムメモリ監視機能
    - メモリ使用量トラッキング（JSヒープ、GPU、テクスチャ）
    - メモリリーク検出機能
    - パフォーマンス統計収集
    - メモリ使用状況のプロファイリング
  - ObjectPoolクラス（/src/lib/ar/ObjectPool.ts）
    - オブジェクトプーリングシステム
    - 頻繁に作成/破棄されるオブジェクトの再利用
    - プールサイズ管理機能
    - 自動メモリ最適化
  - TextureCacheクラスの改善
    - 参照カウント機能追加
    - より効率的なテクスチャメモリ管理
    - LRU（Least Recently Used）キャッシュアルゴリズム
    - メモリ制限の動的調整
  - ModelMemoryManagerクラス（/src/lib/ar/ModelMemoryManager.ts）
    - 3Dモデルメモリ管理システム
    - モデルの自動退避機能
    - モデルキャッシュの最適化
    - メモリ使用量に基づく品質調整
  - GarbageCollectionManagerクラス（/src/lib/ar/GarbageCollectionManager.ts）
    - ガベージコレクション管理システム
    - メモリ圧迫時の自動GC実行
    - GCタイミングの最適化
    - フレームドロップ防止機能
  - MemoryMonitorUIコンポーネント（/src/components/ar/MemoryMonitor.tsx）
    - ビジュアルメモリ使用量監視
    - リアルタイムメモリグラフ表示
    - メモリアラート機能
    - メモリ最適化の推奨事項表示
  - ModelLoaderクラスへの統合
    - メモリプロファイリング機能追加
    - オブジェクトプール連携
    - メモリ使用量最適化処理
    - 自動メモリクリーンアップ
  - テストページ（/ar/test-memory-optimization）
    - メモリ使用量のリアルタイム監視
    - 3Dモデルロード時のメモリプロファイリング
    - オブジェクトプール効果の検証
    - メモリ最適化前後の比較表示

### 2025/08/06 (18)
- テクスチャ最適化の実装完了
  - TextureOptimizerクラス（/src/lib/ar/TextureOptimizer.ts）
    - WebP、JPEG、PNG形式への変換機能
    - KTX2形式対応（Three.jsテクスチャ圧縮）
    - 品質レベル調整（0-100%）
    - 自動リサイズとミップマップ生成
    - Power of Twoサイズへの調整
    - アルファチャンネル処理
  - TextureAtlasGeneratorクラス
    - 複数テクスチャのアトラス生成
    - UV座標マッピング管理
    - 効率的なテクスチャパッキング
  - TextureCacheクラス
    - LRUキャッシュ実装
    - メモリ制限付き管理（デフォルト100MB）
    - 自動GC対応
  - TextureSettingsコンポーネント（/src/components/ar/TextureSettings.tsx）
    - テクスチャ最適化設定UI
    - リアルタイム設定変更
    - 圧縮前後の比較表示
    - ファイルサイズと品質の表示
    - キャッシュ情報表示
  - ModelLoaderへの統合
    - optimizeModelTexturesメソッド追加
    - 全テクスチャ自動検出と最適化
    - 最適化統計情報の収集
  - テストページ（/ar/test-texture-optimization）
    - 3Dモデルビューアー
    - テクスチャ最適化前後の比較
    - パフォーマンス統計表示
    - インタラクティブな設定調整

### 2025/08/06 (17)
- 3Dモデルの圧縮とLODの実装完了
  - ModelCompressorクラス（/src/lib/ar/ModelCompressor.ts）
    - DRACO圧縮対応
    - メッシュ最適化（SimplifyModifier使用）
    - テクスチャ圧縮（WebP/Basis形式対応）
    - マテリアル最適化
    - 頂点データのQuantization
  - LODManagerクラス（/src/lib/ar/LODManager.ts）
    - 自動LOD生成機能
    - 距離ベースの品質調整
    - 動的パフォーマンス調整（FPSベース）
    - モバイル最適化プリセット
    - カリング距離設定
  - UIコンポーネント
    - ModelCompressionSettings: 圧縮設定UI
    - LODSettings: LOD設定UI
  - ModelLoaderクラスへの統合
    - 圧縮・LOD機能の追加
    - 新メソッド: compressModel、createLOD、updateLODs等
  - テストページ（/ar/test-compression-lod）
    - 3Dモデルビューアー
    - リアルタイム圧縮・LOD設定
    - パフォーマンス統計表示
  - 依存ライブラリ追加
    - meshoptimizer: メッシュ最適化
    - three-stdlib: Three.js拡張機能

### 2025/08/06 (16)
- Service Workerの実装完了
  - Service Worker本体の最適化（/public/sw.js v2.0.0）
    - Next.js 14 App Router対応のキャッシュ戦略実装
    - 5つのキャッシュストレージ（静的、ランタイム、画像、AR、Next.jsデータ）
    - 4つのキャッシュ戦略（cacheFirst、networkFirst、staleWhileRevalidate、networkOnly）
    - タイムアウト機能付きフェッチ処理
    - バックグラウンド同期（ARコンテンツ、ユーザーデータ、アナリティクス）
    - プッシュ通知のサポート
  - PWAインストールプロンプトコンポーネント（PWAInstallPrompt.tsx）
    - Android/Chrome用の自動インストールプロンプト
    - iOS Safari用の手動インストール案内
    - インストール状態の検出と管理
    - セッション/ローカルストレージを使用した表示制御
  - オフラインページの改善（/public/offline.html）
    - モダンなUIデザイン
    - キャッシュ状態のリアルタイム表示
    - 接続再試行機能
    - オフライン利用可能機能の案内
  - ServiceWorkerProviderの更新
    - PWAインストールプロンプトの統合
  - 不足UIコンポーネントの修正
    - select.tsx: SelectTrigger、SelectValue、SelectContent追加
    - LoadingSpinner.tsx: PageLoader追加

### 2025/08/06 (15)
- コード分割とlazy loadingの実装完了
  - 共通ローディングコンポーネント（LoadingSpinner、PageLoader、ComponentLoader）の作成
  - dynamic importを使用したlazy loading実装
    - ARコンポーネント（MindARViewer、EnhancedMindARViewer、ARScene等）
    - 3Dモデル関連（ModelViewer、ModelController、ModelLoader）
    - アナリティクス関連（全アナリティクスコンポーネント）
    - ダッシュボード関連（StatCard、Chart系コンポーネント）
    - 管理画面関連（SystemStatus、UsersList、TagCategoryManager等）
    - ARフォーム関連（ARMarkerForm、ARContentForm、ARContentsList等）
  - Suspenseバウンダリの適切な配置
  - ルートレベルでのコード分割（各ページでlazy loading適用）
  - バンドルアナライザーの設定追加（@next/bundle-analyzer）
  - package.jsonにbuild:analyzeスクリプト追加
  - 対象ファイル：
    - 新規作成：6つのlazy loadingラッパーファイル、LoadingSpinner.tsx
    - 更新：ar/page.tsx、analytics/page.tsx、statistics/page.tsx、ar-markers/new/page.tsx、dashboard/ar-contents/page.tsx、next.config.ts、package.json

### 2025/08/06 (14)
- 画像最適化（next/image）の実装完了
  - next.config.tsにAVIF・WebP形式対応、デバイスサイズ、キャッシュTTL設定追加
  - 全コンポーネントでimgタグをnext/imageのImageコンポーネントに置き換え
  - 適切なサイズ指定とレスポンシブ対応
  - オブジェクトフィット（cover/contain）の適切な設定
  - 対象コンポーネント（20ファイル以上）:
    - ContentApprovalWorkflow、ARMarkerVersionHistory、ARContentUpload
    - ar-contents/page、profile関連ページ、ARMarkerForm
    - ARMarkerList、TextureUploader、ar-markers関連ページ
    - UsersList、UserDetail、users関連ページ
    - ImageTrackingSettings、test-trackingページ

### 2025/08/06 (13)
- バッチ処理機能の実装完了
  - バッチジョブ管理画面（/batch-jobs）
  - 5種類のバッチジョブタイプ（marker_optimization、mindar_generation、content_update、data_export、statistics_aggregation）
  - ジョブスケジューリングシステム（最大3並行実行）
  - バッチジョブAPIエンドポイント（GET/POST/PUT/DELETE）
  - ジョブ実行状態の監視とプログレストラッキング
  - ジョブ履歴とキューシステム
  - バッチプロセッサー実装（各ジョブタイプ用）
- コンテンツ承認ワークフローの実装完了
  - ContentApprovalWorkflow: 承認管理UIコンポーネント
  - 承認ステータス管理（draft、pending_review、approved、rejected、published）
  - 承認履歴トラッキング
  - レビュアー向けアクション（承認、却下、公開）
  - 承認ルール設定
  - データベーステーブル（content_approvals、approval_history、approval_rules）
- タグ/カテゴリ管理機能の実装完了
  - TagCategoryManager: タグ・カテゴリ管理UIコンポーネント
  - タグのCRUD操作（色設定、使用回数トラッキング）
  - カテゴリのCRUD操作（階層構造、ソート順、有効/無効設定）
  - デフォルトカテゴリとタグの初期データ
  - content_tags、content_categories関連テーブル
- 検索/フィルタリング機能の強化
  - 承認ワークフローでの検索・フィルター
  - タグ・カテゴリ管理での検索機能
  - バッチジョブのステータス別フィルタリング
- ダッシュボードへのリンク追加
  - バッチジョブ、承認ワークフロー、タグ・カテゴリ管理へのアクセス

### 2025/08/06 (12)
- ARコンテンツCRUD操作の実装完了
  - ARContentForm: 作成・編集用フォームコンポーネント
  - ARContentDetail: 詳細表示コンポーネント（タブ形式）
  - ARコンテンツ作成APIエンドポイント（POST /api/ar-contents）
  - ARコンテンツ更新APIエンドポイント（PUT /api/ar-contents/[id]）
  - ARコンテンツ個別取得APIエンドポイント（GET /api/ar-contents/[id]）
  - ARContentsList統合: モーダルによる作成・編集・詳細表示
  - UIコンポーネントライブラリの実装（button、input、card、badge等）
  - トランスフォーム設定（スケール、位置、回転）
  - ファイルアップロード機能（サムネイル、3Dモデル、マーカー画像）
  - 公開/非公開設定とタグ管理

### 2025/08/06 (11)
- システムステータス表示の実装完了
  - SystemStatus: システムステータス表示コンポーネント
  - システムステータスAPIエンドポイント（/api/system-status）
  - サービス状態監視（データベース、ストレージ、認証、API）
  - システムメトリクス表示（CPU、メモリ、パフォーマンス）
  - アクティビティサマリー（アクティブセッション、総ユーザー数、ARコンテンツ数）
  - エラーログ表示（24時間以内の最新エラー）
  - 自動更新機能（30秒毎）とマニュアルリフレッシュ
  - リアルタイムステータスインジケーター
  - レスポンシブデザイン対応
  - ダッシュボードからのリンク追加（管理者のみアクセス可能）

### 2025/08/06 (10)
- ユーザー管理インターフェースの実装完了
  - UsersList: ユーザー一覧表示コンポーネント
  - UserDetail: ユーザー詳細表示・編集コンポーネント
  - ユーザー管理API（/api/users、/api/users/[id]）
  - 検索・フィルタリング機能（ロール、ステータス、キーワード）
  - ページネーション機能
  - 一括操作機能（アクティベート/デアクティベート/削除）
  - ユーザー統計表示（コンテンツ数、ビュー数、いいね数、フォロワー数）
  - ユーザー詳細編集機能（プロフィール、ロール、ステータス）
  - CSV形式でのユーザーデータエクスポート機能
  - ダッシュボードからのリンク追加

### 2025/08/06 (9)
- ARコンテンツ一覧の実装完了
  - ARContentsList: コンテンツ一覧表示コンポーネント
  - データ取得API（/api/ar-contents）: GET/DELETE/PATCH対応
  - 検索・フィルタリング機能（ステータス、カテゴリ、検索キーワード）
  - ページネーション機能
  - 一括選択・操作機能（公開/アーカイブ/削除）
  - ステータスバッジとコンテンツタイプバッジ
  - 削除確認モーダル
  - ダッシュボードからのリンク追加

### 2025/08/06 (8)
- 利用統計ダッシュボードの実装完了
  - 統計データ表示機能（ユーザー数、コンテンツ数、セッション情報等）
  - AnimatedStatCardコンポーネント：アニメーション付き統計カード
  - ComparisonChartコンポーネント：期間比較チャート
  - ActivityChartコンポーネント：アクティビティチャート
  - RealtimeMetricsコンポーネント：リアルタイムメトリクス表示
  - InteractiveFiltersコンポーネント：インタラクティブフィルタ
  - DrilldownModalコンポーネント：詳細データモーダル
  - ExportButtonコンポーネント：データエクスポート機能（CSV/JSON）
  - 3つのタブ表示（Overview, Trends, Categories）
  - APIエンドポイント（/api/statistics）

### 2025/08/06 (7)
- 画像トラッキングの最適化機能の実装完了
  - ImageTracker: 画像特徴点抽出、品質評価、最適化処理
  - TrackingOptimizer: Kalmanフィルタ、スムージング、予測、オクルージョン対応
  - ImageTrackingSettings: トラッキング設定UIコンポーネント
  - ARMarkerFormへの統合: 画像アップロード時の自動分析と最適化
  - テストページの作成（/ar/test-tracking）
  - パフォーマンスメトリクスの可視化

### 2025/08/06 (6)
- インタラクティブ要素の追加機能の実装完了
  - InteractionManager: Three.jsのRaycasterを使用したインタラクション処理
  - InteractionController: インタラクション設定UIコンポーネント
  - クリック、ホバー、ドラッグ、ピンチ、回転のジェスチャー対応
  - URL開く、効果音再生、色変更、スケール変更のアクション実装
  - AudioManager: Web Audio APIを使用した音声管理システム
  - ARMarkerFormへのインタラクション設定統合
  - テストページの作成（/ar/test-interaction、/ar/test-ar-interaction）

### 2025/08/06 (5)
- アニメーション制御機能の実装完了
  - AnimationManager: アニメーション管理クラス
  - AnimationController: アニメーション制御UIコンポーネント
  - 再生/停止/一時停止機能
  - 再生速度調整（0.1x〜3.0x）
  - ループモード（1回のみ、リピート、往復）
  - アニメーションブレンディング
  - イベントベースのアニメーショントリガー
  - ARMarkerFormへのアニメーション設定統合
  - テストページの作成（/ar/test-animation）

### 2025/08/06 (4)
- テクスチャ/マテリアル管理機能の実装完了
  - TextureManager: テクスチャのアップロード、最適化、キャッシング
  - MaterialManager: マテリアルプリセット、PBRマテリアル対応
  - TextureUploader: ドラッグ&ドロップ対応のテクスチャアップロードUI
  - MaterialEditor: インタラクティブなマテリアル編集UI
  - テクスチャ圧縮機能（WebP形式への自動変換）
  - 12種類のマテリアルプリセット実装
  - ARMarkerFormへの統合

### 2025/08/06 (3)
- ARマーカー登録フォーム拡張機能の実装完了
  - 3Dモデルアップロード機能（GLB、GLTF、FBX、OBJ形式サポート）
  - ModelViewerコンポーネント：3Dモデルプレビュー機能
  - ARContentPreviewコンポーネント：統合プレビュー機能
  - モデル設定オプション（スケール、位置、回転、アニメーション、インタラクション）
  - Supabase Storageにar-modelsバケット追加
  - ファイルバリデーション拡張（3Dモデル形式対応）
  - バージョン管理システムの確認と統合

### 2025/08/06 (2)
- 3Dモデルローディング機能の実装完了
  - ModelLoader: GLTF/GLB、FBX、OBJフォーマットのサポート
  - DRACO圧縮とKTX2テクスチャ圧縮対応
  - モデルキャッシング機能
  - MTLマテリアルサポート（OBJファイル用）
  - ModelController: 3Dモデル表示制御コンポーネント
  - 自動回転、ズーム制御、リセット機能
  - プログレストラッキングとエラーハンドリング
  - テストページの作成（/ar/test-model）
- ARコンテンツ表示制御の実装
  - 基本形状（Cube、Sphere、Cylinder、Torus）のサポート
  - パーティクルシステム
  - テキスト表示機能
  - カスタム3Dモデルの統合
- マーカー検出処理の実装完了
  - MarkerDetectionHandler: マーカー検出イベント処理と信頼度管理
  - MultiMarkerManager: 複数マーカーの同時検出サポート
  - EnhancedMindARViewer: 改良版ARビューアーコンポーネント
  - デバッグモードでの検出状態可視化
  - 検出信頼度とFPS表示機能
- マルチマーカー対応の実装
- マーカー検出精度の改善

### 2025/08/06 (1)
- アナリティクスビューの実装完了
  - AnalyticsPage: アナリティクスダッシュボードのメインページ
  - AnalyticsOverview: 統計概要コンポーネント
  - TimeSeriesChart: 時系列データチャートコンポーネント
  - DeviceAnalytics: デバイス分析コンポーネント
  - GeographicAnalytics: 地理的分析コンポーネント
  - ContentPerformance: コンテンツパフォーマンス分析コンポーネント
  - UserGrowthChart: ユーザー成長チャートコンポーネント
  - EngagementMetrics: エンゲージメント指標コンポーネント
  - ExportButton: データエクスポート機能（CSV/PDF）
  - アナリティクスAPIエンドポイント（/api/analytics）
  - 期間別フィルタリング機能（日次、週次、月次、年次、カスタム）
  - 4つのタブ（Overview、Performance、Demographics、Engagement）
  - リアルタイムデータ更新機能
  - Chart.jsを使用したインタラクティブなグラフ表示
  - ダッシュボードからのリンク追加
