# Vercel・Supabaseメンテナンスガイド（後半）

## Supabase トラブルシューティング（続き）

### パフォーマンス問題の診断（続き）
```sql
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

### RLSポリシーのトラブルシューティング
```sql
-- RLSポリシーのテスト
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-uuid-here';

-- 特定のユーザーとしてクエリをテスト
SELECT * FROM your_table WHERE true;

-- RLSを一時的に無効化（デバッグ用）
ALTER TABLE your_table DISABLE ROW LEVEL SECURITY;
-- テスト後は必ず再有効化
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
```

## 統合メンテナンス

### Vercel + Supabase 連携の確認

#### 1. 環境変数の同期
```bash
# Supabaseの環境変数をVercelに設定
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY

# 環境変数の確認
vercel env ls | grep SUPABASE
```

#### 2. APIレスポンスタイムの監視
```javascript
// middleware.js でのレスポンスタイム計測
export async function middleware(request) {
  const start = Date.now();
  
  // Supabase APIコール
  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/your_table`);
  
  const duration = Date.now() - start;
  
  // ログ記録
  console.log(`API Response Time: ${duration}ms`);
  
  // パフォーマンスアラート
  if (duration > 1000) {
    console.warn(`Slow API response: ${duration}ms`);
  }
  
  return response;
}
```

#### 3. エラー追跡の統合
```javascript
// エラーハンドリングの例
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function fetchData() {
  try {
    const { data, error } = await supabase
      .from('your_table')
      .select('*');
    
    if (error) {
      // Vercelのログに記録
      console.error('Supabase Error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
    
    return data;
  } catch (error) {
    // エラーをVercelのモニタリングに送信
    console.error('Fetch Error:', error);
    throw error;
  }
}
```

## セキュリティベストプラクティス

### Vercelのセキュリティ設定

#### 1. セキュリティヘッダーの設定
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
          },
        ],
      },
    ];
  },
};
```

#### 2. 環境変数の保護
```bash
# プロダクション環境変数の暗号化
vercel secrets add supabase-service-key "your-service-key"

# 環境変数での参照
vercel env add SUPABASE_SERVICE_KEY @supabase-service-key --production
```

### Supabaseのセキュリティ設定

#### 1. RLSポリシーの強化
```sql
-- ユーザーが自分のデータのみアクセス可能
CREATE POLICY "Users can only access own data"
ON public.user_data
FOR ALL
USING (auth.uid() = user_id);

-- 管理者のみがアクセス可能
CREATE POLICY "Only admins can access"
ON public.admin_data
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
);

-- 時間制限付きアクセス
CREATE POLICY "Time limited access"
ON public.temporary_data
FOR SELECT
USING (
  created_at > NOW() - INTERVAL '24 hours'
  AND auth.uid() = user_id
);
```

#### 2. APIキーの管理
```javascript
// 環境に応じたキーの使用
const supabaseKey = process.env.NODE_ENV === 'production'
  ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  : process.env.SUPABASE_SERVICE_KEY;

// サーバーサイドのみでサービスキーを使用
// pages/api/admin.js
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
```

## パフォーマンス最適化

### Vercelの最適化

#### 1. Edge Functionsの活用
```javascript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // キャッシュヘッダーの設定
  const response = NextResponse.next();
  
  // 静的アセットのキャッシュ
  if (request.nextUrl.pathname.startsWith('/static')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  
  // APIレスポンスのキャッシュ
  if (request.nextUrl.pathname.startsWith('/api')) {
    response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate');
  }
  
  return response;
}

export const config = {
  matcher: ['/static/:path*', '/api/:path*'],
};
```

#### 2. ISR（Incremental Static Regeneration）の活用
```javascript
// pages/[slug].js
export async function getStaticProps({ params }) {
  const { data } = await supabase
    .from('pages')
    .select('*')
    .eq('slug', params.slug)
    .single();

  return {
    props: { page: data },
    revalidate: 60, // 60秒ごとに再生成
  };
}

export async function getStaticPaths() {
  const { data } = await supabase
    .from('pages')
    .select('slug');

  return {
    paths: data.map(page => ({ params: { slug: page.slug } })),
    fallback: 'blocking',
  };
}
```

### Supabaseの最適化

#### 1. 接続プールの最適化
```javascript
// lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// シングルトンパターンで接続を再利用
let supabase;

export function getSupabase() {
  if (!supabase) {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: { 'x-my-custom-header': 'my-app-name' },
      },
    });
  }
  return supabase;
}
```

#### 2. クエリの最適化
```sql
-- 複合インデックスの作成
CREATE INDEX idx_user_created ON public.posts(user_id, created_at DESC);

-- 部分インデックスの作成
CREATE INDEX idx_active_users ON public.users(email) 
WHERE deleted_at IS NULL;

-- マテリアライズドビューの活用
CREATE MATERIALIZED VIEW user_stats AS
SELECT 
  user_id,
  COUNT(*) as post_count,
  MAX(created_at) as last_post_date
FROM posts
GROUP BY user_id;

-- 定期的な更新
REFRESH MATERIALIZED VIEW CONCURRENTLY user_stats;
```

#### 3. リアルタイムの最適化
```javascript
// リアルタイムサブスクリプションの最適化
const channel = supabase
  .channel('custom-filter-channel')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'messages',
      filter: `room_id=eq.${roomId}`, // フィルターで必要なデータのみ受信
    },
    (payload) => {
      console.log('Change received!', payload);
    }
  )
  .subscribe();

// 不要になったら必ずアンサブスクライブ
return () => {
  supabase.removeChannel(channel);
};
```

## 監視とアラート設定

### Vercelの監視
```javascript
// api/health.js - ヘルスチェックエンドポイント
export default async function handler(req, res) {
  try {
    // Supabase接続確認
    const { data, error } = await supabase
      .from('health_check')
      .select('id')
      .limit(1);
    
    if (error) throw error;
    
    res.status(200).json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        api: 'operational'
      }
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
```

### Supabaseの監視
```sql
-- 監視用のカスタム関数
CREATE OR REPLACE FUNCTION check_system_health()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  result = json_build_object(
    'timestamp', NOW(),
    'active_connections', (SELECT count(*) FROM pg_stat_activity),
    'database_size', (SELECT pg_size_pretty(pg_database_size(current_database()))),
    'slow_queries', (
      SELECT count(*) 
      FROM pg_stat_activity 
      WHERE state != 'idle' 
        AND query_start < NOW() - INTERVAL '5 seconds'
    ),
    'table_sizes', (
      SELECT json_agg(
        json_build_object(
          'table', schemaname||'.'||tablename,
          'size', pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
        )
      )
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 10
    )
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 定期的な実行
SELECT check_system_health();
```

## メンテナンスチェックリスト

### Vercel + Supabase 日次チェックリスト
- [ ] Vercelデプロイメント状況確認
- [ ] Supabaseデータベース接続確認
- [ ] エラーログの確認（両サービス）
- [ ] APIレスポンスタイムの確認
- [ ] リアルタイム接続の監視

### 週次チェックリスト
- [ ] 環境変数の同期確認
- [ ] RLSポリシーの動作確認
- [ ] バックアップの作成と検証
- [ ] 依存関係の更新確認
- [ ] セキュリティアラートの確認

### 月次チェックリスト
- [ ] パフォーマンス分析とチューニング
- [ ] コスト分析と最適化
- [ ] セキュリティ監査
- [ ] データベース最適化（VACUUM、REINDEX）
- [ ] ドキュメントの更新

---

このドキュメントは定期的に更新し、プロジェクトの要件に合わせて調整してください。
