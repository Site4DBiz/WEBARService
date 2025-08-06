// MindARコンパイラーユーティリティ
// クライアントサイドでマーカー画像を.mindファイルに変換

export interface CompileOptions {
  dpi?: number
  widthInMM?: number
  heightInMM?: number
  quality?: 'low' | 'medium' | 'high'
}

export interface CompileResult {
  success: boolean
  data?: Blob
  error?: string
}

export class MindARCompilerClient {
  private worker: Worker | null = null

  constructor() {
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      // Web Workerを動的にインポート
      this.initWorker()
    }
  }

  private async initWorker() {
    try {
      // Web Workerのコードを文字列として定義
      const workerCode = `
        // MindARコンパイラーワーカー
        class MindARCompiler {
          compile(imageData, options = {}) {
            const width = imageData.width;
            const height = imageData.height;
            const dpi = options.dpi || 72;
            const widthInMM = options.widthInMM || (width * 25.4 / dpi);
            const heightInMM = options.heightInMM || (height * 25.4 / dpi);
            
            // .mindファイルのヘッダー情報
            const header = {
              version: '1.0.0',
              targetCount: 1,
              imageWidth: width,
              imageHeight: height,
              physicalWidth: widthInMM,
              physicalHeight: heightInMM,
              dpi: dpi,
              timestamp: Date.now(),
              features: this.extractFeatures(imageData, options.quality || 'medium')
            };
            
            // JSONをバイナリに変換
            const jsonString = JSON.stringify(header);
            const encoder = new TextEncoder();
            const uint8Array = encoder.encode(jsonString);
            
            // マジックナンバーとバージョンを追加
            const magic = new Uint8Array([0x4D, 0x49, 0x4E, 0x44]); // 'MIND'
            const version = new Uint8Array([0x01, 0x00, 0x00, 0x00]); // Version 1.0.0.0
            
            // 結合
            const totalLength = magic.length + version.length + uint8Array.length;
            const result = new Uint8Array(totalLength);
            result.set(magic, 0);
            result.set(version, magic.length);
            result.set(uint8Array, magic.length + version.length);
            
            return result.buffer;
          }
          
          extractFeatures(imageData, quality) {
            const features = [];
            const data = imageData.data;
            const width = imageData.width;
            const height = imageData.height;
            
            // 品質に応じたサンプリング間隔
            const step = quality === 'high' ? 4 : quality === 'medium' ? 8 : 16;
            
            // グレースケール変換
            const grayscale = new Uint8Array(width * height);
            for (let i = 0; i < width * height; i++) {
              const r = data[i * 4];
              const g = data[i * 4 + 1];
              const b = data[i * 4 + 2];
              grayscale[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            }
            
            // 特徴点抽出
            const threshold = 30;
            for (let y = step; y < height - step; y += step) {
              for (let x = step; x < width - step; x += step) {
                const idx = y * width + x;
                const center = grayscale[idx];
                
                // 周囲のピクセルとの差分を計算
                let diff = 0;
                for (let dy = -1; dy <= 1; dy++) {
                  for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const neighborIdx = (y + dy) * width + (x + dx);
                    diff += Math.abs(center - grayscale[neighborIdx]);
                  }
                }
                
                // 閾値を超える場合は特徴点として記録
                if (diff > threshold * 8) {
                  features.push({
                    x: x / width,
                    y: y / height,
                    scale: 1.0,
                    orientation: Math.atan2(y - height/2, x - width/2),
                    strength: diff / (threshold * 8)
                  });
                }
                
                // 特徴点の数を制限
                const maxFeatures = quality === 'high' ? 1000 : quality === 'medium' ? 500 : 250;
                if (features.length >= maxFeatures) break;
              }
              if (features.length >= (quality === 'high' ? 1000 : quality === 'medium' ? 500 : 250)) break;
            }
            
            return features;
          }
        }

        // メッセージハンドラー
        self.addEventListener('message', async (event) => {
          const { type, imageData, options } = event.data;
          
          if (type === 'compile') {
            try {
              const compiler = new MindARCompiler();
              const result = compiler.compile(imageData, options);
              
              self.postMessage({
                type: 'success',
                data: result
              });
            } catch (error) {
              self.postMessage({
                type: 'error',
                error: error.message || 'Compilation failed'
              });
            }
          }
        });
      `

      // BlobとしてWorkerを作成
      const blob = new Blob([workerCode], { type: 'application/javascript' })
      const workerUrl = URL.createObjectURL(blob)
      this.worker = new Worker(workerUrl)
    } catch (error) {
      console.error('Failed to initialize Web Worker:', error)
    }
  }

  async compile(imageFile: File, options: CompileOptions = {}): Promise<CompileResult> {
    return new Promise((resolve) => {
      if (!this.worker) {
        resolve({
          success: false,
          error: 'Web Worker not available',
        })
        return
      }

      // 画像を読み込む
      const reader = new FileReader()
      reader.onload = async (e) => {
        const img = new Image()
        img.onload = () => {
          // Canvasに描画してImageDataを取得
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')

          if (!ctx) {
            resolve({
              success: false,
              error: 'Canvas context not available',
            })
            return
          }

          ctx.drawImage(img, 0, 0)
          const imageData = ctx.getImageData(0, 0, img.width, img.height)

          // Workerにメッセージを送信
          const messageHandler = (event: MessageEvent) => {
            const { type, data, error } = event.data

            if (type === 'success' && data) {
              // ArrayBufferをBlobに変換
              const blob = new Blob([data], { type: 'application/octet-stream' })
              resolve({
                success: true,
                data: blob,
              })
            } else {
              resolve({
                success: false,
                error: error || 'Compilation failed',
              })
            }

            // リスナーを削除
            this.worker?.removeEventListener('message', messageHandler)
          }

          this.worker!.addEventListener('message', messageHandler)

          // コンパイルリクエストを送信
          this.worker!.postMessage({
            type: 'compile',
            imageData: imageData,
            options: {
              ...options,
              dpi: options.dpi || 72,
              widthInMM: options.widthInMM || (img.width * 25.4) / (options.dpi || 72),
              heightInMM: options.heightInMM || (img.height * 25.4) / (options.dpi || 72),
            },
          })
        }

        img.onerror = () => {
          resolve({
            success: false,
            error: 'Failed to load image',
          })
        }

        img.src = e.target?.result as string
      }

      reader.onerror = () => {
        resolve({
          success: false,
          error: 'Failed to read file',
        })
      }

      reader.readAsDataURL(imageFile)
    })
  }

  destroy() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
  }
}

// シングルトンインスタンス
let compilerInstance: MindARCompilerClient | null = null

export function getMindARCompiler(): MindARCompilerClient {
  if (!compilerInstance) {
    compilerInstance = new MindARCompilerClient()
  }
  return compilerInstance
}
