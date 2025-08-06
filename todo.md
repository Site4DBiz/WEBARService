# MindARライブラリ導入タスク

## 計画
MindARライブラリをNext.js 15プロジェクトに統合し、WebARアプリケーションを構築する

### タスクリスト
- [x] MindARライブラリの要件定義と調査
- [x] MindARライブラリのインストール
- [x] TypeScript型定義の設定
- [x] ARコンポーネントの作成
- [x] サンプルページの作成と動作確認
- [x] 3Dモデルローディング機能の追加
- [x] AR体験のカスタマイズオプションの拡充
- [x] Gitへのコミット（完了）
- [x] GitHubリポジトリへのプッシュ（完了）

## 要件定義

### MindARライブラリについて
- **目的**: Webブラウザ上でマーカーレスARを実現
- **機能**: 画像認識、顔認識によるAR体験の提供
- **技術**: Three.js/A-Frameとの統合

### 実装要件
1. Next.js 15 App Routerとの互換性確保
2. TypeScriptサポート
3. クライアントサイドレンダリング対応
4. パフォーマンス最適化

## 実装詳細

### 使用するパッケージ
- mind-ar/image: 画像認識AR
- mind-ar/face: 顔認識AR  
- three.js: 3Dレンダリング

### プロジェクト構造
```
src/
├── components/
│   └── ar/
│       ├── MindARViewer.tsx    # ARビューアコンポーネント
│       └── ARScene.tsx          # ARシーン管理
├── hooks/
│   └── useMindAR.ts            # MindAR用カスタムフック
├── types/
│   └── mindar.d.ts             # TypeScript型定義
└── app/
    └── ar/
        └── page.tsx             # ARデモページ
```

## レビュー

### 実装完了内容
- ✅ MindARライブラリの要件定義と調査完了
- ✅ Three.jsパッケージのインストール完了
- ✅ TypeScript型定義ファイルの作成完了
- ✅ ARコンポーネント（MindARViewer, ARScene）の実装完了
- ✅ EnhancedMindARViewerコンポーネントの実装完了
- ✅ ModelLoaderクラスの実装完了（GLTF/FBX/OBJ対応）
- ✅ カスタムフック（useMindAR）の実装完了
- ✅ ARデモページ（/ar）の作成完了
- ✅ Enhanced ARページ（/ar/enhanced）の作成完了
- ✅ MindARセットアップガイドの作成完了
- ✅ ターゲット画像とmindファイルの配置完了
- ✅ メインページから両ARページへのリンク追加完了
- ✅ ビルドエラーの修正とコードフォーマット完了

### 技術詳細
- **MindARライブラリ**: CDN版を使用（npm版はcanvasビルドエラーのため）
- **Three.js**: v0.179.1を使用
- **実装方式**: Next.js 15 App Router対応のクライアントコンポーネント
- **AR機能**: 顔認識と画像認識の両方をサポート
- **3Dモデルローディング**: GLTF、FBX、OBJ形式対応
- **ARコンテンツタイプ**: 基本図形、パーティクル、テキスト、カスタム3Dモデル

### 新規追加機能
1. **拡張ARビューア（EnhancedMindARViewer）**
   - 複数のARコンテンツタイプ選択
   - ライティング設定オプション
   - リアルタイムステータス表示
   - パーティクルエフェクト

2. **3Dモデルローダー（ModelLoader）**
   - 複数形式のサポート
   - アニメーション再生機能
   - トランスフォーム設定

3. **ドキュメント整備**
   - MindARセットアップガイド（docs/MINDAR_SETUP.md）
   - ターゲット画像生成手順
   - トラブルシューティング

### 今後の改善点
1. 実際のカスタムターゲット画像の生成ツール統合
2. マルチマーカー対応
3. WebXR APIの統合検討
4. より高度な3Dインタラクション機能

---

# マーカー画像処理機能の実装

## 計画
AR用マーカー画像の処理、検証、最適化機能の実装

### タスクリスト
- [x] マーカー画像処理関数の要件定義
- [x] 既存のAR関連コードの調査
- [x] マーカー画像アップロード機能の実装
- [x] マーカー画像のバリデーション処理実装
- [x] 画像処理APIエンドポイントの作成
- [ ] MindARターゲット画像(.mind)生成機能の実装
- [ ] テストとエラーハンドリング
- [ ] 動作確認とGitへのコミット

## 要件定義

