# Supabase Setup Guide

このガイドでは、Web ARサービスのSupabase環境をセットアップする手順を説明します。

## 📋 前提条件

- Node.js 18以上がインストールされていること
- npmまたはyarnがインストールされていること
- Supabaseアカウントを持っていること（[無料で作成](https://supabase.com)）

## 🚀 セットアップ手順

### 1. Supabaseプロジェクトの作成

1. [Supabase Dashboard](https://app.supabase.com)にログイン
2. 「New Project」をクリック
3. プロジェクト情報を入力:
   - Project name: `webar-service`（任意）
   - Database Password: 強力なパスワードを設定
   - Region: 最寄りのリージョンを選択（Tokyo推奨）
4. 「Create new project」をクリック

### 2. 環境変数の設定

プロジェクトが作成されたら、API設定から必要な情報を取得:

1. Supabase Dashboardでプロジェクトを開く
2. 左サイドバーの「Settings」→「API」を選択
3. 以下の値をコピー:
   - `Project URL`: `https://xxxxx.supabase.co`
   - `anon public`: `eyJhbGciOiJ...`

4. `.env.local`ファイルを更新:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 3. Supabase CLIのインストール（オプション）

ローカル開発環境でSupabaseを使用する場合:

```bash
# セットアップスクリプトを実行
chmod +x scripts/setup-supabase.sh
./scripts/setup-supabase.sh
```

または手動でインストール:

```bash
# macOS (Homebrew)
brew install supabase/tap/supabase

# npm
npm install -g supabase

# その他のインストール方法
# https://supabase.com/docs/guides/cli/getting-started
```

### 4. データベースの初期化

#### オプション A: Supabase Dashboard経由（推奨）

1. Supabase Dashboardの「SQL Editor」を開く
2. `supabase/migrations/20250106_initial_schema.sql`の内容をコピー
3. SQL Editorに貼り付けて実行

#### オプション B: Supabase CLI経由

```bash
# プロジェクトをリンク
supabase link --project-ref your_project_ref

# マイグレーションを実行
supabase db push
```

### 5. ストレージバケットの確認

データベースの初期化により、以下のストレージバケットが自動作成されます:

- `ar-markers`: ARマーカー画像用
- `ar-models`: 3Dモデルファイル用
- `user-avatars`: ユーザーアバター画像用

Supabase Dashboardの「Storage」セクションで確認できます。

## 🔧 開発環境の起動

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

http://localhost:3000 でアプリケーションにアクセスできます。

## 📝 型定義の生成

Supabaseデータベースから型定義を自動生成:

```bash
# Supabase CLIがインストールされている場合
npx supabase gen types typescript --project-id your_project_id > src/types/supabase.ts
```

## 🔐 認証プロバイダーの設定（オプション）

### Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com)でOAuth 2.0クライアントIDを作成
2. Supabase Dashboardの「Authentication」→「Providers」→「Google」を有効化
3. Client IDとClient Secretを設定
4. Redirect URLをGoogle Consoleに追加

### GitHub OAuth

1. [GitHub Developer Settings](https://github.com/settings/developers)でOAuth Appを作成
2. Supabase Dashboardの「Authentication」→「Providers」→「GitHub」を有効化
3. Client IDとClient Secretを設定
4. Authorization callback URLをGitHubに追加

## 📚 プロジェクト構造

```
src/
├── lib/
│   └── supabase/
│       ├── client.ts        # ブラウザ用Supabaseクライアント
│       ├── server.ts        # サーバー用Supabaseクライアント
│       ├── middleware.ts    # 認証ミドルウェア
│       ├── auth-helpers.ts  # 認証ヘルパー関数
│       └── utils.ts         # ユーティリティ関数
├── hooks/
│   └── use-auth.ts         # 認証用カスタムフック
├── types/
│   └── supabase.ts         # Supabase型定義
└── middleware.ts           # Next.jsミドルウェア
```

## 🛠️ トラブルシューティング

### 環境変数が読み込まれない

- `.env.local`ファイルがプロジェクトルートにあることを確認
- 環境変数名が`NEXT_PUBLIC_`で始まっていることを確認（クライアントサイド用）
- 開発サーバーを再起動

### 認証エラー

- Supabase DashboardでAuthentication設定を確認
- Site URLが正しく設定されているか確認
- Redirect URLsにローカル開発URLが含まれているか確認

### データベース接続エラー

- Project URLとAnon Keyが正しくコピーされているか確認
- Supabaseプロジェクトが一時停止していないか確認（無料プランの場合）

## 📖 参考リンク

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase + Next.js Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)