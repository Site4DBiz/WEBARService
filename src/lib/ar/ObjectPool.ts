/**
 * オブジェクトプーリングシステム
 * 頻繁に作成・破棄されるオブジェクトを再利用してメモリ効率を改善
 */

import * as THREE from 'three';

interface PoolableObject {
  reset(): void;
  isActive: boolean;
}

interface PoolConfig {
  initialSize: number;
  maxSize: number;
  growthFactor: number;
  shrinkThreshold: number;
  shrinkFactor: number;
}

/**
 * ジェネリックオブジェクトプール
 */
export class ObjectPool<T extends PoolableObject> {
  private available: T[] = [];
  private inUse: Set<T> = new Set();
  private factory: () => T;
  private config: PoolConfig;
  private lastShrinkTime: number = Date.now();
  private shrinkInterval: number = 60000; // 1分ごとにサイズチェック

  constructor(factory: () => T, config?: Partial<PoolConfig>) {
    this.factory = factory;
    this.config = {
      initialSize: config?.initialSize || 10,
      maxSize: config?.maxSize || 100,
      growthFactor: config?.growthFactor || 2,
      shrinkThreshold: config?.shrinkThreshold || 0.25,
      shrinkFactor: config?.shrinkFactor || 0.5,
      ...config
    };

    this.initialize();
  }

  /**
   * プールの初期化
   */
  private initialize(): void {
    for (let i = 0; i < this.config.initialSize; i++) {
      this.available.push(this.factory());
    }
  }

  /**
   * オブジェクトを取得
   */
  public acquire(): T | null {
    // 利用可能なオブジェクトがない場合
    if (this.available.length === 0) {
      if (this.size < this.config.maxSize) {
        this.grow();
      } else {
        console.warn('Object pool at maximum capacity');
        return null;
      }
    }

    const obj = this.available.pop();
    if (obj) {
      obj.isActive = true;
      this.inUse.add(obj);
      return obj;
    }

    return null;
  }

  /**
   * オブジェクトを返却
   */
  public release(obj: T): void {
    if (!this.inUse.has(obj)) {
      console.warn('Attempting to release object not from this pool');
      return;
    }

    obj.reset();
    obj.isActive = false;
    this.inUse.delete(obj);
    this.available.push(obj);

    // 定期的にプールサイズをチェック
    this.checkShrink();
  }

  /**
   * プールを拡張
   */
  private grow(): void {
    const currentSize = this.size;
    const newSize = Math.min(
      Math.ceil(currentSize * this.config.growthFactor),
      this.config.maxSize
    );
    const growthCount = newSize - currentSize;

    for (let i = 0; i < growthCount; i++) {
      this.available.push(this.factory());
    }
  }

  /**
   * プールを縮小
   */
  private shrink(): void {
    const targetSize = Math.max(
      this.config.initialSize,
      Math.floor(this.size * this.config.shrinkFactor)
    );
    
    while (this.available.length > targetSize) {
      this.available.pop();
    }

    this.lastShrinkTime = Date.now();
  }

  /**
   * 縮小チェック
   */
  private checkShrink(): void {
    const now = Date.now();
    if (now - this.lastShrinkTime < this.shrinkInterval) {
      return;
    }

    const utilizationRate = this.inUse.size / this.size;
    if (utilizationRate < this.config.shrinkThreshold && this.size > this.config.initialSize) {
      this.shrink();
    }
  }

  /**
   * 全オブジェクトをリセット
   */
  public reset(): void {
    this.inUse.forEach(obj => {
      obj.reset();
      obj.isActive = false;
    });
    
    this.available.push(...Array.from(this.inUse));
    this.inUse.clear();
  }

  /**
   * プールをクリア
   */
  public clear(): void {
    this.reset();
    this.available = [];
    this.inUse.clear();
  }

  /**
   * プールのサイズを取得
   */
  public get size(): number {
    return this.available.length + this.inUse.size;
  }

  /**
   * 使用中のオブジェクト数を取得
   */
  public get activeCount(): number {
    return this.inUse.size;
  }

  /**
   * 利用可能なオブジェクト数を取得
   */
  public get availableCount(): number {
    return this.available.length;
  }

