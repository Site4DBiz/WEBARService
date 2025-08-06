# クイックリファレンス

## 頻繁に使用するコマンド

### アプリケーション操作
```bash
# アプリケーション起動
[アプリケーション起動コマンド]

# アプリケーション停止
[アプリケーション停止コマンド]

# 状態確認
[状態確認コマンド]

# ログ確認
tail -f logs/[ログファイル名]
```

### 開発・デバッグ
```bash
# 開発モードで起動
[開発モード起動コマンド]

# テスト実行
[テスト実行コマンド]

# デバッグモード
DEBUG=* [起動コマンド]
```

### メンテナンス操作
```bash
# ログ確認
tail -f logs/$(date +%Y-%m-%d)/*.log
grep -i error logs/**/*.log | tail -20

# プロセス管理
ps aux | grep -E \"([プロセス名])\" | grep -v grep
pkill -f [プロセス名]

# Git操作
git branch --merged | grep -v \"\\*\\|main\\|master\" | xargs -n 1 git branch -d
git remote prune origin
```

## ディレクトリ構造

```
[プロジェクト名]/
├── .maintenance/        # メンテナンスドキュメント
├── src/                 # ソースコード
├── tests/               # テストコード
├── logs/                # ログファイル
├── config/              # 設定ファイル
├── docs/                # ドキュメント
└── scripts/             # ユーティリティスクリプト
```

## 重要なファイル

| ファイル | 説明 |
|---------|------|
| `config/[設定ファイル]` | アプリケーション設定 |
| `.env` | 環境変数 |
| `package.json` / `requirements.txt` / `go.mod` | 依存関係定義 |
| `logs/[アプリ名].log` | アプリケーションログ |

## 設定ファイルの例

### 環境変数 (.env)
```bash
# アプリケーション設定
APP_ENV=development
APP_PORT=3000
APP_LOG_LEVEL=debug

# データベース設定
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname

# 外部サービス
API_KEY=your-api-key-here
```

### アプリケーション設定
```yaml
# config.yml 例
app:
  name: [アプリケーション名]
  version: 1.0.0
  environment: development

server:
  host: localhost
  port: 3000

database:
  type: postgresql
  host: localhost
  port: 5432
  name: [データベース名]

logging:
  level: debug
  format: json
  output: file
  path: logs/
```

## トラブルシューティング

### よくある問題と解決策

| 問題 | 解決策 |
|------|--------|
| アプリケーションが起動しない | 依存関係の確認: `npm install` / `pip install -r requirements.txt` |
| ポートが使用中 | `lsof -i :[ポート番号]` でプロセス確認後、終了 |
| 権限エラー | `chmod +x [ファイル名]` で実行権限付与 |
| データベース接続エラー | 接続文字列と認証情報の確認 |
| メモリ不足 | プロセスの再起動またはメモリ制限の調整 |

## 環境変数

### 共通環境変数
```bash
# デバッグモード
export DEBUG=*

# ログレベル
export LOG_LEVEL=debug

# 環境指定
export NODE_ENV=development
export APP_ENV=development
```

### 言語別環境変数
```bash
# Node.js
export NODE_OPTIONS=\"--max-old-space-size=2048\"

# Python
export PYTHONPATH=/path/to/project
export PYTHON_ENV=development

# Go
export GOPATH=$HOME/go
export GO111MODULE=on
```

## ログファイルの場所

- **アプリケーションログ**: `logs/[app-name]/`
- **エラーログ**: `logs/error.log`
- **アクセスログ**: `logs/access.log`
- **デバッグログ**: `logs/debug.log`

## 緊急時の対応

### プロセスの強制終了
```bash
# プロセス名で終了
pkill -f [プロセス名]

# ポート使用プロセスの終了
lsof -ti:[ポート番号] | xargs kill -9

# すべての関連プロセスを終了
pkill -f \"[アプリケーション名パターン]\"
```

