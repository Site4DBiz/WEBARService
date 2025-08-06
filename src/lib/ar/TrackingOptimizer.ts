/**
 * TrackingOptimizer - トラッキング精度向上のための最適化
 *
 * 機能:
 * - リアルタイムトラッキング補正
 * - 予測アルゴリズムによる動き予測
 * - スムージング処理
 * - オクルージョン対応
 */

import * as THREE from 'three'

export interface TrackingState {
  position: THREE.Vector3
  rotation: THREE.Euler
  scale: THREE.Vector3
  confidence: number
  timestamp: number
  isVisible: boolean
}

export interface OptimizationConfig {
  enableSmoothing: boolean
  smoothingFactor: number
  enablePrediction: boolean
  predictionSteps: number
  enableOcclusionHandling: boolean
  occlusionTimeout: number
  enableJitterReduction: boolean
  jitterThreshold: number
}

export interface TrackingMetrics {
  stability: number
  accuracy: number
  latency: number
  lostFrames: number
  totalFrames: number
}

export class TrackingOptimizer {
  private history: TrackingState[]
  private config: OptimizationConfig
  private metrics: TrackingMetrics
  private kalmanFilter: KalmanFilter | null
  private lastValidState: TrackingState | null
  private occlusionTimer: number
  private frameCount: number

  constructor(config?: Partial<OptimizationConfig>) {
    this.history = []
    this.config = {
      enableSmoothing: true,
      smoothingFactor: 0.7,
      enablePrediction: true,
      predictionSteps: 3,
      enableOcclusionHandling: true,
      occlusionTimeout: 500,
      enableJitterReduction: true,
      jitterThreshold: 0.01,
      ...config,
    }

    this.metrics = {
      stability: 100,
      accuracy: 100,
      latency: 0,
      lostFrames: 0,
      totalFrames: 0,
    }

    this.kalmanFilter = null
    this.lastValidState = null
    this.occlusionTimer = 0
    this.frameCount = 0
  }

  /**
   * トラッキング状態の更新と最適化
   */
  updateTracking(currentState: TrackingState, anchor: any): TrackingState {
    this.frameCount++
    this.metrics.totalFrames++

    // Kalmanフィルタの初期化
    if (!this.kalmanFilter && this.config.enablePrediction) {
      this.kalmanFilter = new KalmanFilter()
    }

    let optimizedState = { ...currentState }

    // オクルージョン処理
    if (!currentState.isVisible && this.config.enableOcclusionHandling) {
      optimizedState = this.handleOcclusion(currentState)
    } else {
      this.occlusionTimer = 0

      // ジッター除去
      if (this.config.enableJitterReduction) {
        optimizedState = this.reduceJitter(optimizedState)
      }

      // スムージング処理
      if (this.config.enableSmoothing && this.history.length > 0) {
        optimizedState = this.applySmooothing(optimizedState)
      }

      // 予測処理
      if (this.config.enablePrediction && this.kalmanFilter) {
        optimizedState = this.applyPrediction(optimizedState)
      }

      this.lastValidState = optimizedState
    }

    // 履歴に追加
    this.addToHistory(optimizedState)

    // メトリクスの更新
    this.updateMetrics(currentState, optimizedState)

    // アンカーの更新
    if (anchor && anchor.group) {
      this.applyStateToAnchor(optimizedState, anchor)
    }

    return optimizedState
  }

  /**
   * オクルージョン処理
   */
  private handleOcclusion(currentState: TrackingState): TrackingState {
    this.occlusionTimer += 16.67 // 約60FPSを想定

    if (this.occlusionTimer > this.config.occlusionTimeout) {
      this.metrics.lostFrames++
      return currentState
    }

    // 最後の有効な状態を使用
    if (this.lastValidState) {
      // 予測による位置更新
      if (this.config.enablePrediction && this.history.length >= 2) {
        const predictedPosition = this.predictPosition()
        return {
          ...this.lastValidState,
          position: predictedPosition,
          confidence: Math.max(0, this.lastValidState.confidence - 0.1),
          timestamp: currentState.timestamp,
          isVisible: false,
        }
      }

      return {
        ...this.lastValidState,
        confidence: Math.max(0, this.lastValidState.confidence - 0.05),
        timestamp: currentState.timestamp,
        isVisible: false,
      }
    }

    this.metrics.lostFrames++
    return currentState
  }