  /**
   * 統計情報を取得
   */
  public getStats(): {
    total: number;
    active: number;
    available: number;
    utilizationRate: number;
  } {
    return {
      total: this.size,
      active: this.activeCount,
      available: this.availableCount,
      utilizationRate: this.activeCount / this.size
    };
  }
}

/**
 * Three.js Vector3用のプール実装
 */
export class Vector3Pool {
  private static instance: Vector3Pool;
  private pool: ObjectPool<PoolableVector3>;

  private constructor() {
    this.pool = new ObjectPool(
      () => new PoolableVector3(),
      { initialSize: 50, maxSize: 500 }
    );
  }

  public static getInstance(): Vector3Pool {
    if (!Vector3Pool.instance) {
      Vector3Pool.instance = new Vector3Pool();
    }
    return Vector3Pool.instance;
  }

  public acquire(x?: number, y?: number, z?: number): PoolableVector3 | null {
    const vec = this.pool.acquire();
    if (vec && x !== undefined && y !== undefined && z !== undefined) {
      vec.set(x, y, z);
    }
    return vec;
  }

  public release(vec: PoolableVector3): void {
    this.pool.release(vec);
  }

  public getStats() {
    return this.pool.getStats();
  }
}

class PoolableVector3 extends THREE.Vector3 implements PoolableObject {
  public isActive: boolean = false;

  reset(): void {
    this.set(0, 0, 0);
  }
}

/**
 * Three.js Quaternion用のプール実装
 */
export class QuaternionPool {
  private static instance: QuaternionPool;
  private pool: ObjectPool<PoolableQuaternion>;

  private constructor() {
    this.pool = new ObjectPool(
      () => new PoolableQuaternion(),
      { initialSize: 30, maxSize: 300 }
    );
  }

  public static getInstance(): QuaternionPool {
    if (!QuaternionPool.instance) {
      QuaternionPool.instance = new QuaternionPool();
    }
    return QuaternionPool.instance;
  }

  public acquire(): PoolableQuaternion | null {
    return this.pool.acquire();
  }

  public release(quat: PoolableQuaternion): void {
    this.pool.release(quat);
  }

  public getStats() {
    return this.pool.getStats();
  }
}

class PoolableQuaternion extends THREE.Quaternion implements PoolableObject {
  public isActive: boolean = false;

  reset(): void {
    this.identity();
  }
}

/**
 * Three.js Matrix4用のプール実装
 */
export class Matrix4Pool {
  private static instance: Matrix4Pool;
  private pool: ObjectPool<PoolableMatrix4>;

  private constructor() {
    this.pool = new ObjectPool(
      () => new PoolableMatrix4(),
      { initialSize: 20, maxSize: 200 }
    );
  }

  public static getInstance(): Matrix4Pool {
    if (!Matrix4Pool.instance) {
      Matrix4Pool.instance = new Matrix4Pool();
    }
    return Matrix4Pool.instance;
  }

  public acquire(): PoolableMatrix4 | null {
    return this.pool.acquire();
  }

  public release(mat: PoolableMatrix4): void {
    this.pool.release(mat);
  }

  public getStats() {
    return this.pool.getStats();
  }
}

class PoolableMatrix4 extends THREE.Matrix4 implements PoolableObject {
  public isActive: boolean = false;

  reset(): void {
    this.identity();
  }
}

/**
 * Three.js Mesh用のプール実装
 */
export class MeshPool {
  private pools: Map<string, ObjectPool<PoolableMesh>> = new Map();

  /**
   * 特定のジオメトリとマテリアル用のプールを作成
   */
  public createPool(
    key: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    config?: Partial<PoolConfig>
  ): void {
    if (this.pools.has(key)) {
      console.warn(`Pool with key "${key}" already exists`);
      return;
    }

    const pool = new ObjectPool(
      () => new PoolableMesh(geometry, material),
      config
    );

    this.pools.set(key, pool);
  }

  /**
   * メッシュを取得
   */
  public acquire(key: string): PoolableMesh | null {
    const pool = this.pools.get(key);
    if (!pool) {
      console.warn(`Pool with key "${key}" not found`);
      return null;
    }

    return pool.acquire();
  }

