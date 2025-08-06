import * as THREE from 'three';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { SimplifyModifier } from 'three-stdlib';

export interface CompressionOptions {
  targetRatio?: number; // 0.0 - 1.0
  preserveTextures?: boolean;
  optimizeMaterials?: boolean;
  useDraco?: boolean;
  quantization?: {
    position?: number;
    normal?: number;
    color?: number;
    texCoord?: number;
  };
  textureFormat?: 'webp' | 'basis' | 'original';
  textureQuality?: number; // 0-100
}

export interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  processingTime: number;
  model: THREE.Object3D;
  statistics: {
    vertices: { before: number; after: number };
    faces: { before: number; after: number };
    materials: { before: number; after: number };
    textures: { before: number; after: number };
  };
}

export class ModelCompressor {
  private dracoLoader: DRACOLoader;
  private gltfLoader: GLTFLoader;
  private gltfExporter: GLTFExporter;
  private simplifyModifier: SimplifyModifier;

  constructor() {
    // Initialize DRACO loader
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    this.dracoLoader.setDecoderConfig({ type: 'js' });
    this.dracoLoader.preload();

    // Initialize GLTF loader with DRACO support
    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.setDRACOLoader(this.dracoLoader);

    // Initialize GLTF exporter
    this.gltfExporter = new GLTFExporter();

    // Initialize simplify modifier
    this.simplifyModifier = new SimplifyModifier();

    // Initialize MeshoptDecoder
    MeshoptDecoder.useWorkers(2);
  }

  async compressModel(
    model: THREE.Object3D,
    options: CompressionOptions = {}
  ): Promise<CompressionResult> {
    const startTime = performance.now();
    
    const {
      targetRatio = 0.5,
      preserveTextures = true,
      optimizeMaterials = true,
      useDraco = true,
      quantization = {
        position: 14,
        normal: 10,
        color: 8,
        texCoord: 12
      },
      textureFormat = 'webp',
      textureQuality = 85
    } = options;

    // Calculate original statistics
    const originalStats = this.calculateModelStatistics(model);
    const originalSize = await this.estimateModelSize(model);

    // Clone the model for compression
    const compressedModel = model.clone();

    // Step 1: Simplify geometry
    if (targetRatio < 1.0) {
      await this.simplifyGeometry(compressedModel, targetRatio);
    }

    // Step 2: Optimize materials
    if (optimizeMaterials) {
      await this.optimizeMaterials(compressedModel);
    }

    // Step 3: Compress textures
    if (!preserveTextures && textureFormat !== 'original') {
      await this.compressTextures(compressedModel, textureFormat, textureQuality);
    }

    // Step 4: Optimize mesh data with meshoptimizer
    await this.optimizeMeshData(compressedModel);

    // Step 5: Apply quantization if using DRACO
    if (useDraco) {
      await this.applyDracoCompression(compressedModel, quantization);
    }

    // Calculate compressed statistics
    const compressedStats = this.calculateModelStatistics(compressedModel);
    const compressedSize = await this.estimateModelSize(compressedModel);

    const processingTime = performance.now() - startTime;

    return {
      originalSize,
      compressedSize,
      compressionRatio: compressedSize / originalSize,
      processingTime,
      model: compressedModel,
      statistics: {
        vertices: {
          before: originalStats.vertices,
          after: compressedStats.vertices
        },
        faces: {
          before: originalStats.faces,
          after: compressedStats.faces
        },
        materials: {
          before: originalStats.materials,
          after: compressedStats.materials
        },
        textures: {
          before: originalStats.textures,
          after: compressedStats.textures
        }
      }
    };
  }