  /**
   * ジッター除去
   */
  private reduceJitter(state: TrackingState): TrackingState {
    if (this.history.length === 0) return state

    const lastState = this.history[this.history.length - 1]
    const positionDiff = state.position.distanceTo(lastState.position)

    // 小さな動きはジッターとして除去
    if (positionDiff < this.config.jitterThreshold) {
      return {
        ...state,
        position: lastState.position.clone(),
        rotation: this.lerpRotation(lastState.rotation, state.rotation, 0.3),
      }
    }

    return state
  }

  /**
   * スムージング処理
   */
  private applySmooothing(state: TrackingState): TrackingState {
    if (this.history.length === 0) return state

    const factor = this.config.smoothingFactor
    const lastState = this.history[this.history.length - 1]

    return {
      ...state,
      position: this.lerpVector3(lastState.position, state.position, 1 - factor),
      rotation: this.lerpRotation(lastState.rotation, state.rotation, 1 - factor),
      scale: this.lerpVector3(lastState.scale, state.scale, 1 - factor),
    }
  }

  /**
   * 予測処理
   */
  private applyPrediction(state: TrackingState): TrackingState {
    if (!this.kalmanFilter || this.history.length < 2) return state

    // Kalmanフィルタで位置を予測
    const predicted = this.kalmanFilter.predict(
      state.position.x,
      state.position.y,
      state.position.z
    )

    // 更新
    const corrected = this.kalmanFilter.update(state.position.x, state.position.y, state.position.z)

    return {
      ...state,
      position: new THREE.Vector3(corrected.x, corrected.y, corrected.z),
    }
  }

  /**
   * 位置予測
   */
  private predictPosition(): THREE.Vector3 {
    if (this.history.length < 2) {
      return this.lastValidState?.position || new THREE.Vector3()
    }

    const steps = Math.min(this.config.predictionSteps, this.history.length - 1)
    const recentHistory = this.history.slice(-steps - 1)

    // 線形予測
    const velocities: THREE.Vector3[] = []
    for (let i = 1; i < recentHistory.length; i++) {
      const dt = (recentHistory[i].timestamp - recentHistory[i - 1].timestamp) / 1000
      if (dt > 0) {
        const velocity = recentHistory[i].position
          .clone()
          .sub(recentHistory[i - 1].position)
          .divideScalar(dt)
        velocities.push(velocity)
      }
    }

    if (velocities.length === 0) {
      return this.lastValidState?.position || new THREE.Vector3()
    }

    // 平均速度を計算
    const avgVelocity = velocities
      .reduce((acc, v) => acc.add(v), new THREE.Vector3())
      .divideScalar(velocities.length)

    // 予測位置を計算
    const lastState = this.history[this.history.length - 1]
    const dt = 0.016 // 約60FPS

    return lastState.position.clone().add(avgVelocity.multiplyScalar(dt))
  }

  /**
   * アンカーへの状態適用
   */
  private applyStateToAnchor(state: TrackingState, anchor: any): void {
    if (!anchor.group) return

    anchor.group.position.copy(state.position)
    anchor.group.rotation.copy(state.rotation)
    anchor.group.scale.copy(state.scale)
  }

  /**
   * 履歴に追加
   */
  private addToHistory(state: TrackingState): void {
    this.history.push(state)

    // 最大100フレーム分の履歴を保持
    if (this.history.length > 100) {
      this.history.shift()
    }
  }

