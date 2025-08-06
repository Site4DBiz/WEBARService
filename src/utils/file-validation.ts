export const MAX_FILE_SIZE = {
  MARKER: 10 * 1024 * 1024, // 10MB for images
  MODEL: 50 * 1024 * 1024, // 50MB for 3D models
}

export const ALLOWED_FILE_TYPES = {
  MARKER: {
    extensions: ['.jpg', '.jpeg', '.png', '.webp'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  MODEL: {
    extensions: ['.glb', '.gltf', '.fbx', '.obj'],
    mimeTypes: [
      'model/gltf-binary',
      'model/gltf+json',
      'application/octet-stream', // GLB files often have this MIME type
      'application/x-fbx', // FBX files
      'text/plain', // OBJ files
      'model/obj', // OBJ files alternative
    ],
  },
}

interface ValidationResult {
  isValid: boolean
  error?: string
}

export function validateFile(file: File, type: 'marker' | 'model' | 'MARKER' | 'MODEL'): ValidationResult {
  const upperType = type.toUpperCase() as 'MARKER' | 'MODEL'
  const maxSize = MAX_FILE_SIZE[upperType]
  const allowedTypes = ALLOWED_FILE_TYPES[upperType]

  // Check file size
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size exceeds ${maxSize / (1024 * 1024)}MB limit`,
    }
  }

  // Check file extension
  const fileName = file.name.toLowerCase()
  const fileExtension = '.' + fileName.split('.').pop()

  if (!allowedTypes.extensions.includes(fileExtension)) {
    return {
      isValid: false,
      error: `Invalid file type. Allowed extensions: ${allowedTypes.extensions.join(', ')}`,
    }
  }

  // Check MIME type (less strict for 3D models as browsers may not recognize them correctly)
  if (type === 'MARKER' && !allowedTypes.mimeTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `Invalid file type. Expected image file (JPEG, PNG, or WebP)`,
    }
  }

  return { isValid: true }
}

export function sanitizeFileName(fileName: string): string {
  // Remove special characters and spaces
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase()
}

export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.width, height: img.height })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

export function generateUniqueFileName(originalName: string, userId: string): string {
  const sanitized = sanitizeFileName(originalName)
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const extension = '.' + originalName.split('.').pop()?.toLowerCase()
  const nameWithoutExt = sanitized.replace(extension, '')

  return `${userId}/${timestamp}_${random}_${nameWithoutExt}${extension}`
}

export function validateImage(file: File): ValidationResult {
  return validateFile(file, 'MARKER')
}

export function generateUniqueFilename(filename: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const extension = '.' + filename.split('.').pop()?.toLowerCase()
  const nameWithoutExt = sanitizeFileName(filename.replace(extension, ''))

  return `${timestamp}_${random}_${nameWithoutExt}${extension}`
}