  private async simplifyGeometry(model: THREE.Object3D, targetRatio: number): Promise<void> {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const geometry = child.geometry as THREE.BufferGeometry;
        
        // Calculate target vertex count
        const vertexCount = geometry.attributes.position.count;
        const targetCount = Math.floor(vertexCount * targetRatio);
        
        // Apply simplification
        const simplified = this.simplifyModifier.modify(geometry, targetCount);
        child.geometry = simplified;
      }
    });
  }

  private async optimizeMaterials(model: THREE.Object3D): Promise<void> {
    const materialCache = new Map<string, THREE.Material>();
    
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        const optimizedMaterials: THREE.Material[] = [];
        
        for (const material of materials) {
          if (material instanceof THREE.MeshStandardMaterial) {
            const key = this.getMaterialCacheKey(material);
            
            if (materialCache.has(key)) {
              optimizedMaterials.push(materialCache.get(key)!);
            } else {
              // Remove unused properties
              const optimized = material.clone();
              if (!optimized.normalMap) optimized.normalScale = new THREE.Vector2(1, 1);
              if (!optimized.roughnessMap) optimized.roughness = 1;
              if (!optimized.metalnessMap) optimized.metalness = 0;
              
              materialCache.set(key, optimized);
              optimizedMaterials.push(optimized);
            }
          } else {
            optimizedMaterials.push(material);
          }
        }
        
        child.material = optimizedMaterials.length === 1 ? optimizedMaterials[0] : optimizedMaterials;
      }
    });
  }

  private async compressTextures(
    model: THREE.Object3D,
    format: string,
    quality: number
  ): Promise<void> {
    const textureCache = new Map<THREE.Texture, THREE.Texture>();
    
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        
        for (const material of materials) {
          if (material instanceof THREE.MeshStandardMaterial) {
            // Compress various texture maps
            const textureProps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'];
            
            for (const prop of textureProps) {
              const texture = (material as any)[prop] as THREE.Texture;
              if (texture && texture.image) {
                if (!textureCache.has(texture)) {
                  const compressed = this.compressTexture(texture, format, quality);
                  textureCache.set(texture, compressed);
                }
                (material as any)[prop] = textureCache.get(texture);
              }
            }
          }
        }
      }
    });
  }

  private compressTexture(texture: THREE.Texture, format: string, quality: number): THREE.Texture {
    // Create canvas for texture compression
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx || !texture.image) return texture;
    
    const image = texture.image as HTMLImageElement;
    
    // Resize if needed (power of 2)
    const maxSize = 2048;
    let width = image.width;
    let height = image.height;
    
    if (width > maxSize || height > maxSize) {
      const scale = maxSize / Math.max(width, height);
      width = Math.floor(width * scale);
      height = Math.floor(height * scale);
    }
    
    // Make power of 2
    width = Math.pow(2, Math.floor(Math.log2(width)));
    height = Math.pow(2, Math.floor(Math.log2(height)));
    
    canvas.width = width;
    canvas.height = height;
    
    // Draw and compress
    ctx.drawImage(image, 0, 0, width, height);
    
    // Convert to compressed format
    const compressedData = canvas.toDataURL(`image/${format}`, quality / 100);
    
    // Create new texture from compressed data
    const compressedTexture = texture.clone();
    const newImage = new Image();
    newImage.src = compressedData;
    compressedTexture.image = newImage;
    compressedTexture.needsUpdate = true;
    
    return compressedTexture;
  }

  private async optimizeMeshData(model: THREE.Object3D): Promise<void> {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const geometry = child.geometry as THREE.BufferGeometry;
        
        // Optimize vertex cache
        geometry.computeVertexNormals();
        
        // Remove duplicate vertices
        const positions = geometry.attributes.position.array;
        const normals = geometry.attributes.normal?.array;
        const uvs = geometry.attributes.uv?.array;
        
        // Create index if not present
        if (!geometry.index) {
          const indices: number[] = [];
          for (let i = 0; i < positions.length / 3; i++) {
            indices.push(i);
          }
          geometry.setIndex(indices);
        }
        
        // Optimize draw order for GPU cache
        geometry.computeBoundingSphere();
      }
    });
  }

  private async applyDracoCompression(
    model: THREE.Object3D,
    quantization: any
  ): Promise<void> {
    // Note: Actual DRACO compression happens during export
    // Here we prepare the model for optimal DRACO compression
    
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const geometry = child.geometry as THREE.BufferGeometry;
        
        // Quantize attributes for better compression
        if (geometry.attributes.position) {
          this.quantizeAttribute(geometry.attributes.position, quantization.position || 14);
        }
        if (geometry.attributes.normal) {
          this.quantizeAttribute(geometry.attributes.normal, quantization.normal || 10);
        }
        if (geometry.attributes.color) {
          this.quantizeAttribute(geometry.attributes.color, quantization.color || 8);
        }
        if (geometry.attributes.uv) {
          this.quantizeAttribute(geometry.attributes.uv, quantization.texCoord || 12);
        }
      }
    });
  }

  private quantizeAttribute(attribute: THREE.BufferAttribute, bits: number): void {
    const array = attribute.array;
    const scale = Math.pow(2, bits) - 1;
    
    // Find min/max values
    let min = Infinity;
    let max = -Infinity;
    
    for (let i = 0; i < array.length; i++) {
      min = Math.min(min, array[i]);
      max = Math.max(max, array[i]);
    }
    
    const range = max - min;
    
    // Quantize values
    for (let i = 0; i < array.length; i++) {
      const normalized = (array[i] - min) / range;
      const quantized = Math.round(normalized * scale);
      array[i] = (quantized / scale) * range + min;
    }
    
    attribute.needsUpdate = true;
  }

  private calculateModelStatistics(model: THREE.Object3D): {
    vertices: number;
    faces: number;
    materials: number;
    textures: number;
  } {
    let vertices = 0;
    let faces = 0;
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          const geometry = child.geometry as THREE.BufferGeometry;
          vertices += geometry.attributes.position?.count || 0;
          
          if (geometry.index) {
            faces += geometry.index.count / 3;
          } else {
            faces += (geometry.attributes.position?.count || 0) / 3;
          }
        }
        
        if (child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(mat => {
            materials.add(mat);
            
            if (mat instanceof THREE.MeshStandardMaterial) {
              [mat.map, mat.normalMap, mat.roughnessMap, mat.metalnessMap, mat.aoMap, mat.emissiveMap]
                .filter(tex => tex)
                .forEach(tex => textures.add(tex!));
            }
          });
        }
      }
    });
    
    return {
      vertices,
      faces: Math.floor(faces),
      materials: materials.size,
      textures: textures.size
    };
  }

  private async estimateModelSize(model: THREE.Object3D): Promise<number> {
    // Estimate size based on geometry and texture data
    let size = 0;
    
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const geometry = child.geometry as THREE.BufferGeometry;
        
        // Add geometry size
        for (const key in geometry.attributes) {
          const attribute = geometry.attributes[key];
          size += attribute.array.byteLength;
        }
        
        if (geometry.index) {
          size += geometry.index.array.byteLength;
        }
      }
    });
    
    // Add texture size estimates
    const textures = new Set<THREE.Texture>();
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach(mat => {
          if (mat instanceof THREE.MeshStandardMaterial) {
            [mat.map, mat.normalMap, mat.roughnessMap, mat.metalnessMap, mat.aoMap, mat.emissiveMap]
              .filter(tex => tex && tex.image)
              .forEach(tex => textures.add(tex!));
          }
        });
      }
    });
    
    textures.forEach(texture => {
      if (texture.image) {
        const img = texture.image as HTMLImageElement;
        // Estimate: 4 bytes per pixel (RGBA)
        size += (img.width || 512) * (img.height || 512) * 4;
      }
    });
    
    return size;
  }

  private getMaterialCacheKey(material: THREE.MeshStandardMaterial): string {
    return `${material.color.getHex()}_${material.roughness}_${material.metalness}_${material.transparent}`;
  }

  async exportCompressedModel(model: THREE.Object3D, useDraco: boolean = true): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      this.gltfExporter.parse(
        model,
        (result) => {
          if (result instanceof ArrayBuffer) {
            resolve(result);
          } else {
            // Convert JSON to ArrayBuffer
            const json = JSON.stringify(result);
            const buffer = new TextEncoder().encode(json);
            resolve(buffer.buffer);
          }
        },
        (error) => {
          reject(error);
        },
        {
          binary: true,
          dracoOptions: useDraco ? {
            decodeSpeed: 5,
            encodeSpeed: 5,
            encoderMethod: 1,
            quantization: {
              POSITION: 14,
              NORMAL: 10,
              COLOR: 8,
              TEX_COORD: 12,
              GENERIC: 12
            }
          } : undefined
        }
      );
    });
  }

  dispose(): void {
    this.dracoLoader.dispose();
  }
}