'use client'

import * as THREE from 'three'
import { TextureManager, TextureSet } from './texture-manager'

export type MaterialType =
  | 'standard'
  | 'physical'
  | 'phong'
  | 'lambert'
  | 'basic'
  | 'toon'
  | 'matcap'

export interface MaterialProperties {
  type?: MaterialType
  color?: string | number
  emissive?: string | number
  emissiveIntensity?: number
  metalness?: number
  roughness?: number
  opacity?: number
  transparent?: boolean
  wireframe?: boolean
  side?: THREE.Side
  flatShading?: boolean
  vertexColors?: boolean
  fog?: boolean

  // PBR properties
  clearcoat?: number
  clearcoatRoughness?: number
  ior?: number
  reflectivity?: number
  sheen?: number
  sheenColor?: string | number
  sheenRoughness?: number
  transmission?: number
  thickness?: number
  attenuationDistance?: number
  attenuationColor?: string | number
  specularIntensity?: number
  specularColor?: string | number

  // Toon properties
  gradientMap?: THREE.Texture

  // Environment
  envMapIntensity?: number

  // Displacement
  displacementScale?: number
  displacementBias?: number

  // Normal map
  normalScale?: [number, number]

  // AO map
  aoMapIntensity?: number

  // Light map
  lightMapIntensity?: number

  // Emissive map
  emissiveMap?: THREE.Texture
}

export interface MaterialPreset {
  id: string
  name: string
  description?: string
  properties: MaterialProperties
  textureConfigs?: Array<{
    type: string
    url: string
  }>
  thumbnail?: string
}

export class MaterialManager {
  private materials: Map<string, THREE.Material> = new Map()
  private presets: Map<string, MaterialPreset> = new Map()
  private textureManager: TextureManager

  constructor(textureManager: TextureManager) {
    this.textureManager = textureManager
    this.initializeDefaultPresets()
  }

  private initializeDefaultPresets() {
    const defaultPresets: MaterialPreset[] = [
      {
        id: 'metal-polished',
        name: 'Polished Metal',
        description: '光沢のある金属マテリアル',
        properties: {
          type: 'physical',
          color: 0xaaaaaa,
          metalness: 1.0,
          roughness: 0.1,
          envMapIntensity: 1.0,
        },
      },
      {
        id: 'metal-brushed',
        name: 'Brushed Metal',
        description: 'ブラッシュド仕上げの金属',
        properties: {
          type: 'physical',
          color: 0x888888,
          metalness: 1.0,
          roughness: 0.4,
          envMapIntensity: 0.8,
        },
      },
      {
        id: 'plastic-glossy',
        name: 'Glossy Plastic',
        description: '光沢のあるプラスチック',
        properties: {
          type: 'physical',
          color: 0xff0000,
          metalness: 0.0,
          roughness: 0.2,
          clearcoat: 1.0,
          clearcoatRoughness: 0.1,
        },
      },
      {
        id: 'plastic-matte',
        name: 'Matte Plastic',
        description: 'マットなプラスチック',
        properties: {
          type: 'physical',
          color: 0x0066cc,
          metalness: 0.0,
          roughness: 0.8,
        },
      },
      {
        id: 'glass',
        name: 'Glass',
        description: '透明なガラス',
        properties: {
          type: 'physical',
          color: 0xffffff,
          metalness: 0.0,
          roughness: 0.0,
          transmission: 1.0,
          thickness: 0.5,
          ior: 1.5,
          transparent: true,
          opacity: 0.1,
        },
      },
      {
        id: 'glass-frosted',
        name: 'Frosted Glass',
        description: 'すりガラス',
        properties: {
          type: 'physical',
          color: 0xffffff,
          metalness: 0.0,
          roughness: 0.5,
          transmission: 0.9,
          thickness: 0.5,
          ior: 1.5,
          transparent: true,
          opacity: 0.3,
        },
      },
      {
        id: 'wood-polished',
        name: 'Polished Wood',
        description: '磨かれた木材',
        properties: {
          type: 'physical',
          color: 0x8b4513,
          metalness: 0.0,
          roughness: 0.3,
          clearcoat: 0.5,
          clearcoatRoughness: 0.2,
        },
      },
      {
        id: 'fabric',
        name: 'Fabric',
        description: '布地マテリアル',
        properties: {
          type: 'physical',
          color: 0x333333,
          metalness: 0.0,
          roughness: 0.9,
          sheen: 1.0,
          sheenRoughness: 0.5,
          sheenColor: 0x222222,
        },
      },
      {
        id: 'ceramic',
        name: 'Ceramic',
        description: 'セラミック',
        properties: {
          type: 'physical',
          color: 0xffffff,
          metalness: 0.0,
          roughness: 0.1,
          clearcoat: 0.8,
          clearcoatRoughness: 0.05,
        },
      },
      {
        id: 'rubber',
        name: 'Rubber',
        description: 'ゴム素材',
        properties: {
          type: 'physical',
          color: 0x111111,
          metalness: 0.0,
          roughness: 0.95,
        },
      },
      {
        id: 'emission',
        name: 'Emissive',
        description: '発光マテリアル',
        properties: {
          type: 'standard',
          color: 0xffffff,
          emissive: 0x00ff00,
          emissiveIntensity: 1.0,
        },
      },
      {
        id: 'holographic',
        name: 'Holographic',
        description: 'ホログラフィック効果',
        properties: {
          type: 'physical',
          color: 0xffffff,
          metalness: 0.8,
          roughness: 0.2,
          ior: 2.333,
          clearcoat: 1.0,
          clearcoatRoughness: 0.0,
        },
      },
    ]

    defaultPresets.forEach((preset) => {
      this.presets.set(preset.id, preset)
    })
  }

