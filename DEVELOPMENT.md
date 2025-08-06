## Tech Stack

### コアフレームワーク

- **Next.js 15.4.4**: 最新の React フレームワーク、App Router を使用
- **React 19.1.0**: 最新の React バージョン
- **TypeScript 5.7.3**: 型安全な開発環境

### スタイリング・UI

- **Tailwind CSS 3.4.1**: ユーティリティファーストCSS フレームワーク
- **@tailwindcss/postcss 4.1.11**: PostCSS プラグイン
- **tailwindcss-animate 1.0.7**: アニメーションユーティリティ
- **next-themes 0.4.6**: ダークモード対応
- **clsx 2.1.1 & tailwind-merge 3.3.1**: クラス名の動的管理

### UIコンポーネント

- **shadcn/ui**: Radix UIベースのコンポーネントライブラリ
  - `@radix-ui/react-*`: Dialog、Select、Tabs、Toast等の各種コンポーネント
  - `class-variance-authority 0.7.1`: コンポーネントバリアントの管理

### アイコン

- **@iconify/react 6.0.0**: 多様なアイコンセット
- **lucide-react 0.536.0**: モダンなアイコンライブラリ
- **@radix-ui/react-icons 1.3.2**: Radix UIアイコン

### 状態管理・フォーム

- **Zustand 5.0.6**: シンプルで軽量な状態管理
- **react-hook-form 7.62.0**: 高性能フォーム管理
- **zod 4.0.14**: スキーマバリデーション
- **@hookform/resolvers 5.2.1**: react-hook-formとzodの統合

### バックエンド・データ

- **Supabase**: バックエンドサービス（認証、データベース、リアルタイム機能）
  - `@supabase/supabase-js 2.52.1`: Supabaseクライアント
  - `@supabase/ssr 0.6.1`: SSR対応

### 機能ライブラリ

- **@hello-pangea/dnd 18.0.1**: ドラッグ&ドロップ機能
- **date-fns 4.1.0**: 日付操作ライブラリ
- **recharts 3.1.0**: チャート表示ライブラリ
- **file-saver 2.0.5**: ファイルダウンロード機能
- **jspdf 3.0.1**: PDF生成ライブラリ
- **web-vitals 5.1.0**: パフォーマンス監視

## Installation

```bash
# リポジトリのクローン
git clone https://github.com/yourusername/timetable-nextjs.git
cd timetable-nextjs

# 依存関係のインストール
npm install

# 開発モードで実行
npm run dev

# 本番用ビルド
npm run build

# 本番モードで実行
npm start

# リンターの実行
npm run lint
```

## Development

プロジェクトは CLAUDE.md のガイドラインに従ってAI支援開発を行っています：

1. 実装前の徹底的な計画
2. tasks/todo.md にチェック可能なアイテムを作成
3. 変更をシンプルかつ最小限に保つ
4. すべての変更を文書化

## Project Structure

```
timetable-nextjs/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/              # 認証が必要なルート
│   │   │   ├── dashboard/       # ダッシュボード
│   │   │   ├── events/          # イベント管理
│   │   │   ├── teams/           # チーム管理
│   │   │   ├── timetable/       # タイムテーブル
│   │   │   ├── reports/         # レポート
│   │   │   ├── settings/        # 設定
│   │   │   ├── profile/         # プロフィール
│   │   │   └── help/            # ヘルプ
│   │   ├── (public)/            # 公開ルート
│   │   │   ├── login/           # ログイン
│   │   │   ├── signup/          # サインアップ
│   │   │   └── reset-password/  # パスワードリセット
│   │   ├── auth/callback/       # 認証コールバック
│   │   ├── api/                 # APIルート
│   │   └── test/                # テストページ
│   ├── components/              # React コンポーネント
│   │   ├── auth/                # 認証関連
│   │   ├── dashboard/           # ダッシュボード関連
│   │   ├── events/              # イベント関連
│   │   ├── teams/               # チーム関連
│   │   ├── timetable/           # タイムテーブル関連
│   │   ├── layout/              # レイアウト関連
│   │   ├── notifications/       # 通知関連
│   │   ├── reports/             # レポート関連
│   │   ├── settings/            # 設定関連
│   │   ├── help/                # ヘルプ関連
│   │   ├── ui/                  # 汎用UIコンポーネント (shadcn/ui)
│   │   └── virtual-scroll/      # バーチャルスクロール
│   ├── hooks/                   # カスタムフック
│   ├── lib/                     # ユーティリティとライブラリ
│   │   ├── auth/                # 認証ロジック
│   │   ├── services/            # サービス層
│   │   ├── stores/              # Zustand ストア
│   │   ├── supabase/            # Supabase クライアント
│   │   └── utils/               # ユーティリティ関数
│   ├── types/                   # TypeScript 型定義
│   ├── styles/                  # スタイル関連
│   ├── contexts/                # React Context
│   └── middleware.ts            # Next.js ミドルウェア
├── public/                      # 静的ファイル
├── supabase/                    # Supabase設定
│   ├── migrations/              # データベースマイグレーション
│   └── templates/               # メールテンプレート
├── scripts/                     # ユーティリティスクリプト
├── tasks/                       # 開発タスクドキュメント
└── CLAUDE.md                    # AI開発ガイドライン
```

## Environment Variables

`.env.local` ファイルに以下の環境変数を設定してください：

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Performance Optimizations

### スタイリング最適化

プロジェクトはTailwind CSS 3.4.1を使用し、以下の最適化を実施：

1. **CSS変数の体系化**
   - デザイントークンによる一貫性のあるスタイリング
   - カラー、フォント、スペーシング、アニメーション、シャドウのプロパティを定義
   - ダークモード対応のテーマ管理

2. **カスタムCSSクラスの最小化**
   - 不要なカスタムクラスを削除し、Tailwindの標準ユーティリティクラスを活用
   - CSSファイルサイズの削減

3. **コンポーネントベースの設計**
   - shadcn/ui (Radix UI) による再利用可能なコンポーネント
   - class-variance-authorityによるバリアント管理
   - tailwind-mergeによる動的なクラス名の最適化

4. **パフォーマンス向上施策**
   - バーチャルスクロールによる大量データの効率的な表示
   - 遅延ローディングによる初期読み込みの高速化
   - web-vitalsによるパフォーマンス監視
   - リアルタイム更新の最適化

## Current Status

このプロジェクトは活発に開発中です。基本的なタイムテーブル機能、認証、リアルタイム同期が実装されています。最新のNext.js 15とReact 19を使用して、モダンで高性能なアプリケーションを構築しています。

### 実装済み機能

- **認証システム**: Supabase Authによるユーザー登録・ログイン・パスワードリセット
- **タイムテーブル管理**: イベントの作成・編集・削除、ドラッグ&ドロップによる時間変更
- **チーム機能**: チーム作成・招待・メンバー管理
- **テンプレート機能**: イベントテンプレートの作成・共有
- **リアルタイム同期**: Supabase Realtimeによる変更の即時反映
- **レスポンシブデザイン**: モバイル・タブレット・デスクトップ対応
- **ダークモード**: システム設定に連動したテーマ切り替え
- **データエクスポート**: CSV・PDF形式でのエクスポート機能

## License

MIT

## Contributing

このプロジェクトに貢献する際は、CLAUDE.md の開発ガイドラインをお読みください。
