declare namespace AFrame {
  interface Entity extends HTMLElement {
    object3D: THREE.Object3D;
    components: any;
    setAttribute(name: string, value: any): void;
    getAttribute(name: string): any;
    addEventListener(type: string, listener: EventListener): void;
    removeEventListener(type: string, listener: EventListener): void;
    emit(name: string, detail?: any): void;
  }

  interface Scene extends Entity {
    camera: Entity;
    renderer: THREE.WebGLRenderer;
    systems: any;
  }

  interface Component {
    el: Entity;
    data: any;
    schema: any;
    init?(): void;
    update?(oldData: any): void;
    remove?(): void;
    tick?(time: number, deltaTime: number): void;
    play?(): void;
    pause?(): void;
  }

  interface System {
    el: Scene;
    data: any;
    schema: any;
    init?(): void;
    tick?(time: number, deltaTime: number): void;
    play?(): void;
    pause?(): void;
  }

  interface Utils {
    device: {
      checkHeadsetConnected(): boolean;
      isMobile(): boolean;
      isTablet(): boolean;
      isIOS(): boolean;
      isGearVR(): boolean;
      isOculusGo(): boolean;
      isR7(): boolean;
    };
    coordinates: {
      isCoordinates(value: string): boolean;
      parse(value: string): { x: number; y: number; z: number };
      stringify(coords: { x: number; y: number; z: number }): string;
    };
  }

  interface RegisterComponentOptions {
    schema?: any;
    init?(): void;
    update?(oldData?: any): void;
    remove?(): void;
    tick?(time: number, deltaTime: number): void;
    play?(): void;
    pause?(): void;
    multiple?: boolean;
  }

  interface RegisterSystemOptions {
    schema?: any;
    init?(): void;
    tick?(time: number, deltaTime: number): void;
    play?(): void;
    pause?(): void;
  }

  interface RegisterPrimitiveOptions {
    defaultComponents?: any;
    mappings?: any;
  }
}

declare global {
  const AFRAME: {
    registerComponent(name: string, component: AFrame.RegisterComponentOptions): void;
    registerSystem(name: string, system: AFrame.RegisterSystemOptions): void;
    registerPrimitive(name: string, primitive: AFrame.RegisterPrimitiveOptions): void;
    registerShader(name: string, shader: any): void;
    registerGeometry(name: string, geometry: any): void;
    utils: AFrame.Utils;
    scenes: AFrame.Scene[];
    version: string;
    THREE: typeof THREE;
  };

  interface HTMLElementTagNameMap {
    'a-scene': AFrame.Scene;
    'a-entity': AFrame.Entity;
    'a-camera': AFrame.Entity;
    'a-box': AFrame.Entity;
    'a-sphere': AFrame.Entity;
    'a-cylinder': AFrame.Entity;
    'a-plane': AFrame.Entity;
    'a-sky': AFrame.Entity;
    'a-light': AFrame.Entity;
    'a-text': AFrame.Entity;
    'a-gltf-model': AFrame.Entity;
    'a-obj-model': AFrame.Entity;
    'a-image': AFrame.Entity;
    'a-video': AFrame.Entity;
    'a-videosphere': AFrame.Entity;
    'a-sound': AFrame.Entity;
    'a-cursor': AFrame.Entity;
    'a-animation': AFrame.Entity;
  }
}

export {};