### マーカー画像処理の目的
- ARトラッキング用画像の品質検証
- 画像の最適化とサムネイル生成
- MindARフォーマットへの変換準備

### 実装機能
1. **画像検証機能**
   - サイズ、形式、解像度のチェック
   - ARトラッキング適性の評価
   - 品質スコアの算出

2. **画像最適化機能**
   - リサイズと圧縮
   - コントラスト調整
   - シャープネス強化

3. **UI統合**
   - リアルタイム品質フィードバック
   - サムネイルプレビュー
   - 警告メッセージ表示

## 実装詳細

### 作成ファイル
1. `/src/lib/utils/marker-processor.ts` - 画像処理ユーティリティ
2. `/src/app/api/ar/process-marker/route.ts` - 画像処理APIエンドポイント

### 更新ファイル
1. `/src/components/ar/ARContentUpload.tsx` - UIコンポーネントの改善

### 実装された機能
- ✅ 画像バリデーション（サイズ、形式、解像度）
- ✅ 品質スコア計算（0-100）
- ✅ 画像最適化（リサイズ、圧縮、シャープネス）
- ✅ サムネイル生成
- ✅ リアルタイムフィードバックUI
- ✅ 非同期画像処理

## レビュー

### 完了内容
- マーカー画像処理のためのユーティリティ関数群を実装
- 画像品質評価アルゴリズムの実装
- APIエンドポイントでの認証とエラーハンドリング
- UIでのリアルタイム品質表示機能

### 技術詳細
- **画像処理**: Sharp.jsライブラリを使用
- **品質評価**: 解像度、コントラスト、エントロピーベースの評価
- **最適化**: JPEG圧縮、シャープネス調整、コントラスト強化

### 今後の改善点
1. MindARコンパイラーの統合（.mindファイル生成）
2. バッチ処理対応（複数画像の一括処理）
3. 画像特徴点の可視化
4. プリセット設定の追加

---

# ユーザーテーブルの設計と実装

## 計画
Supabaseを使用したユーザー管理システムの構築

### タスクリスト
- [x] ユーザーテーブルの要件定義
- [x] Supabaseのセットアップと環境変数の設定
- [x] ユーザーテーブルのスキーマ設計
- [x] Supabaseクライアントの設定
- [x] ユーザー認証機能の実装
- [x] ユーザーCRUD操作の実装
- [x] 動作確認とテスト
- [x] Gitへのコミットとプッシュ（完了）

---

# ロール別アクセス制御の実装

## 計画
ユーザーのロールに基づいたアクセス制御システムの実装

### タスクリスト
- [x] ロール別アクセス制御の要件定義と設計
- [x] ユーザーロールテーブルの作成とマイグレーション
- [x] ロール管理用の型定義とAPIの実装
- [x] 認証ミドルウェアとロールガードの実装
- [x] 管理者ダッシュボードの作成
- [x] コンテンツアクセス制御の実装
- [x] 動作確認とテスト
- [x] todo.mdの更新とGitへのコミット

## 要件定義

### ユーザーロール
1. **admin** - システム管理者（全権限）
2. **creator** - コンテンツ作成者（自分のコンテンツの作成・編集・削除）
3. **viewer** - 閲覧者（公開コンテンツの閲覧のみ）
4. **moderator** - モデレーター（コンテンツの承認・管理）

### 実装機能
1. **データベース設計**
   - user_role型の定義（admin, creator, viewer, moderator）
   - permissionsテーブル（リソースとアクションの権限定義）
   - role_assignmentsテーブル（ロール変更履歴）
   - Row Level Security (RLS) ポリシー

2. **API層**
   - getUserRole - ユーザーのロール取得
   - checkPermission - 権限チェック
   - assignRole - ロール割り当て
   - getPermissions - 権限一覧取得
   - ロールヘルパー関数（isAdmin, isCreator等）

3. **コンポーネント**
   - RoleGuard - ページレベルのアクセス制御
   - ConditionalRender - UIコンポーネントの条件付き表示
   - 管理者ダッシュボード

4. **統合**
   - ARコンテンツアップロード（creator以上のみ）
   - ダッシュボードでのロール表示
   - 管理者パネルへのアクセス（adminのみ）

## 実装詳細

