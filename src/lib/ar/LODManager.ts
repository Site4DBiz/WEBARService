import * as THREE from 'three';
import { ModelCompressor, CompressionOptions } from './ModelCompressor';

export interface LODLevel {
  distance: number;
  model?: THREE.Object3D;
  targetRatio: number;
  compressionOptions?: CompressionOptions;
}

export interface LODConfiguration {
  levels: LODLevel[];
  autoGenerate?: boolean;
  dynamicAdjustment?: boolean;
  targetFPS?: number;
  smoothTransition?: boolean;
  cullingDistance?: number;
}

export interface LODStatistics {
  currentLevel: number;
  activeVertices: number;
  activeFaces: number;
  fps: number;
  memoryUsage: number;
  renderTime: number;
}

export class LODManager {
  private lodGroups: Map<string, THREE.LOD>;
  private modelCompressor: ModelCompressor;
  private statistics: LODStatistics;
  private performanceMonitor: PerformanceMonitor;
  private configuration: LODConfiguration;
  private camera?: THREE.Camera;
  private scene?: THREE.Scene;

  constructor(camera?: THREE.Camera, scene?: THREE.Scene) {
    this.lodGroups = new Map();
    this.modelCompressor = new ModelCompressor();
    this.camera = camera;
    this.scene = scene;
    
    this.statistics = {
      currentLevel: 0,
      activeVertices: 0,
      activeFaces: 0,
      fps: 60,
      memoryUsage: 0,
      renderTime: 0
    };
    
    this.performanceMonitor = new PerformanceMonitor();
    
    this.configuration = {
      levels: [
        { distance: 10, targetRatio: 1.0 },
        { distance: 30, targetRatio: 0.5 },
        { distance: 60, targetRatio: 0.25 },
        { distance: 100, targetRatio: 0.1 }
      ],
      autoGenerate: true,
      dynamicAdjustment: false,
      targetFPS: 60,
      smoothTransition: false,
      cullingDistance: 150
    };
  }

  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  setScene(scene: THREE.Scene): void {
    this.scene = scene;
  }

  async createLOD(
    id: string,
    originalModel: THREE.Object3D,
    config?: Partial<LODConfiguration>
  ): Promise<THREE.LOD> {
    const lodConfig = { ...this.configuration, ...config };
    const lod = new THREE.LOD();
    
    // Copy position, rotation, and scale from original model
    lod.position.copy(originalModel.position);
    lod.rotation.copy(originalModel.rotation);
    lod.scale.copy(originalModel.scale);
    
    if (lodConfig.autoGenerate) {
      // Auto-generate LOD levels
      for (const level of lodConfig.levels) {
        const lodModel = await this.generateLODLevel(originalModel, level);
        lod.addLevel(lodModel, level.distance);
      }
    } else {
      // Use provided models or generate based on configuration
      for (const level of lodConfig.levels) {
        const lodModel = level.model || await this.generateLODLevel(originalModel, level);
        lod.addLevel(lodModel, level.distance);
      }
    }
    
    // Add frustum culling distance
    if (lodConfig.cullingDistance) {
      const invisible = new THREE.Object3D();
      invisible.visible = false;
      lod.addLevel(invisible, lodConfig.cullingDistance);
    }
    
    this.lodGroups.set(id, lod);
    
    // Add to scene if available
    if (this.scene) {
      this.scene.add(lod);
    }
    
    return lod;
  }

  private async generateLODLevel(
    originalModel: THREE.Object3D,
    level: LODLevel
  ): Promise<THREE.Object3D> {
    if (level.targetRatio === 1.0) {
      return originalModel.clone();
    }
    
    const compressionOptions: CompressionOptions = {
      targetRatio: level.targetRatio,
      preserveTextures: level.distance < 30,
      optimizeMaterials: true,
      useDraco: level.targetRatio < 0.5,
      textureQuality: Math.max(30, 100 - level.distance),
      ...level.compressionOptions
    };
    
    const result = await this.modelCompressor.compressModel(originalModel, compressionOptions);
    return result.model;
  }

  updateLODs(): void {
    if (!this.camera) return;
    
    const cameraPosition = new THREE.Vector3();
    this.camera.getWorldPosition(cameraPosition);
    
    let totalVertices = 0;
    let totalFaces = 0;
    let currentLevels: number[] = [];
    
    this.lodGroups.forEach((lod) => {
      // THREE.LOD automatically updates based on camera distance
      lod.update(this.camera!);
      
      // Calculate statistics
      const distance = lod.position.distanceTo(cameraPosition);
      let levelIndex = 0;
      
      for (let i = 0; i < lod.levels.length; i++) {
        if (distance >= lod.levels[i].distance) {
          levelIndex = i;
        } else {
          break;
        }
      }
      
      currentLevels.push(levelIndex);
      
      // Count vertices and faces of active level
      if (lod.levels[levelIndex]) {
        const object = lod.levels[levelIndex].object;
        object.traverse((child) => {
          if (child instanceof THREE.Mesh && child.geometry) {
            const geometry = child.geometry as THREE.BufferGeometry;
            totalVertices += geometry.attributes.position?.count || 0;
            if (geometry.index) {
              totalFaces += geometry.index.count / 3;
            } else {
              totalFaces += (geometry.attributes.position?.count || 0) / 3;
            }
          }
        });
      }
    });
    
    // Update statistics
    this.statistics.activeVertices = totalVertices;
    this.statistics.activeFaces = Math.floor(totalFaces);
    this.statistics.currentLevel = currentLevels.length > 0 
      ? Math.round(currentLevels.reduce((a, b) => a + b, 0) / currentLevels.length)
      : 0;
  }

