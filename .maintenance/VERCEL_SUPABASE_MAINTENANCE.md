# Vercel・Supabaseメンテナンスガイド

このドキュメントでは、VercelとSupabaseを使用したプロジェクトのメンテナンスに特化した手順を記載します。

## 目次

1. [Vercelメンテナンス](#vercelメンテナンス)
   - [日次メンテナンス](#vercel-日次メンテナンス)
   - [週次メンテナンス](#vercel-週次メンテナンス)
   - [月次メンテナンス](#vercel-月次メンテナンス)
   - [トラブルシューティング](#vercel-トラブルシューティング)
2. [Supabaseメンテナンス](#supabaseメンテナンス)
   - [日次メンテナンス](#supabase-日次メンテナンス)
   - [週次メンテナンス](#supabase-週次メンテナンス)
   - [月次メンテナンス](#supabase-月次メンテナンス)
   - [トラブルシューティング](#supabase-トラブルシューティング)
3. [統合メンテナンス](#統合メンテナンス)
4. [セキュリティベストプラクティス](#セキュリティベストプラクティス)
5. [パフォーマンス最適化](#パフォーマンス最適化)

## Vercelメンテナンス

### Vercel 日次メンテナンス

#### 1. デプロイメント状況の確認
```bash
# Vercel CLIでプロジェクト状況確認
vercel ls

# 最新のデプロイメント確認
vercel list --limit 10

# 現在のプロダクションデプロイメント確認
vercel inspect --prod
```

#### 2. ビルドログの確認
```bash
# 最新のビルドログを確認
vercel logs

# 特定のデプロイメントのログ確認
vercel logs [deployment-url]

# エラーのみフィルタリング
vercel logs --filter error
```

#### 3. 関数の使用状況確認
```bash
# Serverless Function の使用状況
vercel env pull .env.local

# 関数の実行時間とメモリ使用量の確認（ダッシュボード経由）
echo "Check: https://vercel.com/[team]/[project]/functions"
```

### Vercel 週次メンテナンス

#### 1. 環境変数の確認と更新
```bash
# 環境変数の一覧表示
vercel env ls

# プロダクション環境変数の確認
vercel env ls production

# 環境変数の同期確認
vercel env pull
```

#### 2. ドメイン設定の確認
```bash
# ドメイン一覧の確認
vercel domains ls

# SSL証明書の状態確認
vercel certs ls

# DNSレコードの確認
vercel dns ls [domain]
```

#### 3. パフォーマンスメトリクスの確認
```javascript
// analytics-check.js
const { fetch } = require('node-fetch');

async function checkAnalytics() {
  const response = await fetch('https://api.vercel.com/v6/analytics/[project-id]', {
    headers: {
      'Authorization': `Bearer ${process.env.VERCEL_TOKEN}`
    }
  });
  
  const data = await response.json();
  console.log('Performance Metrics:', data);
}

checkAnalytics();
```

### Vercel 月次メンテナンス

#### 1. ビルド最適化の見直し
```json
// vercel.json の最適化例
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "pages/api/*.js": {
      "maxDuration": 10,
      "memory": 1024
    }
  }
}
```

#### 2. 使用量とコストの確認
```bash
# チームの使用量確認
echo "Check usage at: https://vercel.com/[team]/settings/billing"

# プロジェクト別の使用量分析
echo "Review project usage: https://vercel.com/[team]/[project]/analytics"
```

#### 3. セキュリティ監査
```bash
# 依存関係の脆弱性スキャン
npm audit
npm audit fix

# プロジェクトのセキュリティヘッダー確認
curl -I https://[your-domain].vercel.app | grep -E "(X-Frame-Options|X-Content-Type|Strict-Transport)"
```

### Vercel トラブルシューティング

#### ビルドエラーの対処
```bash
# ビルドキャッシュのクリア
vercel --force

# ローカルでのビルド再現
npm run build
# または
vercel build

# 環境変数の確認
vercel env pull .env.build
cat .env.build
```

#### デプロイメントの問題
```bash
# 特定のコミットにロールバック
vercel rollback [deployment-url]

# プロダクションへの即座のプロモート
vercel promote [deployment-url]

# デプロイメントの削除
vercel remove [deployment-url]
```

#### パフォーマンス問題
```javascript
// next.config.js の最適化例
module.exports = {
  images: {
    domains: ['your-domain.com'],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizeCss: true,
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
}
```

## Supabaseメンテナンス

### Supabase 日次メンテナンス

#### 1. データベース状態の確認
```bash
# Supabase CLIでプロジェクト状態確認
supabase projects list

# データベースの接続確認
supabase db remote status

# アクティブな接続数の確認
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"
```

#### 2. リアルタイム接続の監視
```sql
-- リアルタイムサブスクリプションの確認
SELECT 
  topic,
  COUNT(*) as subscription_count
FROM realtime.subscription
GROUP BY topic
ORDER BY subscription_count DESC;

-- アクティブな接続の詳細
SELECT 
  application_name,
  client_addr,
  state,
  query_start,
  state_change
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start DESC;
```

#### 3. ストレージ使用量の確認
```bash
# ストレージバケットの一覧
supabase storage ls

# 特定バケットの使用量確認
supabase storage ls-buckets

# APIでの使用量確認
curl -X GET "https://[project-ref].supabase.co/storage/v1/bucket/[bucket-name]" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"
```

### Supabase 週次メンテナンス

#### 1. バックアップの確認と作成
```bash
# 手動バックアップの作成
supabase db dump -f backup_$(date +%Y%m%d).sql

# バックアップの圧縮
gzip backup_$(date +%Y%m%d).sql

# S3やGCSへのバックアップ
aws s3 cp backup_$(date +%Y%m%d).sql.gz s3://[bucket-name]/backups/
```

#### 2. RLS（Row Level Security）ポリシーの確認
```sql
-- すべてのRLSポリシーの一覧
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- RLSが有効なテーブルの確認
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true;
```

#### 3. インデックスの最適化
```sql
-- 未使用インデックスの検出
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- スロークエリの特定
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  min_time,
  max_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 20;
```

### Supabase 月次メンテナンス

#### 1. データベースの最適化
```sql
-- テーブルの統計情報更新
ANALYZE;

-- 断片化したテーブルの再構築
VACUUM FULL;

-- インデックスの再構築
REINDEX DATABASE postgres;

-- 不要なデータの削除（例：30日以上前のログ）
DELETE FROM logs WHERE created_at < NOW() - INTERVAL '30 days';
```

#### 2. Edge Functionsの最適化
```bash
# Edge Functions のリスト確認
supabase functions list

# 関数のログ確認
supabase functions logs [function-name]

# 関数のデプロイ
supabase functions deploy [function-name]

# 使用状況の確認
echo "Check usage at: https://app.supabase.com/project/[project-ref]/functions"
```

#### 3. 認証システムの監査
```sql
-- ユーザーアクティビティの分析
SELECT 
  DATE_TRUNC('day', last_sign_in_at) as login_date,
  COUNT(DISTINCT id) as unique_users,
  COUNT(*) as total_logins
FROM auth.users
WHERE last_sign_in_at > NOW() - INTERVAL '30 days'
GROUP BY login_date
ORDER BY login_date DESC;

-- 無効なセッションのクリーンアップ
DELETE FROM auth.sessions
WHERE expires_at < NOW();

-- MFA使用状況の確認
SELECT 
  COUNT(*) FILTER (WHERE raw_user_meta_data->>'mfa_enabled' = 'true') as mfa_enabled,
  COUNT(*) FILTER (WHERE raw_user_meta_data->>'mfa_enabled' IS NULL OR raw_user_meta_data->>'mfa_enabled' = 'false') as mfa_disabled,
  COUNT(*) as total_users
FROM auth.users;
```

### Supabase トラブルシューティング

#### 接続エラーの対処
```bash
# 接続文字列の確認
echo $DATABASE_URL

# 接続プールの状態確認
psql $DATABASE_URL -c "
SELECT 
  state,
  COUNT(*) as connections
FROM pg_stat_activity
GROUP BY state
ORDER BY connections DESC;"

# 接続のリセット
psql $DATABASE_URL -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND state_change < NOW() - INTERVAL '1 hour';"
```

#### パフォーマンス問題の診断
```sql
-- 実行中のクエリの確認
SELECT 
  pid,
  now() - query_start as duration,
  query,
  state
FROM pg_stat_activity
WHERE state != 'idle'
  AND query NOT LIKE '%pg_stat_activity%'
ORDER BY duration DESC;

-- テーブルサイズの確認
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;
```

## その他の内容について

統合メンテナンス、セキュリティベストプラクティス、パフォーマンス最適化、監視とアラート設定、メンテナンスチェックリストについては、以下のファイルを参照してください：

**[.maintenance/VERCEL_SUPABASE_MAINTENANCE_PART2.md](.maintenance/VERCEL_SUPABASE_MAINTENANCE_PART2.md)**

このファイルには以下の内容が含まれています：
- 統合メンテナンス（Vercel + Supabase連携）
- セキュリティベストプラクティス
- パフォーマンス最適化
- 監視とアラート設定
- メンテナンスチェックリスト

---

このドキュメントは定期的に更新し、プロジェクトの要件に合わせて調整してください。