### 作成ファイル
1. `/supabase/migrations/20250806000000_add_user_roles.sql` - ロールテーブルマイグレーション
2. `/src/lib/api/roles.ts` - ロール管理API
3. `/src/hooks/use-role.ts` - ロール関連フック
4. `/src/components/auth/RoleGuard.tsx` - アクセス制御コンポーネント
5. `/src/components/auth/AuthPageContent.tsx` - 認証ページコンテンツ（Suspense対応）
6. `/src/app/admin/page.tsx` - 管理者ダッシュボード

### 更新ファイル
1. `/src/types/database.ts` - UserRole型とテーブル定義追加
2. `/src/app/dashboard/page.tsx` - ロール表示と条件付きリンク
3. `/src/app/ar-content/upload/page.tsx` - ロールベースアクセス制御追加
4. `/src/app/auth/page.tsx` - Suspenseバウンダリ追加

### 実装された機能
- ✅ 4つのユーザーロール（admin, creator, viewer, moderator）
- ✅ データベースレベルの権限管理
- ✅ Row Level Security (RLS) による安全なアクセス制御
- ✅ ロール変更履歴の追跡
- ✅ 管理者ダッシュボードでのユーザー管理
- ✅ ページレベルのアクセス制御
- ✅ UIコンポーネントの条件付き表示
- ✅ ARコンテンツ作成権限の制御

## レビュー

### 完了内容
- Supabaseでロールベースアクセス制御システムを完全実装
- 管理者がユーザーのロールを管理できるダッシュボードを作成
- 各ロールに応じた機能へのアクセス制御を実装
- データベースレベルでのセキュアな権限管理

### 技術詳細
- **データベース**: PostgreSQL with RLS
- **認証**: Supabase Auth
- **フロントエンド**: Next.js 15 with TypeScript
- **アクセス制御**: RoleGuard コンポーネント
- **権限管理**: データベース関数とRLSポリシー

### セキュリティ対策
1. Row Level Security (RLS) による行レベルのアクセス制御
2. データベース関数による権限チェック
3. サーバーサイドでのロール検証
4. クライアントサイドでのUIレベル制御

### 今後の改善点
1. ロールの有効期限機能の実装
2. より細かい権限設定（カスタムパーミッション）
3. ロール継承機能
4. 監査ログの詳細化

---

# ログイン/サインアップページの改善

## 計画
既存の認証ページをより洗練されたUIとUXに改善

### タスクリスト
- [x] ログイン/サインアップページの要件定義
- [x] 既存の認証ページの確認と改善
- [x] UIコンポーネントの実装（フォーム、バリデーション）
- [x] レスポンシブデザインの実装
- [x] エラーハンドリングとユーザーフィードバック
- [x] パスワードリセット機能の実装
- [x] ソーシャルログイン機能の実装
- [x] 動作確認とテスト

## 要件定義

### 改善ポイント
1. **UIの改善**
   - モダンなデザインとアニメーション
   - フォームバリデーションの強化
   - ローディング状態の改善
   - パスワード強度インジケーター

2. **機能の追加**
   - パスワードリセット機能
   - ソーシャルログイン（Google、GitHub）
   - Remember me オプション
   - 利用規約とプライバシーポリシーへのリンク

3. **レスポンシブデザイン**
   - モバイル最適化
   - グラデーション背景

## 実装詳細

### 作成ファイル
1. `/src/components/auth/AuthForm.tsx` - 共通認証フォームコンポーネント
2. `/src/components/auth/SocialAuth.tsx` - ソーシャルログインコンポーネント
3. `/src/app/auth/reset-password/page.tsx` - パスワードリセットページ
4. `/src/app/auth/update-password/page.tsx` - パスワード更新ページ
5. `/src/app/auth/callback/page.tsx` - OAuth コールバックページ

### 更新ファイル
1. `/src/app/auth/login/page.tsx` - ログインページの改善
2. `/src/app/auth/signup/page.tsx` - サインアップページの改善

### 実装された機能
- ✅ モダンなUIデザイン（グラデーション背景、シャドウ、ラウンドデザイン）
- ✅ フォームバリデーション（メール形式、パスワード強度、確認パスワード）
- ✅ パスワード強度インジケーター
- ✅ パスワード表示/非表示トグル
- ✅ ソーシャルログイン（Google、GitHub）
- ✅ パスワードリセット機能
- ✅ Remember me オプション
- ✅ レスポンシブデザイン
- ✅ エラーハンドリングとフィードバック
- ✅ ローディング状態の表示
- ✅ 利用規約とプライバシーポリシーへのリンク

## レビュー

