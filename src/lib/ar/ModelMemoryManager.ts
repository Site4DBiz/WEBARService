/**
 * 3Dモデルメモリ管理システム
 * モデルのロード、キャッシュ、メモリ最適化を管理
 */

import * as THREE from 'three';

interface ModelEntry {
  model: THREE.Group;
  size: number;
  lastAccess: number;
  refCount: number;
  geometries: THREE.BufferGeometry[];
  textures: THREE.Texture[];
  materials: THREE.Material[];
  animations?: THREE.AnimationClip[];
}

interface ModelMemoryConfig {
  maxCacheSizeMB: number;
  maxModels: number;
  autoDisposeTimeout: number; // ミリ秒
  enableLOD: boolean;
  compressTextures: boolean;
}

export class ModelMemoryManager {
  private models: Map<string, ModelEntry> = new Map();
  private config: ModelMemoryConfig;
  private currentMemoryUsage: number = 0;
  private disposeTimer: NodeJS.Timeout | null = null;
  private memoryWarningThreshold: number = 0.8;
  private memoryCriticalThreshold: number = 0.95;

  constructor(config?: Partial<ModelMemoryConfig>) {
    this.config = {
      maxCacheSizeMB: config?.maxCacheSizeMB || 200,
      maxModels: config?.maxModels || 50,
      autoDisposeTimeout: config?.autoDisposeTimeout || 60000, // 1分
      enableLOD: config?.enableLOD ?? true,
      compressTextures: config?.compressTextures ?? true,
      ...config
    };

    this.startAutoDispose();
    this.setupMemoryListeners();
  }

  /**
   * メモリイベントリスナーの設定
   */
  private setupMemoryListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('memoryWarning', () => {
        this.performMemoryOptimization('warning');
      });