  /**
   * メトリクスの更新
   */
  private updateMetrics(original: TrackingState, optimized: TrackingState): void {
    // 安定性の計算
    if (this.history.length >= 2) {
      const lastState = this.history[this.history.length - 2]
      const movement = optimized.position.distanceTo(lastState.position)
      const expectedMovement = original.position.distanceTo(lastState.position)

      const stabilityScore =
        expectedMovement > 0
          ? Math.min(100, (1 - Math.abs(movement - expectedMovement) / expectedMovement) * 100)
          : 100

      this.metrics.stability = this.metrics.stability * 0.9 + stabilityScore * 0.1
    }

    // 精度の計算
    this.metrics.accuracy = optimized.confidence * 100

    // レイテンシの計算
    const processingTime = Date.now() - original.timestamp
    this.metrics.latency = this.metrics.latency * 0.9 + processingTime * 0.1
  }

  /**
   * Vector3の線形補間
   */
  private lerpVector3(a: THREE.Vector3, b: THREE.Vector3, t: number): THREE.Vector3 {
    return new THREE.Vector3(
      THREE.MathUtils.lerp(a.x, b.x, t),
      THREE.MathUtils.lerp(a.y, b.y, t),
      THREE.MathUtils.lerp(a.z, b.z, t)
    )
  }

  /**
   * Eulerの線形補間
   */
  private lerpRotation(a: THREE.Euler, b: THREE.Euler, t: number): THREE.Euler {
    const qa = new THREE.Quaternion().setFromEuler(a)
    const qb = new THREE.Quaternion().setFromEuler(b)
    const qr = new THREE.Quaternion().slerpQuaternions(qa, qb, t)
    return new THREE.Euler().setFromQuaternion(qr)
  }

  /**
   * 設定の更新
   */
  updateConfig(config: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * メトリクスの取得
   */
  getMetrics(): TrackingMetrics {
    return { ...this.metrics }
  }

  /**
   * 履歴の取得
   */
  getHistory(): TrackingState[] {
    return [...this.history]
  }

  /**
   * リセット
   */
  reset(): void {
    this.history = []
    this.lastValidState = null
    this.occlusionTimer = 0
    this.frameCount = 0
    this.metrics = {
      stability: 100,
      accuracy: 100,
      latency: 0,
      lostFrames: 0,
      totalFrames: 0,
    }

    if (this.kalmanFilter) {
      this.kalmanFilter.reset()
    }
  }

  /**
   * リソースのクリーンアップ
   */
  dispose(): void {
    this.history = []
    this.lastValidState = null
    this.kalmanFilter = null
  }
}

/**
 * Kalmanフィルタの実装
 */
class KalmanFilter {
  private x: number[]
  private P: number[][]
  private F: number[][]
  private H: number[][]
  private R: number[][]
  private Q: number[][]

  constructor() {
    // 状態ベクトル [x, y, z, vx, vy, vz]
    this.x = [0, 0, 0, 0, 0, 0]

    // 誤差共分散行列
    this.P = this.createMatrix(6, 6, 1000)

    // 状態遷移行列
    this.F = [
      [1, 0, 0, 0.016, 0, 0],
      [0, 1, 0, 0, 0.016, 0],
      [0, 0, 1, 0, 0, 0.016],
      [0, 0, 0, 1, 0, 0],
      [0, 0, 0, 0, 1, 0],
      [0, 0, 0, 0, 0, 1],
    ]

    // 観測行列
    this.H = [
      [1, 0, 0, 0, 0, 0],
      [0, 1, 0, 0, 0, 0],
      [0, 0, 1, 0, 0, 0],
    ]

    // 観測ノイズ共分散
    this.R = this.createMatrix(3, 3, 0.1)

    // プロセスノイズ共分散
    this.Q = this.createMatrix(6, 6, 0.01)
  }

  predict(x: number, y: number, z: number): { x: number; y: number; z: number } {
    // 予測ステップ
    const xPred = this.matrixMultiplyVector(this.F, this.x)
    const PPred = this.matrixAdd(
      this.matrixMultiply(this.matrixMultiply(this.F, this.P), this.matrixTranspose(this.F)),
      this.Q
    )

    this.x = xPred
    this.P = PPred

    return {
      x: this.x[0],
      y: this.x[1],
      z: this.x[2],
    }
  }

