declare module 'mindar-image' {
  export interface MindARImageOptions {
    container: HTMLElement;
    imageTargetSrc: string;
    uiLoading?: string;
    uiScanning?: string;
    uiError?: string;
    maxTrack?: number;
    showStats?: boolean;
    filterMinCF?: number;
    filterBeta?: number;
    warmupTolerance?: number;
    missTolerance?: number;
    onTargetFound?: (index: number) => void;
    onTargetLost?: (index: number) => void;
  }

  export class MindARImage {
    constructor(options: MindARImageOptions);
    start(): Promise<void>;
    stop(): void;
    addAnchor(targetIndex: number): Anchor;
    switchCamera(): void;
  }

  export interface Anchor {
    group: any;
    targetIndex: number;
    onTargetFound: (callback: () => void) => void;
    onTargetLost: (callback: () => void) => void;
  }
}

declare module 'mindar-face' {
  export interface MindARFaceOptions {
    container: HTMLElement;
    uiLoading?: string;
    uiScanning?: string;
    uiError?: string;
    showStats?: boolean;
    onFaceFound?: () => void;
    onFaceLost?: () => void;
  }

  export class MindARFace {
    constructor(options: MindARFaceOptions);
    start(): Promise<void>;
    stop(): void;
    addAnchor(index: number): FaceAnchor;
    switchCamera(): void;
  }

  export interface FaceAnchor {
    group: any;
    onFaceFound: (callback: () => void) => void;
    onFaceLost: (callback: () => void) => void;
  }
}

declare global {
  interface Window {
    MINDAR: {
      IMAGE: {
        MindARImage: any;
      };
      FACE: {
        MindARFace: any;
      };
    };
  }
}

export {};