  enableDynamicAdjustment(targetFPS: number = 60): void {
    this.configuration.dynamicAdjustment = true;
    this.configuration.targetFPS = targetFPS;
    
    // Start monitoring performance
    this.performanceMonitor.start((stats) => {
      this.statistics.fps = stats.fps;
      this.statistics.renderTime = stats.renderTime;
      this.statistics.memoryUsage = stats.memoryUsage;
      
      // Adjust LOD distances based on performance
      if (this.configuration.dynamicAdjustment) {
        this.adjustLODDistances(stats.fps);
      }
    });
  }

  private adjustLODDistances(currentFPS: number): void {
    const targetFPS = this.configuration.targetFPS || 60;
    const fpsRatio = currentFPS / targetFPS;
    
    if (fpsRatio < 0.8) {
      // Performance is poor, use more aggressive LOD
      this.lodGroups.forEach((lod) => {
        lod.levels.forEach((level, index) => {
          if (index > 0) {
            level.distance *= 0.9;
          }
        });
      });
    } else if (fpsRatio > 1.1) {
      // Performance is good, can use higher quality
      this.lodGroups.forEach((lod) => {
        lod.levels.forEach((level, index) => {
          if (index > 0) {
            level.distance *= 1.05;
          }
        });
      });
    }
  }

  setLODConfiguration(config: Partial<LODConfiguration>): void {
    this.configuration = { ...this.configuration, ...config };
  }

  getLOD(id: string): THREE.LOD | undefined {
    return this.lodGroups.get(id);
  }

  removeLOD(id: string): void {
    const lod = this.lodGroups.get(id);
    if (lod) {
      if (this.scene) {
        this.scene.remove(lod);
      }
      this.lodGroups.delete(id);
    }
  }

  clearAllLODs(): void {
    this.lodGroups.forEach((lod) => {
      if (this.scene) {
        this.scene.remove(lod);
      }
    });
    this.lodGroups.clear();
  }

  getStatistics(): LODStatistics {
    return { ...this.statistics };
  }

  exportLODData(id: string): LODLevel[] | null {
    const lod = this.lodGroups.get(id);
    if (!lod) return null;
    
    return lod.levels.map((level, index) => ({
      distance: level.distance,
      targetRatio: 1.0 / Math.pow(2, index),
      model: level.object
    }));
  }

  importLODData(id: string, levels: LODLevel[], position?: THREE.Vector3): THREE.LOD {
    const lod = new THREE.LOD();
    
    levels.forEach((level) => {
      if (level.model) {
        lod.addLevel(level.model, level.distance);
      }
    });
    
    if (position) {
      lod.position.copy(position);
    }
    
    this.lodGroups.set(id, lod);
    
    if (this.scene) {
      this.scene.add(lod);
    }
    
    return lod;
  }

  optimizeLODForMobile(): void {
    // More aggressive LOD for mobile devices
    const mobileConfig: LODConfiguration = {
      levels: [
        { distance: 5, targetRatio: 0.8 },
        { distance: 15, targetRatio: 0.4 },
        { distance: 30, targetRatio: 0.2 },
        { distance: 50, targetRatio: 0.05 }
      ],
      autoGenerate: true,
      dynamicAdjustment: true,
      targetFPS: 30,
      cullingDistance: 60
    };
    
    this.setLODConfiguration(mobileConfig);
  }

  dispose(): void {
    this.clearAllLODs();
    this.performanceMonitor.stop();
    this.modelCompressor.dispose();
  }
}

class PerformanceMonitor {
  private isRunning: boolean = false;
  private frameCount: number = 0;
  private lastTime: number = 0;
  private callback?: (stats: { fps: number; renderTime: number; memoryUsage: number }) => void;
  private animationId?: number;

  start(callback: (stats: { fps: number; renderTime: number; memoryUsage: number }) => void): void {
    this.callback = callback;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.monitor();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  private monitor(): void {
    if (!this.isRunning) return;
    
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.frameCount++;
    
    // Update stats every second
    if (deltaTime >= 1000) {
      const fps = (this.frameCount * 1000) / deltaTime;
      const renderTime = deltaTime / this.frameCount;
      
      // Estimate memory usage
      let memoryUsage = 0;
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
      }
      
      if (this.callback) {
        this.callback({
          fps: Math.round(fps),
          renderTime: Math.round(renderTime * 100) / 100,
          memoryUsage: Math.round(memoryUsage * 100) / 100
        });
      }
      
      this.frameCount = 0;
      this.lastTime = currentTime;
    }
    
    this.animationId = requestAnimationFrame(() => this.monitor());
  }
}