  update(x: number, y: number, z: number): { x: number; y: number; z: number } {
    // 観測値
    const zMeasure = [x, y, z]

    // イノベーション
    const innovation = this.vectorSubtract(zMeasure, this.matrixMultiplyVector(this.H, this.x))

    // イノベーション共分散
    const S = this.matrixAdd(
      this.matrixMultiply(this.matrixMultiply(this.H, this.P), this.matrixTranspose(this.H)),
      this.R
    )

    // カルマンゲイン
    const K = this.matrixMultiply(
      this.matrixMultiply(this.P, this.matrixTranspose(this.H)),
      this.matrixInverse(S)
    )

    // 状態更新
    this.x = this.vectorAdd(this.x, this.matrixMultiplyVector(K, innovation))

    // 誤差共分散更新
    const I = this.createIdentityMatrix(6)
    const IKH = this.matrixSubtract(I, this.matrixMultiply(K, this.H))
    this.P = this.matrixMultiply(IKH, this.P)

    return {
      x: this.x[0],
      y: this.x[1],
      z: this.x[2],
    }
  }

  reset(): void {
    this.x = [0, 0, 0, 0, 0, 0]
    this.P = this.createMatrix(6, 6, 1000)
  }

  // 行列演算ヘルパー関数
  private createMatrix(rows: number, cols: number, value: number): number[][] {
    return Array(rows)
      .fill(0)
      .map(() => Array(cols).fill(value))
  }

  private createIdentityMatrix(size: number): number[][] {
    const m = this.createMatrix(size, size, 0)
    for (let i = 0; i < size; i++) {
      m[i][i] = 1
    }
    return m
  }

  private matrixMultiply(a: number[][], b: number[][]): number[][] {
    const result = this.createMatrix(a.length, b[0].length, 0)
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < b[0].length; j++) {
        for (let k = 0; k < a[0].length; k++) {
          result[i][j] += a[i][k] * b[k][j]
        }
      }
    }
    return result
  }

  private matrixMultiplyVector(m: number[][], v: number[]): number[] {
    return m.map((row) => row.reduce((sum, val, i) => sum + val * v[i], 0))
  }

  private matrixTranspose(m: number[][]): number[][] {
    return m[0].map((_, i) => m.map((row) => row[i]))
  }

  private matrixAdd(a: number[][], b: number[][]): number[][] {
    return a.map((row, i) => row.map((val, j) => val + b[i][j]))
  }

  private matrixSubtract(a: number[][], b: number[][]): number[][] {
    return a.map((row, i) => row.map((val, j) => val - b[i][j]))
  }

  private matrixInverse(m: number[][]): number[][] {
    // 簡易的な3x3行列の逆行列計算
    if (m.length === 3) {
      const det = this.determinant3x3(m)
      if (Math.abs(det) < 0.0001) {
        return this.createIdentityMatrix(3)
      }

      const adj = this.adjugate3x3(m)
      return adj.map((row) => row.map((val) => val / det))
    }

    return this.createIdentityMatrix(m.length)
  }

  private determinant3x3(m: number[][]): number {
    return (
      m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
      m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
      m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
    )
  }

  private adjugate3x3(m: number[][]): number[][] {
    return [
      [
        m[1][1] * m[2][2] - m[1][2] * m[2][1],
        -(m[0][1] * m[2][2] - m[0][2] * m[2][1]),
        m[0][1] * m[1][2] - m[0][2] * m[1][1],
      ],
      [
        -(m[1][0] * m[2][2] - m[1][2] * m[2][0]),
        m[0][0] * m[2][2] - m[0][2] * m[2][0],
        -(m[0][0] * m[1][2] - m[0][2] * m[1][0]),
      ],
      [
        m[1][0] * m[2][1] - m[1][1] * m[2][0],
        -(m[0][0] * m[2][1] - m[0][1] * m[2][0]),
        m[0][0] * m[1][1] - m[0][1] * m[1][0],
      ],
    ]
  }

  private vectorAdd(a: number[], b: number[]): number[] {
    return a.map((val, i) => val + b[i])
  }

  private vectorSubtract(a: number[], b: number[]): number[] {
    return a.map((val, i) => val - b[i])
  }
}
