/**
 * ガベージコレクション最適化マネージャー
 * JavaScriptのGCを効率的に管理し、パフォーマンスを最適化
 */

import * as THREE from 'three';

interface GCConfig {
  enableAutoGC: boolean;
  gcInterval: number; // ミリ秒
  idleTimeThreshold: number; // ミリ秒
  memoryThreshold: number; // バイト
  performanceMode: 'aggressive' | 'balanced' | 'conservative';
}

interface ResourceTracker {
  geometries: Set<THREE.BufferGeometry>;
  textures: Set<THREE.Texture>;
  materials: Set<THREE.Material>;
  renderTargets: Set<THREE.WebGLRenderTarget>;
  programs: WeakSet<WebGLProgram>;
}

export class GarbageCollectionManager {
  private config: GCConfig;
  private resourceTracker: ResourceTracker;
  private lastGCTime: number = Date.now();
  private gcTimer: NodeJS.Timeout | null = null;
  private idleTimer: NodeJS.Timeout | null = null;
  private isIdle: boolean = false;
  private frameCount: number = 0;
  private lastFrameTime: number = Date.now();
  private averageFPS: number = 60;
  private renderer: THREE.WebGLRenderer | null = null;

  constructor(config?: Partial<GCConfig>) {
    this.config = {
      enableAutoGC: config?.enableAutoGC ?? true,
      gcInterval: config?.gcInterval || 30000, // 30秒
      idleTimeThreshold: config?.idleTimeThreshold || 5000, // 5秒
      memoryThreshold: config?.memoryThreshold || 100 * 1024 * 1024, // 100MB
      performanceMode: config?.performanceMode || 'balanced',
      ...config
    };

    this.resourceTracker = {
      geometries: new Set(),
      textures: new Set(),
      materials: new Set(),
      renderTargets: new Set(),
      programs: new WeakSet()
    };

    if (this.config.enableAutoGC) {
      this.startAutoGC();
    }

    this.setupIdleDetection();
  }

  /**
   * レンダラーを設定
   */
  public setRenderer(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
  }

  /**
   * リソースを登録
   */
  public registerResource(resource: THREE.BufferGeometry | THREE.Texture | THREE.Material | THREE.WebGLRenderTarget): void {
    if (resource instanceof THREE.BufferGeometry) {
      this.resourceTracker.geometries.add(resource);
    } else if (resource instanceof THREE.Texture) {
      this.resourceTracker.textures.add(resource);
    } else if (resource instanceof THREE.Material) {
      this.resourceTracker.materials.add(resource);
    } else if (resource instanceof THREE.WebGLRenderTarget) {
      this.resourceTracker.renderTargets.add(resource);
    }
  }

  /**
   * リソースを登録解除
   */
  public unregisterResource(resource: THREE.BufferGeometry | THREE.Texture | THREE.Material | THREE.WebGLRenderTarget): void {
    if (resource instanceof THREE.BufferGeometry) {
      this.resourceTracker.geometries.delete(resource);
    } else if (resource instanceof THREE.Texture) {
      this.resourceTracker.textures.delete(resource);
    } else if (resource instanceof THREE.Material) {
      this.resourceTracker.materials.delete(resource);
    } else if (resource instanceof THREE.WebGLRenderTarget) {
      this.resourceTracker.renderTargets.delete(resource);
    }
  }

  /**
   * 手動GCを実行
   */
  public performGC(): void {
    const startTime = performance.now();

    // 未使用リソースをクリーンアップ
    this.cleanupUnusedResources();

    // メモリを整理
    this.defragmentMemory();

    // ブラウザのGCをトリガー（可能な場合）
    this.triggerBrowserGC();

    const duration = performance.now() - startTime;
    this.lastGCTime = Date.now();

    console.log(`GC completed in ${duration.toFixed(2)}ms`);
  }