  /**
   * メッシュを返却
   */
  public release(key: string, mesh: PoolableMesh): void {
    const pool = this.pools.get(key);
    if (!pool) {
      console.warn(`Pool with key "${key}" not found`);
      return;
    }

    pool.release(mesh);
  }

  /**
   * 全プールの統計情報を取得
   */
  public getAllStats(): Map<string, any> {
    const stats = new Map();
    this.pools.forEach((pool, key) => {
      stats.set(key, pool.getStats());
    });
    return stats;
  }

  /**
   * 全プールをクリア
   */
  public clearAll(): void {
    this.pools.forEach(pool => pool.clear());
    this.pools.clear();
  }
}

class PoolableMesh extends THREE.Mesh implements PoolableObject {
  public isActive: boolean = false;

  reset(): void {
    this.position.set(0, 0, 0);
    this.rotation.set(0, 0, 0);
    this.scale.set(1, 1, 1);
    this.visible = true;
    this.userData = {};
  }
}

/**
 * パーティクル用のプール実装
 */
export class ParticlePool {
  private pool: ObjectPool<PoolableParticle>;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;

  constructor(
    geometry: THREE.BufferGeometry,
    material: THREE.PointsMaterial,
    config?: Partial<PoolConfig>
  ) {
    this.geometry = geometry;
    this.material = material;
    
    this.pool = new ObjectPool(
      () => new PoolableParticle(this.geometry, this.material),
      config
    );
  }

  public acquire(): PoolableParticle | null {
    return this.pool.acquire();
  }

  public release(particle: PoolableParticle): void {
    this.pool.release(particle);
  }

  public getStats() {
    return this.pool.getStats();
  }

  public clear(): void {
    this.pool.clear();
  }
}

class PoolableParticle extends THREE.Points implements PoolableObject {
  public isActive: boolean = false;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public life: number = 1.0;
  public maxLife: number = 1.0;

  reset(): void {
    this.position.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.life = 1.0;
    this.maxLife = 1.0;
    this.scale.set(1, 1, 1);
    this.visible = true;
  }
}

/**
 * オブジェクトプールマネージャー
 * 全プールの統合管理
 */
export class ObjectPoolManager {
  private static instance: ObjectPoolManager;
  private meshPool: MeshPool;
  private particlePools: Map<string, ParticlePool> = new Map();

  private constructor() {
    this.meshPool = new MeshPool();
  }

  public static getInstance(): ObjectPoolManager {
    if (!ObjectPoolManager.instance) {
      ObjectPoolManager.instance = new ObjectPoolManager();
    }
    return ObjectPoolManager.instance;
  }

  public getMeshPool(): MeshPool {
    return this.meshPool;
  }

  public createParticlePool(
    key: string,
    geometry: THREE.BufferGeometry,
    material: THREE.PointsMaterial,
    config?: Partial<PoolConfig>
  ): ParticlePool {
    if (this.particlePools.has(key)) {
      return this.particlePools.get(key)!;
    }

    const pool = new ParticlePool(geometry, material, config);
    this.particlePools.set(key, pool);
    return pool;
  }

  public getParticlePool(key: string): ParticlePool | undefined {
    return this.particlePools.get(key);
  }

  /**
   * 全プールの統計情報を取得
   */
  public getAllStats(): {
    vectors: any;
    quaternions: any;
    matrices: any;
    meshes: Map<string, any>;
    particles: Map<string, any>;
  } {
    const particleStats = new Map();
    this.particlePools.forEach((pool, key) => {
      particleStats.set(key, pool.getStats());
    });

    return {
      vectors: Vector3Pool.getInstance().getStats(),
      quaternions: QuaternionPool.getInstance().getStats(),
      matrices: Matrix4Pool.getInstance().getStats(),
      meshes: this.meshPool.getAllStats(),
      particles: particleStats
    };
  }

  /**
   * 全プールをクリア
   */
  public clearAll(): void {
    this.meshPool.clearAll();
    this.particlePools.forEach(pool => pool.clear());
    this.particlePools.clear();
  }
}