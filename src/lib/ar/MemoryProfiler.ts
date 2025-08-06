/**
 * メモリプロファイラー
 * AR体験中のメモリ使用量を監視し、最適化を支援
 */

import * as THREE from 'three';

interface MemoryStats {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
  percentageUsed: number;
}

interface ResourceStats {
  geometries: number;
  textures: number;
  materials: number;
  programs: number;
  renderTargets: number;
  buffers: number;
  totalSize: number;
}

interface MemorySnapshot {
  timestamp: number;
  memory: MemoryStats;
  resources: ResourceStats;
  custom: Map<string, number>;
}

export class MemoryProfiler {
  private snapshots: MemorySnapshot[] = [];
  private maxSnapshots: number = 100;
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private customMetrics: Map<string, number> = new Map();
  private renderer: THREE.WebGLRenderer | null = null;
  private warningThreshold: number = 0.8; // 80%のメモリ使用率で警告
  private criticalThreshold: number = 0.95; // 95%のメモリ使用率でクリティカル

  constructor() {
    this.checkPerformanceMemory();
  }

  /**
   * パフォーマンスメモリAPIの可用性チェック
   */
  private checkPerformanceMemory(): boolean {
    if ('memory' in performance) {
      return true;
    }
    console.warn('Performance Memory API is not available in this browser');
    return false;
  }

  /**
   * レンダラーの設定
   */
  public setRenderer(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
  }

  /**
   * 現在のメモリ統計を取得
   */
  public getMemoryStats(): MemoryStats | null {
    if (!('memory' in performance)) {
      return null;
    }

    const memory = (performance as any).memory;
    return {
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      totalJSHeapSize: memory.totalJSHeapSize,
      usedJSHeapSize: memory.usedJSHeapSize,
      percentageUsed: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
    };
  }

  /**
   * Three.jsリソース統計を取得
   */
  public getResourceStats(): ResourceStats {
    if (!this.renderer) {
      return {
        geometries: 0,
        textures: 0,
        materials: 0,
        programs: 0,
        renderTargets: 0,
        buffers: 0,
        totalSize: 0
      };
    }

    const info = this.renderer.info;
    const memory = info.memory;
    const programs = info.programs;

    // リソースサイズの推定
    let totalSize = 0;
    
    // ジオメトリサイズ（頂点数 * 頂点あたりのバイト数）
    totalSize += memory.geometries * 1024 * 32; // 推定値: 32KB per geometry
    
    // テクスチャサイズ
    totalSize += memory.textures * 1024 * 256; // 推定値: 256KB per texture
    
    // マテリアルとプログラム
    totalSize += (programs?.length || 0) * 1024 * 8; // 推定値: 8KB per program

    return {
      geometries: memory.geometries,
      textures: memory.textures,
      materials: 0, // Three.js info doesn't directly provide materials count
      programs: programs?.length || 0,
      renderTargets: 0,
      buffers: 0,
      totalSize
    };
  }

  /**
   * メモリスナップショットを取得
   */
  public takeSnapshot(): MemorySnapshot {
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      memory: this.getMemoryStats() || {
        jsHeapSizeLimit: 0,
        totalJSHeapSize: 0,
        usedJSHeapSize: 0,
        percentageUsed: 0
      },
      resources: this.getResourceStats(),
      custom: new Map(this.customMetrics)
    };

    this.snapshots.push(snapshot);
    
