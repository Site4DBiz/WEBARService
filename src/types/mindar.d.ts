declare module 'mind-ar/dist/mindar-image-three.prod.js' {
  import * as THREE from 'three'

  export interface MindARThreeOptions {
    container: HTMLElement
    imageTargetSrc: string
    maxTrack?: number
    uiLoading?: string
    uiScanning?: string
    uiError?: string
    filterMinCF?: number
    filterBeta?: number
    warmupTolerance?: number
    missTolerance?: number
  }

  export class MindARThree {
    constructor(options: MindARThreeOptions)
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    cssRenderer: any
    cssScene: any
    start(): Promise<void>
    stop(): void
    addAnchor(targetIndex: number): Anchor
    switchCamera(facingMode: 'user' | 'environment'): void
  }

  export class Anchor {
    group: THREE.Group
    targetIndex: number
    onTargetFound?: () => void
    onTargetLost?: () => void
    css?: boolean
  }
}

declare module 'mind-ar/dist/mindar-face-three.prod.js' {
  import * as THREE from 'three'

  export interface MindARFaceThreeOptions {
    container: HTMLElement
    uiLoading?: string
    uiScanning?: string
    uiError?: string
  }

  export class MindARThree {
    constructor(options: MindARFaceThreeOptions)
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    start(): Promise<void>
    stop(): void
    addAnchor(index: number): Anchor
    switchCamera(facingMode: 'user' | 'environment'): void
  }

  export class Anchor {
    group: THREE.Group
    onTargetFound?: () => void
    onTargetLost?: () => void
  }
}

interface Window {
  MINDAR: {
    IMAGE: {
      MindARThree: any
    }
    FACE: {
      MindARThree: any
    }
  }
}
