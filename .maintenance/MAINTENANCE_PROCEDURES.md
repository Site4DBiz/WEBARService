# メンテナンス手順詳細

## 定期メンテナンス手順

### 日次メンテナンス

#### 1. システム状態の確認
```bash
# アプリケーションの状態確認
[アプリケーション状態確認コマンド]

# 実行中のプロセス確認
ps aux | grep -E "([プロセス名パターン])" | grep -v grep

# サービスの状態確認
[サービス状態確認コマンド]
```

#### 2. ログファイルの確認
```bash
# 本日のログファイル確認
ls -la logs/$(date +%Y-%m-%d)/

# エラーログの確認
grep -i error logs/**/*.log | tail -20

# 警告の確認
grep -i warning logs/**/*.log | tail -20
```

#### 3. ディスク使用量の確認
```bash
# ログディレクトリのサイズ確認
du -sh logs/

# 大きなログファイルの特定
find logs/ -name "*.log" -size +100M -ls
```

### 週次メンテナンス

#### 1. ログファイルのローテーション
```bash
# 30日以上前のログを削除
find logs/ -name "*.log" -mtime +30 -delete

# 空のディレクトリを削除
find logs/ -type d -empty -delete
```

#### 2. 依存関係の更新確認
```bash
# Node.js パッケージの更新確認
[ -f package.json ] && npm outdated

# Python パッケージの更新確認
[ -f requirements.txt ] && pip list --outdated

# Go モジュールの更新確認
[ -f go.mod ] && go list -u -m all
```

#### 3. リポジトリのメンテナンス
```bash
# 不要なブランチの削除
git branch --merged | grep -v "\*\|main\|master\|develop" | xargs -n 1 git branch -d

# リモートの削除済みブランチをローカルから削除
git remote prune origin
```

### 月次メンテナンス

#### 1. パフォーマンス分析
```bash
# 実行時間の統計（ログ形式に応じて調整）
grep "execution_time" logs/**/*.log | awk '{print $NF}' | sort -n | awk '
  BEGIN {count = 0}
  {
    count++
    sum += $1
    times[count] = $1
  }
  END {
    avg = sum/count
    print "平均実行時間: " avg "秒"
    print "最小実行時間: " times[1] "秒"
    print "最大実行時間: " times[count] "秒"
  }'
```

#### 2. セキュリティ監査
```bash
# npm セキュリティ監査
[ -f package.json ] && npm audit

# Python セキュリティ監査
[ -f requirements.txt ] && pip-audit

# セキュリティ修正の適用
[ -f package.json ] && npm audit fix
```

#### 3. バックアップの作成
```bash
# バックアップディレクトリの作成
mkdir -p backup

# 設定ファイルのバックアップ
tar -czf backup/config_$(date +%Y%m%d).tar.gz config/

# データのバックアップ
tar -czf backup/data_$(date +%Y%m%d).tar.gz [データディレクトリ]
```

## トラブルシューティング手順

### 一般的な問題と解決方法

#### 1. アプリケーションが起動しない

##### Node.js アプリケーション
```bash
# Node.js バージョンの確認
node --version

# 依存関係の再インストール
rm -rf node_modules
rm package-lock.json
npm install

# 環境変数の確認
cat .env.example
```

##### Python アプリケーション
```bash
# Python バージョンの確認
python3 --version

# 仮想環境の再作成
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

##### Go アプリケーション
```bash
# Go バージョンの確認
go version

# 依存関係の再ダウンロード
go mod tidy
go mod download
```

#### 2. データベース接続エラー

```bash
# データベースの状態確認
# PostgreSQL
pg_isready -h localhost -p 5432

# MySQL
mysqladmin ping -h localhost

# MongoDB
mongosh --eval "db.adminCommand('ping')"

# 接続文字列の確認
echo $DATABASE_URL
```

#### 3. 権限エラー

```bash
# ファイル権限の確認
ls -la [対象ファイル]

# 実行権限の付与
chmod +x [実行ファイル]

# ディレクトリ権限の修正
chmod 755 [ディレクトリ]

# 所有者の変更
chown -R $(whoami) [ディレクトリ]
```

### デバッグモード

#### アプリケーションのデバッグ
```bash
# デバッグモードで実行
DEBUG=* [起動コマンド]

# 詳細ログの有効化
LOG_LEVEL=debug [起動コマンド]

# 環境変数の確認
env | grep -E "(DEBUG|LOG)"
```

#### ログの詳細分析

##### ログパターンの検索
```bash
# 特定の日付のエラーを検索
grep -E "ERROR|CRITICAL" logs/$(date +%Y-%m-%d)/*.log

# 特定のIDの実行履歴
grep "request_id: [ID]" logs/**/*.log

# 実行時間が長い処理の特定
grep "execution_time" logs/**/*.log | awk '$NF > 1000'
```

##### ログの集計と分析
```bash
# エラーの種類別集計
grep ERROR logs/**/*.log | awk -F': ' '{print $3}' | sort | uniq -c | sort -rn

# 時間帯別のリクエスト数
grep "Request" logs/**/*.log | awk '{print $2}' | cut -d: -f1 | sort | uniq -c
```

## システム最適化

### パフォーマンスチューニング

#### 1. メモリ使用量の最適化
```bash
# Node.js アプリケーション
export NODE_OPTIONS="--max-old-space-size=2048"