### 完了内容
- 既存の認証ページを改善し、よりモダンでユーザーフレンドリーなUIを実装
- パスワードリセット機能とソーシャルログイン機能を追加
- フォームバリデーションとエラーハンドリングを強化
- レスポンシブデザインでモバイル対応

### 技術詳細
- **UIライブラリ**: lucide-react（アイコン）
- **スタイリング**: Tailwind CSS
- **認証**: Supabase Auth
- **ソーシャルログイン**: Google、GitHub OAuth

### 今後の改善点
1. 二要素認証（2FA）の実装
2. メール確認リマインダー
3. ログイン履歴の表示
4. セッション管理の強化

---

# ユーザーテーブルの設計と実装

### ユーザーテーブルの目的
- WebARアプリケーションのユーザー管理
- ユーザー認証とプロファイル管理
- ARコンテンツの所有権管理
- ユーザーの活動履歴追跡

### 機能要件
1. **認証機能**
   - メールアドレスによるサインアップ/サインイン
   - パスワードリセット機能
   - セッション管理

2. **プロファイル管理**
   - ユーザー基本情報の管理
   - アバター画像のアップロード
   - プロファイルの公開/非公開設定

3. **ARコンテンツ管理**
   - 作成したARコンテンツとの関連付け
   - お気に入りコンテンツの管理
   - 使用履歴の記録

### テーブル設計

#### 1. users（Supabase Auth提供）
- id: UUID（主キー）
- email: 文字列（ユニーク）
- created_at: タイムスタンプ

#### 2. profiles（カスタムテーブル）
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE,
  full_name VARCHAR(255),
  avatar_url TEXT,
  bio TEXT,
  website VARCHAR(255),
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3. user_ar_contents（ARコンテンツ管理）
```sql
CREATE TABLE user_ar_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content_type VARCHAR(50), -- 'image', 'face', '3d_model'
  target_file_url TEXT,
  model_file_url TEXT,
  metadata JSONB,
  is_public BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 4. user_favorites（お気に入り管理）
```sql
CREATE TABLE user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content_id UUID REFERENCES user_ar_contents(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, content_id)
);
```

#### 5. user_activity_logs（活動履歴）
```sql
CREATE TABLE user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL, -- 'view', 'create', 'update', 'delete'
  resource_type VARCHAR(50), -- 'ar_content', 'profile'
  resource_id UUID,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Row Level Security (RLS) ポリシー

1. **profiles テーブル**
   - 自分のプロファイルは読み書き可能
   - 公開プロファイルは誰でも読み取り可能

2. **user_ar_contents テーブル**
   - 自分のコンテンツは読み書き可能
   - 公開コンテンツは誰でも読み取り可能

3. **user_favorites テーブル**
   - 自分のお気に入りのみ読み書き可能

4. **user_activity_logs テーブル**
   - 自分の活動履歴のみ読み取り可能
   - システムのみ書き込み可能

## レビュー

### 実装完了内容
- ✅ ユーザーテーブルの要件定義とスキーマ設計完了
- ✅ Supabaseクライアントの設定（ブラウザ・サーバー・ミドルウェア）
- ✅ 認証ページの実装（ログイン・サインアップ）
- ✅ ダッシュボードページの実装
- ✅ プロファイル管理APIの実装
- ✅ ARコンテンツ管理APIの実装
- ✅ SQLマイグレーションファイルの作成
- ✅ Row Level Securityポリシーの設定
- ✅ TypeScript型定義の作成

### 実装ファイル一覧
1. **Supabaseクライアント設定**
   - `/src/lib/supabase/client.ts`
   - `/src/lib/supabase/server.ts`
   - `/src/lib/supabase/middleware.ts`
   - `/src/middleware.ts`

2. **認証関連ページ**
   - `/src/app/auth/login/page.tsx`
   - `/src/app/auth/signup/page.tsx`
   - `/src/app/dashboard/page.tsx`

3. **コンポーネント**
   - `/src/components/dashboard/UserProfile.tsx`
   - `/src/components/dashboard/SignOutButton.tsx`

4. **API層**
   - `/src/lib/api/profiles.ts`
   - `/src/lib/api/ar-contents.ts`

5. **型定義**
   - `/src/types/database.ts`

6. **データベース**
   - `/supabase/migrations/20240101000000_create_user_tables.sql`

### 今後の実装予定
1. プロファイル編集機能
2. ARコンテンツ作成・編集UI
3. お気に入り機能の実装
4. アクティビティログの表示
5. アバター画像のアップロード機能

