# アイコン更新手順

## 概要
scheduler_icon.pngを差し替えた際の更新手順です。

## 手順

### 1. アイコンファイルの更新
```bash
cd electron-app

# assetsディレクトリのアイコンを更新
cp assets/scheduler_icon.png assets/icon.png
cp assets/scheduler_icon.png assets/tray-icon.png

# buildディレクトリのアイコンを更新
cp assets/scheduler_icon.png build/icon.png

# 各種サイズのアイコンを更新
cp build/icon.png build/icons/512x512.png
cp build/icon.png build/icons/256x256.png
cp build/icon.png build/icons/128x128.png
cp build/icon.png build/icons/64x64.png
cp build/icon.png build/icons/32x32.png
cp build/icon.png build/icons/16x16.png
```

### 2. アプリケーションの再ビルド
```bash
npm run build
```

### 3. 確認方法
- 開発モード: `npm start`でアプリケーションを起動
- ビルド後: `dist/mac-arm64/TaskFlow Automation.app`（macOSの場合）を実行
- システムトレイにアイコンが表示されることを確認
- アプリケーションウィンドウのタイトルバーにアイコンが表示されることを確認

## 注意事項
- アイコンファイルは正方形の画像を推奨（scheduler_icon.pngなど）
- トレイアイコンは自動的に16x16にリサイズされます
- プラットフォーム固有のアイコン形式（.icns、.ico）への変換は、より高品質な表示のために推奨されます

## トラブルシューティング
- アイコンが更新されない場合は、以下を試してください：
  1. アプリケーションを完全に終了（トレイアイコンから「終了」を選択）
  2. `dist`ディレクトリを削除して再ビルド
  3. キャッシュをクリア: `rm -rf ~/Library/Application\ Support/taskflow-automation/`