  createMaterial(properties: MaterialProperties, textureSet?: TextureSet): THREE.Material {
    const type = properties.type || 'standard'
    let material: THREE.Material

    switch (type) {
      case 'physical':
        material = this.createPhysicalMaterial(properties, textureSet)
        break
      case 'standard':
        material = this.createStandardMaterial(properties, textureSet)
        break
      case 'phong':
        material = this.createPhongMaterial(properties, textureSet)
        break
      case 'lambert':
        material = this.createLambertMaterial(properties, textureSet)
        break
      case 'basic':
        material = this.createBasicMaterial(properties, textureSet)
        break
      case 'toon':
        material = this.createToonMaterial(properties, textureSet)
        break
      case 'matcap':
        material = this.createMatcapMaterial(properties, textureSet)
        break
      default:
        material = this.createStandardMaterial(properties, textureSet)
    }

    // 共通プロパティの適用
    this.applyCommonProperties(material, properties)

    return material
  }

  private createPhysicalMaterial(
    properties: MaterialProperties,
    textureSet?: TextureSet
  ): THREE.MeshPhysicalMaterial {
    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(properties.color || 0xffffff),
      metalness: properties.metalness ?? 0.5,
      roughness: properties.roughness ?? 0.5,
      clearcoat: properties.clearcoat ?? 0,
      clearcoatRoughness: properties.clearcoatRoughness ?? 0,
      ior: properties.ior ?? 1.5,
      reflectivity: properties.reflectivity ?? 0.5,
      sheen: properties.sheen ?? 0,
      sheenRoughness: properties.sheenRoughness ?? 0.5,
      sheenColor: new THREE.Color(properties.sheenColor || 0x000000),
      transmission: properties.transmission ?? 0,
      thickness: properties.thickness ?? 0,
      attenuationDistance: properties.attenuationDistance ?? Infinity,
      attenuationColor: new THREE.Color(properties.attenuationColor || 0xffffff),
      specularIntensity: properties.specularIntensity ?? 1,
      specularColor: new THREE.Color(properties.specularColor || 0xffffff),
    })

    if (properties.emissive) {
      material.emissive = new THREE.Color(properties.emissive)
      material.emissiveIntensity = properties.emissiveIntensity ?? 1
    }

    this.applyTextures(material, textureSet)
    return material
  }

  private createStandardMaterial(
    properties: MaterialProperties,
    textureSet?: TextureSet
  ): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(properties.color || 0xffffff),
      metalness: properties.metalness ?? 0.5,
      roughness: properties.roughness ?? 0.5,
    })

    if (properties.emissive) {
      material.emissive = new THREE.Color(properties.emissive)
      material.emissiveIntensity = properties.emissiveIntensity ?? 1
    }

    this.applyTextures(material, textureSet)
    return material
  }

  private createPhongMaterial(
    properties: MaterialProperties,
    textureSet?: TextureSet
  ): THREE.MeshPhongMaterial {
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color(properties.color || 0xffffff),
      specular: new THREE.Color(0x111111),
      shininess: 100,
    })

    if (properties.emissive) {
      material.emissive = new THREE.Color(properties.emissive)
    }

    this.applyTextures(material, textureSet)
    return material
  }

  private createLambertMaterial(
    properties: MaterialProperties,
    textureSet?: TextureSet
  ): THREE.MeshLambertMaterial {
    const material = new THREE.MeshLambertMaterial({
      color: new THREE.Color(properties.color || 0xffffff),
    })

    if (properties.emissive) {
      material.emissive = new THREE.Color(properties.emissive)
    }

    this.applyTextures(material, textureSet)
    return material
  }

  private createBasicMaterial(
    properties: MaterialProperties,
    textureSet?: TextureSet
  ): THREE.MeshBasicMaterial {
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(properties.color || 0xffffff),
    })

    if (textureSet?.diffuse) {
      material.map = textureSet.diffuse
    }

    return material
  }

  private createToonMaterial(
    properties: MaterialProperties,
    textureSet?: TextureSet
  ): THREE.MeshToonMaterial {
    const material = new THREE.MeshToonMaterial({
      color: new THREE.Color(properties.color || 0xffffff),
      gradientMap: properties.gradientMap,
    })

    this.applyTextures(material, textureSet)
    return material
  }

  private createMatcapMaterial(
    properties: MaterialProperties,
    textureSet?: TextureSet
  ): THREE.MeshMatcapMaterial {
    const material = new THREE.MeshMatcapMaterial({
      color: new THREE.Color(properties.color || 0xffffff),
    })

    if (textureSet?.diffuse) {
      material.matcap = textureSet.diffuse
    }

    return material
  }

  private applyTextures(material: any, textureSet?: TextureSet) {
    if (!textureSet) return

    // Diffuse/Color map
    if (textureSet.diffuse && 'map' in material) {
      material.map = textureSet.diffuse
    }

    // Normal map
    if (textureSet.normal && 'normalMap' in material) {
      material.normalMap = textureSet.normal
      material.normalScale = new THREE.Vector2(1, 1)
    }

    // Roughness map
    if (textureSet.roughness && 'roughnessMap' in material) {
      material.roughnessMap = textureSet.roughness
    }

    // Metalness map
    if (textureSet.metalness && 'metalnessMap' in material) {
      material.metalnessMap = textureSet.metalness
    }

    // Emissive map
    if (textureSet.emissive && 'emissiveMap' in material) {
      material.emissiveMap = textureSet.emissive
    }

    // AO map
    if (textureSet.ao && 'aoMap' in material) {
      material.aoMap = textureSet.ao
      material.aoMapIntensity = 1
    }

    // Displacement map
    if (textureSet.displacement && 'displacementMap' in material) {
      material.displacementMap = textureSet.displacement
      material.displacementScale = 0.1
      material.displacementBias = 0
    }

    // Alpha map
    if (textureSet.alpha && 'alphaMap' in material) {
      material.alphaMap = textureSet.alpha
      material.transparent = true
    }

    material.needsUpdate = true
  }

  private applyCommonProperties(material: THREE.Material, properties: MaterialProperties) {
    if (properties.opacity !== undefined) {
      material.opacity = properties.opacity
    }

    if (properties.transparent !== undefined) {
      material.transparent = properties.transparent
    }

    if (properties.side !== undefined) {
      material.side = properties.side
    }

    if (properties.vertexColors !== undefined) {
      material.vertexColors = properties.vertexColors
    }

    if (properties.fog !== undefined) {
      material.fog = properties.fog
    }

    // ワイヤーフレーム設定
    if ('wireframe' in material && properties.wireframe !== undefined) {
      ;(material as any).wireframe = properties.wireframe
    }

    // フラットシェーディング設定
    if ('flatShading' in material && properties.flatShading !== undefined) {
      ;(material as any).flatShading = properties.flatShading
    }

    material.needsUpdate = true
  }

  // プリセットからマテリアル作成
  async createFromPreset(presetId: string, textureSet?: TextureSet): Promise<THREE.Material> {
    const preset = this.presets.get(presetId)
    if (!preset) {
      throw new Error(`Preset ${presetId} not found`)
    }

    return this.createMaterial(preset.properties, textureSet)
  }

  // プリセット管理
  addPreset(preset: MaterialPreset) {
    this.presets.set(preset.id, preset)
  }

  removePreset(presetId: string) {
    this.presets.delete(presetId)
  }

  getPreset(presetId: string): MaterialPreset | undefined {
    return this.presets.get(presetId)
  }

  getAllPresets(): MaterialPreset[] {
    return Array.from(this.presets.values())
  }

  // マテリアルキャッシュ管理
  cacheMaterial(id: string, material: THREE.Material) {
    this.materials.set(id, material)
  }

  getCachedMaterial(id: string): THREE.Material | undefined {
    return this.materials.get(id)
  }

  // マテリアルのクローン
  cloneMaterial(material: THREE.Material): THREE.Material {
    return material.clone()
  }

  // マテリアルの更新
  updateMaterial(material: THREE.Material, properties: Partial<MaterialProperties>) {
    Object.assign(material, properties)
    material.needsUpdate = true
  }

  // クリーンアップ
  disposeMaterial(material: THREE.Material) {
    material.dispose()

    // キャッシュから削除
    for (const [key, cachedMaterial] of this.materials.entries()) {
      if (cachedMaterial === material) {
        this.materials.delete(key)
        break
      }
    }
  }

  dispose() {
    for (const material of this.materials.values()) {
      material.dispose()
    }
    this.materials.clear()
    this.presets.clear()
  }
}

