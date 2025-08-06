'use client'

import { useState, useCallback, FormEvent } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database.types'

interface UploadFormData {
  title: string
  description: string
  markerFile: File | null
  modelFile: File | null
  isPublic: boolean
}

interface UploadProgress {
  isUploading: boolean
  progress: number
  message: string
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_MARKER_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_MODEL_TYPES = ['model/gltf-binary', 'model/gltf+json', 'application/octet-stream', '.glb', '.gltf']

export default function ARContentUpload() {
  const supabase = createClientComponentClient<Database>()
  const [formData, setFormData] = useState<UploadFormData>({
    title: '',
    description: '',
    markerFile: null,
    modelFile: null,
    isPublic: false,
  })
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    isUploading: false,
    progress: 0,
    message: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)

  const validateFile = (file: File, allowedTypes: string[], maxSize: number): string | null => {
    if (file.size > maxSize) {
      return `File size exceeds ${maxSize / (1024 * 1024)}MB limit`
    }
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const isValidType = allowedTypes.some(type => {
      if (type.startsWith('.')) {
        return `.${fileExtension}` === type
      }
      return file.type === type || file.type.includes(type.split('/')[1])
    })
    
    if (!isValidType) {
      return `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
    }
    
    return null
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, fieldName: 'markerFile' | 'modelFile') => {
    const file = event.target.files?.[0] || null
    
    if (file) {
      const allowedTypes = fieldName === 'markerFile' ? ALLOWED_MARKER_TYPES : ALLOWED_MODEL_TYPES
      const validationError = validateFile(file, allowedTypes, MAX_FILE_SIZE)
      
      if (validationError) {
        setError(validationError)
        return
      }
    }
    
    setError(null)
    setFormData(prev => ({ ...prev, [fieldName]: file }))
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const base64 = reader.result as string
        resolve(base64.split(',')[1])
      }
      reader.onerror = error => reject(error)
    })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!formData.title.trim()) {
      setError('Title is required')
      return
    }

    if (!formData.markerFile && !formData.modelFile) {
      setError('Please upload at least one file (marker or model)')
      return
    }

    setUploadProgress({
      isUploading: true,
      progress: 10,
      message: 'Preparing files...',
    })

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('You must be logged in to upload content')
      }

      setUploadProgress({
        isUploading: true,
        progress: 30,
        message: 'Uploading marker file...',
      })

      let markerUrl = null
      let modelUrl = null

      // Upload marker file
      if (formData.markerFile) {
        const markerPath = `${user.id}/${Date.now()}-${formData.markerFile.name}`
        const { data: markerData, error: markerError } = await supabase.storage
          .from('ar-markers')
          .upload(markerPath, formData.markerFile, {
            cacheControl: '3600',
            upsert: false
          })

        if (markerError) throw markerError

        const { data: { publicUrl } } = supabase.storage
          .from('ar-markers')
          .getPublicUrl(markerPath)
        
        markerUrl = publicUrl
      }

      setUploadProgress({
        isUploading: true,
        progress: 60,
        message: 'Uploading model file...',
      })

      // Upload model file
      if (formData.modelFile) {
        const modelPath = `${user.id}/${Date.now()}-${formData.modelFile.name}`
        const { data: modelData, error: modelError } = await supabase.storage
          .from('ar-models')
          .upload(modelPath, formData.modelFile, {
            cacheControl: '3600',
            upsert: false
          })

        if (modelError) throw modelError

        const { data: { publicUrl } } = supabase.storage
          .from('ar-models')
          .getPublicUrl(modelPath)
        
        modelUrl = publicUrl
      }

      setUploadProgress({
        isUploading: true,
        progress: 80,
        message: 'Creating AR content record...',
      })

      // Create AR content record
      const { data: arContent, error: dbError } = await supabase
        .from('ar_contents')
        .insert({
          user_id: user.id,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          marker_url: markerUrl,
          model_url: modelUrl,
          is_public: formData.isPublic,
        })
        .select()
        .single()

      if (dbError) throw dbError

      // Create marker record if marker was uploaded
      if (markerUrl && arContent) {
        const { error: markerRecordError } = await supabase
          .from('ar_markers')
          .insert({
            content_id: arContent.id,
            marker_image_url: markerUrl,
            marker_pattern_url: markerUrl,
          })

        if (markerRecordError) {
          console.error('Failed to create marker record:', markerRecordError)
        }
      }

      setUploadProgress({
        isUploading: false,
        progress: 100,
        message: 'Upload complete!',
      })

      setSuccess(true)
      // Reset form
      setFormData({
        title: '',
        description: '',
        markerFile: null,
        modelFile: null,
        isPublic: false,
      })

      // Reset file inputs
      const markerInput = document.getElementById('markerFile') as HTMLInputElement
      const modelInput = document.getElementById('modelFile') as HTMLInputElement
      if (markerInput) markerInput.value = ''
      if (modelInput) modelInput.value = ''

    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to upload content')
      setUploadProgress({
        isUploading: false,
        progress: 0,
        message: '',
      })
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Upload AR Content</h2>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          AR content uploaded successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Title *
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            maxLength={200}
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
          />
        </div>

        <div>
          <label htmlFor="markerFile" className="block text-sm font-medium text-gray-700 mb-2">
            Marker Image (JPEG, PNG, WebP)
          </label>
          <input
            type="file"
            id="markerFile"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={(e) => handleFileChange(e, 'markerFile')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {formData.markerFile && (
            <p className="mt-2 text-sm text-gray-600">
              Selected: {formData.markerFile.name} ({(formData.markerFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        <div>
          <label htmlFor="modelFile" className="block text-sm font-medium text-gray-700 mb-2">
            3D Model (GLB, GLTF)
          </label>
          <input
            type="file"
            id="modelFile"
            accept=".glb,.gltf"
            onChange={(e) => handleFileChange(e, 'modelFile')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {formData.modelFile && (
            <p className="mt-2 text-sm text-gray-600">
              Selected: {formData.modelFile.name} ({(formData.modelFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isPublic}
              onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">
              Make this content public
            </span>
          </label>
        </div>

        {uploadProgress.isUploading && (
          <div className="space-y-2">
            <div className="bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress.progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">{uploadProgress.message}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={uploadProgress.isUploading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploadProgress.isUploading ? 'Uploading...' : 'Upload AR Content'}
        </button>
      </form>
    </div>
  )
}