# Java アプリケーション
export JAVA_OPTS="-Xmx2g -Xms1g"

# プロセスのメモリ使用量確認
ps aux | grep [プロセス名] | awk '{sum+=$6} END {print "Total Memory: " sum/1024 " MB"}'
```

#### 2. ログローテーションの自動化
```bash
# logrotate設定例
cat << EOF > /etc/logrotate.d/[アプリケーション名]
/path/to/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 [ユーザー] [グループ]
}
EOF
```

#### 3. データベース最適化
```bash
# PostgreSQL
# インデックスの再構築
REINDEX DATABASE [データベース名];

# 統計情報の更新
ANALYZE;

# MySQL
# テーブルの最適化
OPTIMIZE TABLE [テーブル名];

# MongoDB
# インデックスの再構築
db.collection.reIndex()
```

### セキュリティ強化

#### 1. 権限の確認と修正
```bash
# 実行ファイルの権限確認
find . -type f -perm +111 -ls

# 設定ファイルの権限修正
find config -type f -exec chmod 600 {} \;

# ディレクトリの権限修正
find . -type d -exec chmod 755 {} \;
```

#### 2. セキュリティスキャン
```bash
# 開いているポートの確認
netstat -tulpn | grep LISTEN

# ファイアウォールの状態確認
# UFW (Ubuntu)
sudo ufw status

# firewalld (CentOS/RHEL)
sudo firewall-cmd --list-all
```

## 緊急時の対応

### システム復旧手順

#### 1. プロセスの強制終了
```bash
# プロセスIDで終了
kill -9 [PID]

# プロセス名で終了
pkill -f [プロセス名]

# すべての関連プロセスを終了
pkill -f "[アプリケーション名パターン]"
```

#### 2. ロックファイルの削除
```bash
# アプリケーションのロックファイル削除
rm -f /tmp/[アプリケーション名].lock
rm -f /var/run/[アプリケーション名].pid

# npmのキャッシュクリア
npm cache clean --force

# pipのキャッシュクリア
pip cache purge
```

#### 3. 設定のリセット
```bash
# 設定ファイルのバックアップ
cp config/[設定ファイル] config/[設定ファイル].backup

# デフォルト設定の復元
cp config/[設定ファイル].default config/[設定ファイル]

# 環境変数のリセット
cp .env.example .env
```

### データ復旧

#### 1. バックアップからの復元
```bash
# 最新のバックアップファイルを確認
ls -lt backup/ | head -10

# バックアップから復元
tar -xzf backup/[バックアップファイル名]

# データベースの復元 (PostgreSQL)
pg_restore -d [データベース名] [バックアップファイル]

# データベースの復元 (MySQL)
mysql [データベース名] < [バックアップファイル]
```

#### 2. Git履歴からの復元
```bash
# 特定のファイルの履歴確認
git log --oneline [ファイルパス]

# 特定のコミットから復元
git checkout [コミットハッシュ] -- [ファイルパス]

# 直前のコミットに戻す
git reset --hard HEAD~1
```

## 監視とアラート

### ヘルスチェックスクリプト
```bash
#!/bin/bash
# health_check.sh

# アプリケーションの状態確認
if ! curl -f http://localhost:[ポート]/health > /dev/null 2>&1; then
    echo "WARNING: Application is not responding"
    # アラート送信
    [アラート送信コマンド]
fi

# ディスク容量の確認
DISK_USAGE=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo "WARNING: Disk usage is above 80%"
    # アラート送信
    [アラート送信コマンド]
fi

# メモリ使用率の確認
MEM_USAGE=$(free | grep Mem | awk '{print ($3/$2) * 100.0}')
if (( $(echo "$MEM_USAGE > 80" | bc -l) )); then
    echo "WARNING: Memory usage is above 80%"
    # アラート送信
    [アラート送信コマンド]
fi
```

### 自動復旧スクリプト
```bash
#!/bin/bash
# auto_recovery.sh

# サービスの自動再起動
check_and_restart() {
    local service_name=$1
    local check_command=$2
    
    if ! $check_command > /dev/null 2>&1; then
        echo "$(date): $service_name is down, attempting restart..."
        [再起動コマンド]
        sleep 10
        
        if $check_command > /dev/null 2>&1; then
            echo "$(date): $service_name successfully restarted"
        else
            echo "$(date): Failed to restart $service_name"
            # エスカレーション
            [アラート送信コマンド]
        fi
    fi
}

# アプリケーションの監視
check_and_restart "Application" "curl -f http://localhost:[ポート]/health"
```

## メンテナンスチェックリスト

### 日次チェックリスト
- [ ] システム状態の確認
- [ ] エラーログの確認
- [ ] ディスク使用量の確認
- [ ] バックアップの確認
- [ ] セキュリティアラートの確認

### 週次チェックリスト
- [ ] ログローテーションの実行
- [ ] 依存関係の更新確認
- [ ] 不要なファイルの削除
- [ ] パフォーマンスレポートの確認
- [ ] セキュリティパッチの適用

### 月次チェックリスト
- [ ] 完全バックアップの作成
- [ ] セキュリティ監査の実施
- [ ] パフォーマンス分析
- [ ] ドキュメントの更新
- [ ] 災害復旧テスト

---

このドキュメントは定期的に更新し、実際の運用に合わせて調整してください。