### ロックファイルの削除
```bash
# 一般的なロックファイル
rm -f /tmp/[アプリ名].lock
rm -f *.pid

# パッケージマネージャのロック
rm -f package-lock.json
rm -f yarn.lock
rm -f Gemfile.lock
```

### 設定のリセット
```bash
# 環境変数のリセット
cp .env.example .env

# 設定ファイルのリセット
cp config/default.yml config/config.yml
```

## パフォーマンスチェック

### リソース使用量
```bash
# CPU使用率
top -p $(pgrep -f [プロセス名])

# メモリ使用量
ps aux | grep [プロセス名] | awk '{sum+=$6} END {print sum/1024 \" MB\"}'

# ディスク使用量
du -sh ./* | sort -rh | head -20

# ネットワーク接続
netstat -tunlp | grep [ポート番号]
```

### ログ分析
```bash
# エラー頻度
grep ERROR logs/*.log | awk '{print $1}' | sort | uniq -c | sort -rn

# レスポンスタイム分析
grep \"response_time\" logs/*.log | awk '{print $NF}' | sort -n | 
  awk '{a[NR]=$1} END {print \"Min:\", a[1], \"Median:\", a[int(NR/2)], \"Max:\", a[NR]}'
```

## バックアップとリストア

### バックアップ作成
```bash
# データベースバックアップ (PostgreSQL)
pg_dump [データベース名] > backup_$(date +%Y%m%d).sql

# アプリケーションバックアップ
tar -czf backup_$(date +%Y%m%d).tar.gz --exclude=node_modules --exclude=logs .
```

### リストア
```bash
# データベースリストア (PostgreSQL)
psql [データベース名] < backup_20240101.sql

# アプリケーションリストア
tar -xzf backup_20240101.tar.gz
```

## 開発者向け情報

### デバッグ方法
1. ログレベルを DEBUG に設定
2. デバッグツールの使用
3. ブレークポイントの設定

### テスト実行
```bash
# 単体テスト
npm test
pytest
go test ./...

# 統合テスト
npm run test:integration
pytest -m integration
go test -tags=integration ./...

# E2Eテスト
npm run test:e2e
```

### ビルド・デプロイ
```bash
# ビルド
npm run build
python setup.py build
go build -o app

# デプロイ
[デプロイコマンド]
```

## 便利なエイリアス

```bash
# ~/.bashrc または ~/.zshrc に追加
alias logs='tail -f logs/$(date +%Y-%m-%d)/*.log'
alias errors='grep -i error logs/**/*.log | tail -20'
alias restart='[再起動コマンド]'
alias status='[状態確認コマンド]'
```

## チートシート

### Git操作
```bash
# ブランチ操作
git checkout -b feature/new-feature
git push -u origin feature/new-feature
git merge --no-ff feature/new-feature

# 変更の取り消し
git checkout -- [ファイル名]
git reset --hard HEAD
git revert [コミットハッシュ]

# ログ確認
git log --oneline -10
git log --graph --all --decorate
```

### Docker操作
```bash
# コンテナ操作
docker ps -a
docker logs [コンテナID]
docker exec -it [コンテナID] /bin/bash

# イメージ・ボリューム管理
docker images
docker system prune -a
docker volume ls
```

### データベース操作
```bash
# PostgreSQL
psql -U [ユーザー] -d [DB名]
\\dt  # テーブル一覧
\\d [テーブル名]  # テーブル構造

# MySQL
mysql -u [ユーザー] -p [DB名]
SHOW TABLES;
DESCRIBE [テーブル名];

# MongoDB
mongosh
show dbs
use [DB名]
show collections
```

## サポート

- **ドキュメント**: `.maintenance/` ディレクトリ
- **イシュー管理**: GitHub Issues / GitLab Issues
- **ログ**: `logs/` ディレクトリ
- **設定例**: `config/examples/` ディレクトリ

---

このクイックリファレンスは定期的に更新し、プロジェクトに合わせてカスタマイズしてください。