    // 最大スナップショット数を超えたら古いものを削除
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    return snapshot;
  }

  /**
   * カスタムメトリクスを追加
   */
  public addCustomMetric(name: string, value: number): void {
    this.customMetrics.set(name, value);
  }

  /**
   * カスタムメトリクスを削除
   */
  public removeCustomMetric(name: string): void {
    this.customMetrics.delete(name);
  }

  /**
   * 継続的な監視を開始
   */
  public startMonitoring(intervalMs: number = 1000): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      const snapshot = this.takeSnapshot();
      this.checkMemoryThresholds(snapshot);
    }, intervalMs);
  }

  /**
   * 監視を停止
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
  }

  /**
   * メモリ閾値チェック
   */
  private checkMemoryThresholds(snapshot: MemorySnapshot): void {
    const percentageUsed = snapshot.memory.percentageUsed;
    
    if (percentageUsed > this.criticalThreshold * 100) {
      this.onCriticalMemory(snapshot);
    } else if (percentageUsed > this.warningThreshold * 100) {
      this.onWarningMemory(snapshot);
    }
  }

  /**
   * 警告レベルのメモリ使用時の処理
   */
  private onWarningMemory(snapshot: MemorySnapshot): void {
    console.warn(`Memory usage warning: ${snapshot.memory.percentageUsed.toFixed(2)}%`);
    // カスタムイベントを発火
    window.dispatchEvent(new CustomEvent('memoryWarning', { detail: snapshot }));
  }

  /**
   * クリティカルレベルのメモリ使用時の処理
   */
  private onCriticalMemory(snapshot: MemorySnapshot): void {
    console.error(`Critical memory usage: ${snapshot.memory.percentageUsed.toFixed(2)}%`);
    // カスタムイベントを発火
    window.dispatchEvent(new CustomEvent('memoryCritical', { detail: snapshot }));
  }

  /**
   * メモリリークの検出
   */
  public detectMemoryLeaks(threshold: number = 10): string[] {
    const leaks: string[] = [];
    
    if (this.snapshots.length < 10) {
      return leaks;
    }

    // 最近のスナップショットと過去のスナップショットを比較
    const recent = this.snapshots.slice(-5);
    const past = this.snapshots.slice(-10, -5);
    
    const recentAvg = this.calculateAverageMemory(recent);
    const pastAvg = this.calculateAverageMemory(past);
    
    const increase = ((recentAvg - pastAvg) / pastAvg) * 100;
    
    if (increase > threshold) {
      leaks.push(`Memory increased by ${increase.toFixed(2)}% over time`);
    }

    // リソースの増加をチェック
    const recentResources = recent[recent.length - 1].resources;
    const pastResources = past[0].resources;
    
    if (recentResources.geometries > pastResources.geometries * 1.5) {
      leaks.push(`Geometry count increased significantly: ${pastResources.geometries} -> ${recentResources.geometries}`);
    }
    
    if (recentResources.textures > pastResources.textures * 1.5) {
      leaks.push(`Texture count increased significantly: ${pastResources.textures} -> ${recentResources.textures}`);
    }

    return leaks;
  }

  /**
   * 平均メモリ使用量を計算
   */
  private calculateAverageMemory(snapshots: MemorySnapshot[]): number {
    if (snapshots.length === 0) return 0;
    
    const sum = snapshots.reduce((acc, snap) => acc + snap.memory.usedJSHeapSize, 0);
    return sum / snapshots.length;
  }

  /**
   * メモリ使用量の履歴を取得
   */
  public getMemoryHistory(): Array<{ timestamp: number; used: number; percentage: number }> {
    return this.snapshots.map(snap => ({
      timestamp: snap.timestamp,
      used: snap.memory.usedJSHeapSize,
      percentage: snap.memory.percentageUsed
    }));
  }

  /**
   * リソース使用量の履歴を取得
   */
  public getResourceHistory(): Array<{ timestamp: number; geometries: number; textures: number; programs: number }> {
    return this.snapshots.map(snap => ({
      timestamp: snap.timestamp,
      geometries: snap.resources.geometries,
      textures: snap.resources.textures,
      programs: snap.resources.programs
    }));
  }

  /**
   * メモリ最適化の推奨事項を生成
   */
  public generateOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const latest = this.snapshots[this.snapshots.length - 1];
    
    if (!latest) return recommendations;

    // メモリ使用率に基づく推奨
    if (latest.memory.percentageUsed > 70) {
      recommendations.push('Consider reducing texture resolution or using compressed textures');
      recommendations.push('Implement object pooling for frequently created/destroyed objects');
    }

    // リソース数に基づく推奨
    if (latest.resources.textures > 50) {
      recommendations.push('Too many textures loaded. Consider using texture atlases');
    }
    
    if (latest.resources.geometries > 100) {
      recommendations.push('Too many geometries. Consider using instanced rendering or merging geometries');
    }
    
    if (latest.resources.programs > 30) {
      recommendations.push('Too many shader programs. Consider sharing materials between objects');
    }

    // メモリリーク検出
    const leaks = this.detectMemoryLeaks();
    if (leaks.length > 0) {
      recommendations.push('Potential memory leak detected. Check for unreleased resources');
    }

    return recommendations;
  }

  /**
   * クリーンアップ
   */
  public cleanup(): void {
    this.stopMonitoring();
    this.snapshots = [];
    this.customMetrics.clear();
    this.renderer = null;
  }

  /**
   * メモリ統計のフォーマット済み文字列を取得
   */
  public getFormattedStats(): string {
    const stats = this.getMemoryStats();
    const resources = this.getResourceStats();
    
    if (!stats) {
      return 'Memory stats not available';
    }

    return `
Memory Usage:
  Heap Limit: ${this.formatBytes(stats.jsHeapSizeLimit)}
  Total Heap: ${this.formatBytes(stats.totalJSHeapSize)}
  Used Heap: ${this.formatBytes(stats.usedJSHeapSize)}
  Usage: ${stats.percentageUsed.toFixed(2)}%

Resources:
  Geometries: ${resources.geometries}
  Textures: ${resources.textures}
  Programs: ${resources.programs}
  Est. Size: ${this.formatBytes(resources.totalSize)}
    `.trim();
  }

  /**
   * バイト数を人間が読みやすい形式にフォーマット
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}