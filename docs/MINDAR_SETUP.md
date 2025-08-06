# MindAR Setup Guide

## MindARライブラリについて

MindARは、WebブラウザでマーカーレスARを実現するためのオープンソースライブラリです。画像認識と顔認識の2つのトラッキングモードをサポートしています。

## 現在の実装状況

### ✅ 完了済み
- MindARライブラリのCDN統合
- TypeScript型定義の作成
- ARビューアコンポーネント（MindARViewer）の実装
- ARシーンコンポーネント（ARScene）の実装
- カスタムフック（useMindAR）の実装
- ARデモページ（/ar）の作成
- サンプルターゲット画像ファイル（targets.mind）の配置

### 🔧 実装済み機能
1. **画像トラッキング**: ターゲット画像を認識してAR表示
2. **顔トラッキング**: 顔認識によるAR表示
3. **3Dオブジェクト表示**: Three.jsを使用した3D描画
4. **リアルタイムトラッキング**: カメラ映像のリアルタイム処理

## ターゲット画像の作成方法

### 1. MindAR Image Compiler（オンライン版）
[https://hiukim.github.io/mind-ar-js-doc/tools/compile](https://hiukim.github.io/mind-ar-js-doc/tools/compile)

1. 上記URLにアクセス
2. "Upload Images"ボタンをクリック
3. ターゲットにしたい画像をアップロード（JPG/PNG形式）
4. "Start"ボタンをクリックしてコンパイル
5. 生成された`.mind`ファイルをダウンロード
6. `public/`フォルダに配置

### 2. ターゲット画像の要件
- **推奨サイズ**: 最小500x500px
- **形式**: JPG、PNG
- **内容**: 特徴点が多い画像（テクスチャ、パターン、文字など）
- **避けるべき画像**: 単色、グラデーション、対称的すぎる画像

### 3. 複数ターゲットの設定
```javascript
// 複数のターゲット画像を使用する場合
const { mindAR } = useMindAR({
  type: 'image',
  imageTargetSrc: '/multi-targets.mind',
  maxTrack: 3, // 同時トラッキング数
});
```

## 3Dモデルの追加方法

### 1. GLTFモデルの読み込み
```javascript
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

const loader = new GLTFLoader();
loader.load('/models/model.gltf', (gltf) => {
  anchor.group.add(gltf.scene);
});
```

### 2. FBXモデルの読み込み
```javascript
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

const loader = new FBXLoader();
loader.load('/models/model.fbx', (fbx) => {
  anchor.group.add(fbx);
});
```

## カスタマイズオプション

### 1. ARコンテンツのカスタマイズ
```typescript
// MindARViewer.tsx内でカスタムコンテンツを追加
const createARContent = (anchor: any) => {
  // カスタム3Dオブジェクト
  const geometry = new THREE.SphereGeometry(0.1, 32, 32);
  const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
  const sphere = new THREE.Mesh(geometry, material);
  
  // ライティング
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(0, 0, 1);
  
  anchor.group.add(sphere);
  anchor.group.add(light);
};
```

### 2. イベントハンドリング
```typescript
const handleTargetFound = () => {
  console.log('Target found!');
  // アニメーション開始、サウンド再生など
};

const handleTargetLost = () => {
  console.log('Target lost!');
  // アニメーション停止など
};
```

### 3. パフォーマンス最適化
```typescript
const optimizationConfig = {
  filterMinCF: 0.0001,    // トラッキング感度
  filterBeta: 50,          // スムージング係数
  missTolerance: 5,        // ロスト許容フレーム数
  warmupTolerance: 5,      // ウォームアップフレーム数
};
```

## トラブルシューティング

### よくある問題と解決方法

1. **カメラが起動しない**
   - HTTPSまたはlocalhostでアクセスしているか確認
   - ブラウザのカメラ権限を確認

2. **ターゲット画像が認識されない**
   - 画像の特徴点が十分か確認
   - 照明条件を改善
   - カメラと画像の距離を調整

3. **パフォーマンスが低い**
   - maxTrackの値を減らす
   - 3Dモデルのポリゴン数を削減
   - テクスチャサイズを最適化

## 開発時のテスト方法

### 1. ローカルテスト
```bash
npm run dev
# https://localhost:3000/ar でアクセス
```

### 2. モバイルテスト
- ngrokやlocaltunnelを使用してHTTPS環境を作成
- QRコードでモバイルデバイスからアクセス

### 3. デバッグモード
```javascript
const { mindAR } = useMindAR({
  type: 'image',
  debug: true, // デバッグ情報表示
});
```

## 今後の拡張予定

1. **マルチマーカー対応**: 複数のターゲット画像の同時認識
2. **アニメーション**: 3Dモデルのアニメーション対応
3. **インタラクション**: タッチやジェスチャーによる操作
4. **エフェクト**: パーティクルエフェクトの追加
5. **音声**: 3Dサウンドの実装

## 参考リンク

- [MindAR公式ドキュメント](https://hiukim.github.io/mind-ar-js-doc/)
- [MindAR GitHub](https://github.com/hiukim/mind-ar-js)
- [Three.js公式ドキュメント](https://threejs.org/docs/)
- [WebXR Device API](https://immersive-web.github.io/webxr/)

## ライセンス

MindARはMITライセンスで提供されています。