# GitHub組織へのリポジトリ作成ガイド

このガイドは、既存のプロジェクトをGitHub組織のリポジトリとして作成・プッシュする手順をまとめたものです。

## Cline経由でのリポジトリ作成時の注意事項

Clineを使用してリポジトリ作成を依頼する場合は、以下の情報を必ず確認してください：

1. **リポジトリ名**: 作成するリポジトリの名前
2. **組織名**: リポジトリを作成する組織（個人アカウントか組織アカウント）
3. **公開設定**: プライベートまたはパブリック

例：「YOUR-ORG組織にyour-repository-nameという名前でプライベートリポジトリを作成してください」

## 目次

1. [概要](#概要)
2. [前提条件](#前提条件)
3. [事前準備](#事前準備)
4. [リポジトリ作成手順](#リポジトリ作成手順)
5. [トラブルシューティング](#トラブルシューティング)
6. [ベストプラクティス](#ベストプラクティス)
7. [コマンドリファレンス](#コマンドリファレンス)
8. [実例](#実例)
9. [まとめ](#まとめ)

## 概要

このガイドでは、ローカルプロジェクトをGitHub組織のリポジトリとして設定する方法を説明します。個人アカウントから組織アカウントへの移行や、新規プロジェクトの組織リポジトリ化に対応しています。

## 前提条件

- Git がインストールされていること
- GitHub アカウントを持っていること
- 対象の GitHub 組織へのリポジトリ作成権限があること
- ローカルプロジェクトが存在すること

## 事前準備

### 1. GitHub CLI のインストール

GitHub CLIを使用すると、コマンドラインから簡単にリポジトリを作成できます。

```bash
# macOS (Homebrew)
brew install gh

# Windows (Scoop)
scoop install gh

# Linux (Snap)
sudo snap install gh
```

### 2. GitHub CLI の認証

```bash
# 認証開始
gh auth login

# 以下のプロンプトに従って選択：
# - GitHub.com を選択
# - プロトコルは HTTPS または SSH を選択
# - ブラウザ認証（推奨）または Personal Access Token を選択
```

### 3. SSH キーの設定（オプション）

SSH を使用する場合は、事前に SSH キーを設定します：

```bash
# SSH キーの存在確認
ls -la ~/.ssh/

# SSH キーの生成（存在しない場合）
ssh-keygen -t ed25519 -C "your_email@example.com"

# SSH エージェントの起動
eval "$(ssh-agent -s)"

# SSH キーの追加
ssh-add ~/.ssh/id_ed25519

# 公開鍵をクリップボードにコピー（macOS）
pbcopy < ~/.ssh/id_ed25519.pub

# GitHubに公開鍵を登録
# GitHub > Settings > SSH and GPG keys > New SSH key
```

## リポジトリ作成手順

### ステップ 1: プロジェクトの準備

```bash
# プロジェクトディレクトリに移動
cd /path/to/your/project

# Gitリポジトリの初期化（まだの場合）
git init

# .gitignore の作成または確認
# プロジェクトに応じた .gitignore を用意
```

### ステップ 2: 初回コミット

```bash
# すべてのファイルをステージング
git add -A

# または特定のファイルのみ
git add .gitignore README.md src/

# コミット
git commit -m "feat: 初回コミット"
```

### ステップ 3: GitHub 組織にリポジトリ作成

#### 方法 1: GitHub CLI を使用（推奨）

```bash
# 組織にプライベートリポジトリを作成
gh repo create 組織名/リポジトリ名 --private --description "プロジェクトの説明"

# パブリックリポジトリの場合
gh repo create 組織名/リポジトリ名 --public --description "プロジェクトの説明"

# 例
gh repo create YOUR-ORG/your-project-name --private --description "プロジェクトの説明"
```

#### 方法 2: 既存リポジトリからの転送

GitHub Web インターフェースから：
1. Settings → Transfer ownership
2. 転送先の組織を選択
3. 確認して転送

### ステップ 4: リモート設定とプッシュ

```bash
# リモートURLの設定（HTTPS）
git remote add origin https://github.com/組織名/リポジトリ名.git

# または SSH
git remote add origin git@github.com:組織名/リポジトリ名.git

# 現在のリモート設定を確認
git remote -v

# メインブランチをプッシュ
git push -u origin main

# または master ブランチの場合
git push -u origin master
```

### ステップ 5: 既存リモートの変更（必要な場合）

```bash
# 既存のリモートを確認
git remote -v

# リモートURLを変更
git remote set-url origin https://github.com/新組織名/リポジトリ名.git

# 不要なリモートを削除
git remote remove old-remote
```

## トラブルシューティング

### SSH 認証エラー

```bash
# エラー例
git@github.com: Permission denied (publickey).

# 解決方法
# 1. SSH接続をテスト
ssh -T git@github.com

# 2. HTTPSに切り替え
git remote set-url origin https://github.com/組織名/リポジトリ名.git
```

### リポジトリが見つからないエラー

```bash
# エラー例
remote: Repository not found.

# 解決方法
# 1. リポジトリの存在を確認
gh repo view 組織名/リポジトリ名

# 2. 権限を確認
# 3. リポジトリを作成してから再試行
```

### 権限エラー

```bash
# エラー例
ERROR: You don't have permission to create repositories in this organization

# 解決方法
# 1. 組織の管理者に権限付与を依頼
# 2. 個人アカウントで作成後、組織に転送
```

### 認証トークンエラー

```bash
# エラー例
Bad credentials

# 解決方法
# GitHub CLIの再認証
gh auth refresh
```

## ベストプラクティス

### 1. .gitignore の設定

プロジェクトタイプに応じた適切な .gitignore を使用：

```gitignore
# 一般的な除外項目
.DS_Store
*.log
*.tmp
.env
.vscode/
.idea/

# Node.js
node_modules/
dist/
build/

# Python
__pycache__/
*.py[cod]
venv/
.venv/

# その他
*.swp
*.swo
.cache/
```

### 2. コミットメッセージ規約

```bash
# 推奨フォーマット
<type>: <subject>

# type の例
feat: 新機能
fix: バグ修正
docs: ドキュメント
style: コードスタイル
refactor: リファクタリング
test: テスト
chore: その他の変更

# 例
git commit -m "feat: ユーザー認証機能を追加"
git commit -m "fix: ログイン時のエラーを修正"
git commit -m "docs: READMEにインストール手順を追加"
```

### 3. ブランチ戦略

```bash
# 推奨ブランチ名
main          # メインブランチ
develop       # 開発ブランチ
feature/xxx   # 機能開発
hotfix/xxx    # 緊急修正
release/xxx   # リリース準備

# ブランチ作成例
git checkout -b feature/user-authentication
git checkout -b hotfix/login-error
```

### 4. README.md の作成

プロジェクトには必ず README.md を含めましょう：

```markdown
# プロジェクト名

プロジェクトの簡潔な説明

## 機能

- 主要機能1
- 主要機能2
- 主要機能3

## インストール

```bash
# インストール手順
npm install
```

## 使い方

```bash
# 実行方法
npm start
```

## ライセンス

MIT License
```

## コマンドリファレンス

### Git 基本コマンド

```bash
# 状態確認
git status

# 差分確認
git diff
git diff --staged

# ログ確認
git log --oneline -10
git log --graph --pretty=oneline --abbrev-commit

# ブランチ操作
git branch -a              # すべてのブランチを表示
git checkout -b new-branch # 新規ブランチ作成＆切替
git branch -d branch-name  # ブランチ削除

# リモート操作
git remote -v              # リモート一覧
git fetch origin           # リモートの更新を取得
git pull origin main       # プル
git push origin main       # プッシュ
```

### GitHub CLI コマンド

```bash
# 認証関連
gh auth login              # ログイン
gh auth status             # 認証状態確認
gh auth refresh            # トークン更新
gh auth logout             # ログアウト

# リポジトリ操作
gh repo create             # リポジトリ作成
gh repo clone owner/repo   # クローン
gh repo view owner/repo    # リポジトリ情報表示
gh repo list owner         # リポジトリ一覧

# Issue/PR 操作
gh issue create            # Issue作成
gh issue list              # Issue一覧
gh pr create               # Pull Request作成
gh pr list                 # PR一覧
```

### 便利なエイリアス設定

```bash
# ~/.gitconfig に追加
[alias]
    st = status
    co = checkout
    br = branch
    ci = commit
    last = log -1 HEAD
    unstage = reset HEAD --
    visual = !gitk
```

## 実例（サンプル）

以下は作業の流れの例です：

1. **既存プロジェクトの確認**
   ```bash
   cd /path/to/your/project
   git status
   ```

2. **変更のコミット**
   ```bash
   git add -A
   git commit -m "feat: 初期機能の実装"
   ```

3. **GitHub CLI のインストールと認証**
   ```bash
   brew install gh
   gh auth login
   ```

4. **組織にリポジトリ作成**
   ```bash
   gh repo create YOUR-ORG/your-repository-name --private --description "プロジェクトの説明"
   ```

5. **リモート設定とプッシュ**
   ```bash
   git remote add origin https://github.com/YOUR-ORG/your-repository-name.git
   git push -u origin main
   ```

## まとめ

このガイドに従うことで、スムーズにGitHub組織へのリポジトリ作成とコード管理ができます。重要なポイント：

1. **事前準備をしっかり行う**：認証設定は最初に確実に
2. **エラーメッセージを読む**：多くの問題は適切な対処で解決可能
3. **HTTPSとSSHの使い分け**：問題があればHTTPSに切り替える
4. **GitHub CLIの活用**：Web UIよりも効率的に作業可能

## 関連リソース

- [Git公式ドキュメント](https://git-scm.com/doc)
- [GitHub CLI公式ドキュメント](https://cli.github.com/manual/)
- [GitHub Docs](https://docs.github.com/ja)
- [Pro Git Book（日本語）](https://git-scm.com/book/ja/v2)

---

最終更新日: 2025年8月4日
