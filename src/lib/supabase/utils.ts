import { createClient } from '@/lib/supabase/client'

/**
 * Utility functions for Supabase operations
 */

/**
 * Uploads a file to Supabase Storage
 * @param bucket - The storage bucket name
 * @param path - The file path in the bucket
 * @param file - The file to upload
 * @returns The public URL of the uploaded file
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const supabase = createClient()

  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) {
    console.error('Error uploading file:', error)
    return { url: null, error: error.message }
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(data.path)

  return { url: publicUrl, error: null }
}

/**
 * Deletes a file from Supabase Storage
 * @param bucket - The storage bucket name
 * @param path - The file path in the bucket
 */
export async function deleteFile(
  bucket: string,
  path: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient()

  const { error } = await supabase.storage.from(bucket).remove([path])

  if (error) {
    console.error('Error deleting file:', error)
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

/**
 * Gets a signed URL for temporary file access
 * @param bucket - The storage bucket name
 * @param path - The file path in the bucket
 * @param expiresIn - Expiration time in seconds (default: 3600)
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600
): Promise<{ url: string | null; error: string | null }> {
  const supabase = createClient()

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)

  if (error) {
    console.error('Error creating signed URL:', error)
    return { url: null, error: error.message }
  }

  return { url: data.signedUrl, error: null }
}

/**
 * Lists files in a storage bucket
 * @param bucket - The storage bucket name
 * @param path - The folder path (optional)
 * @param options - List options (limit, offset, search)
 */
export async function listFiles(
  bucket: string,
  path?: string,
  options?: {
    limit?: number
    offset?: number
    search?: string
  }
): Promise<{ files: any[] | null; error: string | null }> {
  const supabase = createClient()

  const { data, error } = await supabase.storage.from(bucket).list(path, {
    limit: options?.limit || 100,
    offset: options?.offset || 0,
    search: options?.search,
  })

  if (error) {
    console.error('Error listing files:', error)
    return { files: null, error: error.message }
  }

  return { files: data, error: null }
}

/**
 * Creates a storage bucket
 * @param name - The bucket name
 * @param options - Bucket options
 */
export async function createBucket(
  name: string,
  options?: {
    public?: boolean
    fileSizeLimit?: number
    allowedMimeTypes?: string[]
  }
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient()

  const { error } = await supabase.storage.createBucket(name, {
    public: options?.public || false,
    fileSizeLimit: options?.fileSizeLimit,
    allowedMimeTypes: options?.allowedMimeTypes,
  })

  if (error) {
    console.error('Error creating bucket:', error)
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

/**
 * Formats file size for display
 * @param bytes - File size in bytes
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`
}

/**
 * Validates file type
 * @param file - The file to validate
 * @param allowedTypes - Array of allowed MIME types
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type)
}

/**
 * Validates file size
 * @param file - The file to validate
 * @param maxSize - Maximum size in bytes
 */
export function validateFileSize(file: File, maxSize: number): boolean {
  return file.size <= maxSize
}

/**
 * Generates a unique file path
 * @param userId - The user's ID
 * @param fileName - The original file name
 * @param folder - Optional folder path
 */
export function generateFilePath(userId: string, fileName: string, folder?: string): string {
  const timestamp = Date.now()
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  const basePath = folder ? `${folder}/${userId}` : userId

  return `${basePath}/${timestamp}_${cleanFileName}`
}

/**
 * Extracts file extension
 * @param fileName - The file name
 */
export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}

/**
 * Checks if a file is an image
 * @param fileName - The file name or MIME type
 */
export function isImageFile(fileName: string): boolean {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']
  const extension = getFileExtension(fileName)
  return imageExtensions.includes(extension) || fileName.startsWith('image/')
}

/**
 * Checks if a file is a 3D model
 * @param fileName - The file name or MIME type
 */
export function is3DModelFile(fileName: string): boolean {
  const modelExtensions = ['obj', 'fbx', 'gltf', 'glb', 'dae', 'stl', 'ply']
  const extension = getFileExtension(fileName)
  return modelExtensions.includes(extension) || fileName.includes('model/')
}