      window.addEventListener('memoryCritical', () => {
        this.performMemoryOptimization('critical');
      });
    }
  }

  /**
   * モデルを追加
   */
  public addModel(key: string, model: THREE.Group): void {
    // 既存のモデルがある場合は削除
    if (this.models.has(key)) {
      this.removeModel(key);
    }

    // モデルサイズを計算
    const modelInfo = this.analyzeModel(model);
    const totalSize = modelInfo.geometrySize + modelInfo.textureSize + modelInfo.materialSize;

    // メモリ制限チェック
    const maxMemory = this.config.maxCacheSizeMB * 1024 * 1024;
    while (this.currentMemoryUsage + totalSize > maxMemory && this.models.size > 0) {
      this.evictLRU();
    }

    // モデル数制限チェック
    while (this.models.size >= this.config.maxModels) {
      this.evictLRU();
    }

    // モデルエントリを作成
    const entry: ModelEntry = {
      model: model.clone(),
      size: totalSize,
      lastAccess: Date.now(),
      refCount: 0,
      geometries: modelInfo.geometries,
      textures: modelInfo.textures,
      materials: modelInfo.materials,
      animations: modelInfo.animations
    };

    this.models.set(key, entry);
    this.currentMemoryUsage += totalSize;

    // メモリ閾値チェック
    this.checkMemoryThresholds();
  }

  /**
   * モデルを取得
   */
  public getModel(key: string): THREE.Group | null {
    const entry = this.models.get(key);
    if (entry) {
      entry.lastAccess = Date.now();
      entry.refCount++;
      return entry.model.clone();
    }
    return null;
  }

  /**
   * モデルを解放
   */
  public releaseModel(key: string): void {
    const entry = this.models.get(key);
    if (entry && entry.refCount > 0) {
      entry.refCount--;
    }
  }

  /**
   * モデルを削除
   */
  public removeModel(key: string): void {
    const entry = this.models.get(key);
    if (entry) {
      if (entry.refCount > 0) {
        console.warn(`Model ${key} is still in use (refCount: ${entry.refCount})`);
        return;
      }

      this.disposeModelResources(entry);
      this.currentMemoryUsage -= entry.size;
      this.models.delete(key);
    }
  }

  /**
   * モデルを分析
   */
  private analyzeModel(model: THREE.Group): {
    geometries: THREE.BufferGeometry[];
    textures: THREE.Texture[];
    materials: THREE.Material[];
    animations?: THREE.AnimationClip[];
    geometrySize: number;
    textureSize: number;
    materialSize: number;
  } {
    const geometries: THREE.BufferGeometry[] = [];
    const textures: THREE.Texture[] = [];
    const materials: THREE.Material[] = [];
    const animations: THREE.AnimationClip[] = [];

    let geometrySize = 0;
    let textureSize = 0;
    let materialSize = 0;

    // モデルを走査してリソースを収集
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // ジオメトリ
        if (child.geometry && !geometries.includes(child.geometry)) {
          geometries.push(child.geometry);
          geometrySize += this.calculateGeometrySize(child.geometry);
        }

        // マテリアル
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(mat => {
          if (mat && !materials.includes(mat)) {
            materials.push(mat);
            materialSize += this.calculateMaterialSize(mat);

            // テクスチャ
            this.extractTexturesFromMaterial(mat).forEach(tex => {
              if (!textures.includes(tex)) {
                textures.push(tex);
                textureSize += this.calculateTextureSize(tex);
              }
            });
          }
        });
      }
    });

    // アニメーション
    if ('animations' in model && Array.isArray(model.animations)) {
      animations.push(...model.animations);
    }

    return {
      geometries,
      textures,
      materials,
      animations,
      geometrySize,
      textureSize,
      materialSize
    };
  }

  /**
   * ジオメトリサイズを計算
   */
  private calculateGeometrySize(geometry: THREE.BufferGeometry): number {
    let size = 0;

    // 頂点属性のサイズを計算
    for (const name in geometry.attributes) {
      const attribute = geometry.attributes[name];
      if (attribute instanceof THREE.BufferAttribute) {
        size += attribute.array.byteLength;
      }
    }

    // インデックスのサイズ
    if (geometry.index) {
      size += geometry.index.array.byteLength;
    }

    return size;
  }

  /**
   * テクスチャサイズを計算
   */
  private calculateTextureSize(texture: THREE.Texture): number {
    if (!texture.image) return 0;

    const width = texture.image.width || 0;
    const height = texture.image.height || 0;
    const channels = texture.format === THREE.RGBAFormat ? 4 : 3;

    let size = width * height * channels;

    // ミップマップのサイズを追加
    if (texture.generateMipmaps) {
      let mipWidth = width;
      let mipHeight = height;

      while (mipWidth > 1 || mipHeight > 1) {
        mipWidth = Math.max(1, Math.floor(mipWidth / 2));
        mipHeight = Math.max(1, Math.floor(mipHeight / 2));
        size += mipWidth * mipHeight * channels;
      }
    }

    return size;
  }

  /**
   * マテリアルサイズを計算
   */
  private calculateMaterialSize(material: THREE.Material): number {
    // マテリアルの基本サイズ（プロパティ数 * 平均サイズ）
    return Object.keys(material).length * 64;
  }

  /**
   * マテリアルからテクスチャを抽出
   */
  private extractTexturesFromMaterial(material: THREE.Material): THREE.Texture[] {
    const textures: THREE.Texture[] = [];
    const mat = material as any;

    const textureProperties = [
      'map', 'normalMap', 'bumpMap', 'roughnessMap', 'metalnessMap',
      'alphaMap', 'emissiveMap', 'specularMap', 'envMap', 'lightMap',
      'aoMap', 'displacementMap', 'gradientMap', 'clearcoatMap',
      'clearcoatNormalMap', 'clearcoatRoughnessMap'
    ];

    textureProperties.forEach(prop => {
      if (mat[prop] instanceof THREE.Texture) {
        textures.push(mat[prop]);
      }
    });

    return textures;
  }

  /**
   * LRU方式でモデルを削除
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.models.entries()) {
      if (entry.refCount === 0 && entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.removeModel(oldestKey);
    }
  }

  /**
   * モデルリソースを破棄
   */
  private disposeModelResources(entry: ModelEntry): void {
    // ジオメトリの破棄
    entry.geometries.forEach(geometry => {
      geometry.dispose();
    });

    // テクスチャの破棄
    entry.textures.forEach(texture => {
      texture.dispose();
    });

    // マテリアルの破棄
    entry.materials.forEach(material => {
      material.dispose();
    });

    // モデル自体の破棄
    this.disposeObject3D(entry.model);
  }

  /**
   * Object3Dを再帰的に破棄
   */
  private disposeObject3D(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }

        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach(material => {
          if (material) {
            material.dispose();
          }
        });
      }
    });

    // 親から削除
    if (object.parent) {
      object.parent.remove(object);
    }
  }

  /**
   * メモリ閾値チェック
   */
  private checkMemoryThresholds(): void {
    const maxMemory = this.config.maxCacheSizeMB * 1024 * 1024;
    const usageRatio = this.currentMemoryUsage / maxMemory;

    if (usageRatio > this.memoryCriticalThreshold) {
      console.error(`Critical memory usage: ${(usageRatio * 100).toFixed(2)}%`);
      this.performMemoryOptimization('critical');
    } else if (usageRatio > this.memoryWarningThreshold) {
      console.warn(`Memory usage warning: ${(usageRatio * 100).toFixed(2)}%`);
      this.performMemoryOptimization('warning');
    }
  }

  /**
   * メモリ最適化を実行
   */
  private performMemoryOptimization(level: 'warning' | 'critical'): void {
    if (level === 'critical') {
      // クリティカル: 使用中でないモデルをすべて削除
      const toRemove: string[] = [];
      for (const [key, entry] of this.models.entries()) {
        if (entry.refCount === 0) {
          toRemove.push(key);
        }
      }
      toRemove.forEach(key => this.removeModel(key));
    } else {
      // 警告: 30秒以上アクセスされていないモデルを削除
      const threshold = Date.now() - 30000;
      const toRemove: string[] = [];
      for (const [key, entry] of this.models.entries()) {
        if (entry.refCount === 0 && entry.lastAccess < threshold) {
          toRemove.push(key);
        }
      }
      toRemove.forEach(key => this.removeModel(key));
    }
  }

  /**
   * 自動破棄を開始
   */
  private startAutoDispose(): void {
    if (this.disposeTimer) {
      clearInterval(this.disposeTimer);
    }

    this.disposeTimer = setInterval(() => {
      const threshold = Date.now() - this.config.autoDisposeTimeout;
      const toRemove: string[] = [];

      for (const [key, entry] of this.models.entries()) {
        if (entry.refCount === 0 && entry.lastAccess < threshold) {
          toRemove.push(key);
        }
      }

      toRemove.forEach(key => this.removeModel(key));
    }, this.config.autoDisposeTimeout);
  }

  /**
   * 統計情報を取得
   */
  public getStats(): {
    modelCount: number;
    totalMemoryMB: number;
    usageRatio: number;
    activeModels: number;
    cachedModels: string[];
  } {
    let activeCount = 0;
    const cachedModels: string[] = [];

    for (const [key, entry] of this.models.entries()) {
      cachedModels.push(key);
      if (entry.refCount > 0) {
        activeCount++;
      }
    }

    const maxMemory = this.config.maxCacheSizeMB * 1024 * 1024;

    return {
      modelCount: this.models.size,
      totalMemoryMB: this.currentMemoryUsage / (1024 * 1024),
      usageRatio: this.currentMemoryUsage / maxMemory,
      activeModels: activeCount,
      cachedModels
    };
  }

  /**
   * 詳細情報を取得
   */
  public getDetailedInfo(): Array<{
    key: string;
    sizeMB: number;
    lastAccess: Date;
    refCount: number;
    geometries: number;
    textures: number;
    materials: number;
  }> {
    const info: Array<{
      key: string;
      sizeMB: number;
      lastAccess: Date;
      refCount: number;
      geometries: number;
      textures: number;
      materials: number;
    }> = [];

    for (const [key, entry] of this.models.entries()) {
      info.push({
        key,
        sizeMB: entry.size / (1024 * 1024),
        lastAccess: new Date(entry.lastAccess),
        refCount: entry.refCount,
        geometries: entry.geometries.length,
        textures: entry.textures.length,
        materials: entry.materials.length
      });
    }

    return info.sort((a, b) => b.sizeMB - a.sizeMB);
  }

  /**
   * すべてクリア
   */
  public clear(): void {
    for (const [key, entry] of this.models.entries()) {
      if (entry.refCount > 0) {
        console.warn(`Clearing model ${key} with active references (refCount: ${entry.refCount})`);
      }
      this.disposeModelResources(entry);
    }

    this.models.clear();
    this.currentMemoryUsage = 0;
  }

  /**
   * クリーンアップ
   */
  public dispose(): void {
    if (this.disposeTimer) {
      clearInterval(this.disposeTimer);
      this.disposeTimer = null;
    }

    this.clear();
  }
}