// マテリアルプレビュー生成
export class MaterialPreviewGenerator {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private mesh: THREE.Mesh

  constructor(size = 256) {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.renderer.setSize(size, size)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.scene = new THREE.Scene()
    this.scene.background = null

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
    this.camera.position.set(0, 0, 3)
    this.camera.lookAt(0, 0, 0)

    // ライティング設定
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    this.scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
    directionalLight.position.set(5, 5, 5)
    this.scene.add(directionalLight)

    // プレビュー用のジオメトリ（球）
    const geometry = new THREE.SphereGeometry(1, 32, 32)
    this.mesh = new THREE.Mesh(geometry)
    this.scene.add(this.mesh)
  }

  generatePreview(material: THREE.Material): string {
    this.mesh.material = material
    this.renderer.render(this.scene, this.camera)
    return this.renderer.domElement.toDataURL('image/png')
  }

  setGeometry(type: 'sphere' | 'cube' | 'torus' | 'cylinder' = 'sphere') {
    this.scene.remove(this.mesh)

    let geometry: THREE.BufferGeometry
    switch (type) {
      case 'cube':
        geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5)
        break
      case 'torus':
        geometry = new THREE.TorusGeometry(0.8, 0.3, 16, 100)
        break
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(0.7, 0.7, 1.5, 32)
        break
      default:
        geometry = new THREE.SphereGeometry(1, 32, 32)
    }

    this.mesh = new THREE.Mesh(geometry, this.mesh.material)
    this.scene.add(this.mesh)
  }

  dispose() {
    this.renderer.dispose()
    this.mesh.geometry.dispose()
  }
}