---

# ARマーカー登録フォームの実装

## 計画
独立したARマーカー管理システムの構築

### タスクリスト
- [x] ARマーカー登録フォームの要件定義
- [x] 既存のARコンテンツ関連コードの調査
- [x] ARマーカー登録フォームコンポーネントの作成
- [x] マーカー情報のデータベーステーブル作成
- [x] マーカー登録APIエンドポイントの実装
- [x] マーカー一覧表示機能の実装
- [x] マーカー編集・削除機能の実装
- [x] 動作確認とエラーハンドリング
- [x] Gitへのコミットとプッシュ

## 要件定義

### ARマーカー管理システムの目的
- WebARアプリケーションで使用するマーカー画像の一元管理
- マーカー品質の自動評価とフィードバック
- マーカーの共有と再利用の促進
- マーカー使用統計の収集と分析

### 実装機能
1. **マーカー登録フォーム**
   - 画像アップロード（JPEG、PNG、WebP対応）
   - リアルタイム品質評価
   - メタデータ設定（名前、説明、カテゴリー、タグ）
   - AR設定（ターゲットサイズ）
   - 公開/非公開設定

2. **マーカー管理**
   - 一覧表示（グリッド/リストビュー）
   - フィルタリング（カテゴリー、タグ、公開状態）
   - 検索機能
   - ページネーション
   - お気に入り機能

3. **マーカー編集・削除**
   - 情報編集（画像以外）
   - 削除機能（所有者のみ）
   - 権限管理

## 実装詳細

### 作成ファイル
1. **コンポーネント**
   - `/src/components/ar/ARMarkerForm.tsx` - マーカー登録フォーム
   - `/src/components/ar/ARMarkerList.tsx` - マーカー一覧表示

2. **ページ**
   - `/src/app/ar-markers/page.tsx` - マーカー管理メインページ
   - `/src/app/ar-markers/new/page.tsx` - 新規マーカー登録ページ
   - `/src/app/ar-markers/[id]/edit/page.tsx` - マーカー編集ページ

3. **API**
   - `/src/app/api/ar-markers/route.ts` - CRUD操作エンドポイント

4. **データベース**
   - `/supabase/migrations/20250806_ar_markers_table.sql` - テーブル定義
   - `ar_markers` - メインテーブル
   - `ar_marker_usage` - 使用履歴
   - `ar_marker_favorites` - お気に入り

5. **型定義**
   - `/src/types/database.ts` - TypeScript型定義を更新

### 技術詳細
- **画像処理**: 既存のmarker-processorユーティリティを活用
- **ストレージ**: Supabase Storage（ar-markersバケット）
- **認証**: Supabase Auth（ロールベースアクセス制御）
- **UI**: Tailwind CSS、lucide-react icons
- **品質評価**: リアルタイム画像分析API

## レビュー

### 実装完了内容
- ✅ 完全なCRUD機能を持つARマーカー管理システム
- ✅ リアルタイム品質評価機能
- ✅ レスポンシブデザイン（モバイル対応）
- ✅ ロールベースアクセス制御
- ✅ お気に入り機能とビュー数トラッキング
- ✅ カテゴリー分類とタグ管理
- ✅ 公開/非公開設定

### セキュリティ対策
1. Row Level Security (RLS)による行レベルアクセス制御
2. 所有者のみ編集・削除可能
3. 公開マーカーの適切な共有制御
4. ファイルサイズとタイプの検証

### 今後の改善点
1. ~~マーカー画像の更新機能~~ ✅ 実装完了
2. MindARフォーマット（.mind）への自動変換
3. ~~バッチアップロード機能~~ ✅ 実装完了
4. ~~詳細な使用統計ダッシュボード~~ ✅ 実装完了
5. マーカーのバージョン管理

### 追加実装内容（2025-08-06）

#### マーカー画像更新機能
- 編集ページで画像の更新が可能に
- 新しい画像アップロード時に古い画像を自動削除
- 品質評価機能の統合

#### バッチアップロード機能
- `/ar-markers/batch` ページの実装
- 複数画像の一括アップロード
- 進捗表示とエラーハンドリング
- CSV形式での結果エクスポート

#### 統計ダッシュボード
- `/ar-markers/stats` ページの実装
- 主要指標の表示（総数、公開/非公開、ビュー数、品質スコア）
- 日別アクティビティグラフ
- カテゴリー分布表示
- 統計データのCSVエクスポート