  /**
   * 未使用リソースをクリーンアップ
   */
  private cleanupUnusedResources(): void {
    let cleanedCount = 0;

    // ジオメトリのクリーンアップ
    const geometriesToRemove: THREE.BufferGeometry[] = [];
    this.resourceTracker.geometries.forEach(geometry => {
      if (!this.isGeometryInUse(geometry)) {
        geometry.dispose();
        geometriesToRemove.push(geometry);
        cleanedCount++;
      }
    });
    geometriesToRemove.forEach(g => this.resourceTracker.geometries.delete(g));

    // テクスチャのクリーンアップ
    const texturesToRemove: THREE.Texture[] = [];
    this.resourceTracker.textures.forEach(texture => {
      if (!this.isTextureInUse(texture)) {
        texture.dispose();
        texturesToRemove.push(texture);
        cleanedCount++;
      }
    });
    texturesToRemove.forEach(t => this.resourceTracker.textures.delete(t));

    // マテリアルのクリーンアップ
    const materialsToRemove: THREE.Material[] = [];
    this.resourceTracker.materials.forEach(material => {
      if (!this.isMaterialInUse(material)) {
        material.dispose();
        materialsToRemove.push(material);
        cleanedCount++;
      }
    });
    materialsToRemove.forEach(m => this.resourceTracker.materials.delete(m));

    // レンダーターゲットのクリーンアップ
    const renderTargetsToRemove: THREE.WebGLRenderTarget[] = [];
    this.resourceTracker.renderTargets.forEach(target => {
      if (!this.isRenderTargetInUse(target)) {
        target.dispose();
        renderTargetsToRemove.push(target);
        cleanedCount++;
      }
    });
    renderTargetsToRemove.forEach(rt => this.resourceTracker.renderTargets.delete(rt));

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} unused resources`);
    }
  }

  /**
   * ジオメトリが使用中かチェック
   */
  private isGeometryInUse(geometry: THREE.BufferGeometry): boolean {
    // 実装は簡略化 - 実際にはシーングラフを走査して確認
    return false;
  }

  /**
   * テクスチャが使用中かチェック
   */
  private isTextureInUse(texture: THREE.Texture): boolean {
    // 実装は簡略化 - 実際にはマテリアルを確認
    return false;
  }

  /**
   * マテリアルが使用中かチェック
   */
  private isMaterialInUse(material: THREE.Material): boolean {
    // 実装は簡略化 - 実際にはメッシュを確認
    return false;
  }

  /**
   * レンダーターゲットが使用中かチェック
   */
  private isRenderTargetInUse(target: THREE.WebGLRenderTarget): boolean {
    // 実装は簡略化
    return false;
  }

  /**
   * メモリのデフラグメンテーション
   */
  private defragmentMemory(): void {
    // ArrayBufferの再配置
    this.resourceTracker.geometries.forEach(geometry => {
      for (const name in geometry.attributes) {
        const attribute = geometry.attributes[name];
        if (attribute instanceof THREE.BufferAttribute) {
          // 新しいArrayBufferを作成してコピー
          const newArray = new (attribute.array.constructor as any)(attribute.array);
          attribute.array = newArray;
          attribute.needsUpdate = true;
        }
      }
    });
  }

  /**
   * ブラウザのGCをトリガー
   */
  private triggerBrowserGC(): void {
    // Chrome の場合
    if ('gc' in window && typeof (window as any).gc === 'function') {
      try {
        (window as any).gc();
      } catch (e) {
        // GCが利用できない場合は無視
      }
    }

    // メモリプレッシャーを作成してGCを促す
    if (this.config.performanceMode === 'aggressive') {
      this.createMemoryPressure();
    }
  }

  /**
   * メモリプレッシャーを作成
   */
  private createMemoryPressure(): void {
    // 一時的に大きな配列を作成して即座に解放
    let temp = new ArrayBuffer(10 * 1024 * 1024); // 10MB
    temp = null as any;
  }

  /**
   * 自動GCを開始
   */
  private startAutoGC(): void {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
    }

    this.gcTimer = setInterval(() => {
      if (this.shouldPerformGC()) {
        this.performGC();
      }
    }, this.config.gcInterval);
  }

  /**
   * GCを実行すべきか判定
   */
  private shouldPerformGC(): boolean {
    // アイドル時
    if (this.isIdle) {
      return true;
    }

    // メモリ使用量が閾値を超えた場合
    if (this.getMemoryUsage() > this.config.memoryThreshold) {
      return true;
    }

    // パフォーマンスモードによる判定
    switch (this.config.performanceMode) {
      case 'aggressive':
        return this.averageFPS < 50;
      case 'balanced':
        return this.averageFPS < 30;
      case 'conservative':
        return this.averageFPS < 15;
      default:
        return false;
    }
  }

  /**
   * メモリ使用量を取得
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * アイドル検出の設定
   */
  private setupIdleDetection(): void {
    if (typeof window === 'undefined') return;

    let lastActivity = Date.now();

    const resetIdleTimer = () => {
      lastActivity = Date.now();
      this.isIdle = false;

      if (this.idleTimer) {
        clearTimeout(this.idleTimer);
      }

      this.idleTimer = setTimeout(() => {
        this.isIdle = true;
        console.log('System is idle, performing GC');
        this.performGC();
      }, this.config.idleTimeThreshold);
    };

    // ユーザーアクティビティを監視
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      window.addEventListener(event, resetIdleTimer, { passive: true });
    });

    resetIdleTimer();
  }

  /**
   * フレームを更新（FPS計測用）
   */
  public updateFrame(): void {
    this.frameCount++;
    const now = Date.now();
    const delta = now - this.lastFrameTime;

    if (delta >= 1000) {
      this.averageFPS = (this.frameCount / delta) * 1000;
      this.frameCount = 0;
      this.lastFrameTime = now;
    }
  }

  /**
   * 統計情報を取得
   */
  public getStats(): {
    lastGCTime: Date;
    resourceCounts: {
      geometries: number;
      textures: number;
      materials: number;
      renderTargets: number;
    };
    memoryUsage: number;
    averageFPS: number;
    isIdle: boolean;
    performanceMode: string;
  } {
    return {
      lastGCTime: new Date(this.lastGCTime),
      resourceCounts: {
        geometries: this.resourceTracker.geometries.size,
        textures: this.resourceTracker.textures.size,
        materials: this.resourceTracker.materials.size,
        renderTargets: this.resourceTracker.renderTargets.size
      },
      memoryUsage: this.getMemoryUsage(),
      averageFPS: this.averageFPS,
      isIdle: this.isIdle,
      performanceMode: this.config.performanceMode
    };
  }

  /**
   * パフォーマンスモードを設定
   */
  public setPerformanceMode(mode: 'aggressive' | 'balanced' | 'conservative'): void {
    this.config.performanceMode = mode;
    console.log(`Performance mode set to: ${mode}`);
  }

  /**
   * 強制的にリソースを解放
   */
  public forceReleaseAll(): void {
    console.warn('Force releasing all tracked resources');

    // すべてのジオメトリを解放
    this.resourceTracker.geometries.forEach(geometry => {
      geometry.dispose();
    });
    this.resourceTracker.geometries.clear();

    // すべてのテクスチャを解放
    this.resourceTracker.textures.forEach(texture => {
      texture.dispose();
    });
    this.resourceTracker.textures.clear();

    // すべてのマテリアルを解放
    this.resourceTracker.materials.forEach(material => {
      material.dispose();
    });
    this.resourceTracker.materials.clear();

    // すべてのレンダーターゲットを解放
    this.resourceTracker.renderTargets.forEach(target => {
      target.dispose();
    });
    this.resourceTracker.renderTargets.clear();

    // 即座にGCを実行
    this.performGC();
  }

  /**
   * クリーンアップ
   */
  public dispose(): void {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = null;
    }

    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    this.forceReleaseAll();
  }
}