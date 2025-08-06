'use client'

import { useState, useCallback, FormEvent, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'

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

interface MarkerValidation {
  isValid: boolean
  warnings: string[]
  qualityScore?: number
  qualityFeedback?: string
  thumbnail?: string
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_MARKER_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_MODEL_TYPES = [
  'model/gltf-binary',
  'model/gltf+json',
  'application/octet-stream',
  '.glb',
  '.gltf',
]

export default function ARContentUpload() {
  const supabase = createClient()
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
  const [markerValidation, setMarkerValidation] = useState<MarkerValidation | null>(null)
  const [isProcessingMarker, setIsProcessingMarker] = useState(false)

  const validateFile = (file: File, allowedTypes: string[], maxSize: number): string | null => {
    if (file.size > maxSize) {
      return `File size exceeds ${maxSize / (1024 * 1024)}MB limit`
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const isValidType = allowedTypes.some((type) => {
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

  const processMarkerImage = async (file: File) => {
    setIsProcessingMarker(true)
    setMarkerValidation(null)

    try {
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const base64 = reader.result as string
          resolve(base64)
        }
      })
      reader.readAsDataURL(file)
      const base64 = await base64Promise

      const response = await fetch('/api/ar/process-marker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64,
          options: {
            generateThumbnail: true,
            optimize: true,
            calculateQuality: true,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to process marker image')
        if (data.details) {
          setError(`${data.error}: ${data.details.join(', ')}`)
        }
        return
      }

      setMarkerValidation({
        isValid: data.validation.isValid,
        warnings: data.validation.warnings || [],
        qualityScore: data.qualityScore,
        qualityFeedback: data.qualityFeedback,
        thumbnail: data.thumbnail,
      })

      if (data.processed) {
        // Store the optimized version for upload
        const optimizedBlob = await fetch(data.processed.base64).then((r) => r.blob())
        const optimizedFile = new File([optimizedBlob], file.name, { type: 'image/jpeg' })
        setFormData((prev) => ({ ...prev, markerFile: optimizedFile }))
      }
    } catch (err) {
      console.error('Error processing marker:', err)
      setError('Failed to process marker image')
    } finally {
      setIsProcessingMarker(false)
    }
  }

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    fieldName: 'markerFile' | 'modelFile'
  ) => {
    const file = event.target.files?.[0] || null

    if (file) {
      const allowedTypes = fieldName === 'markerFile' ? ALLOWED_MARKER_TYPES : ALLOWED_MODEL_TYPES
      const validationError = validateFile(file, allowedTypes, MAX_FILE_SIZE)

      if (validationError) {
        setError(validationError)
        return
      }

      if (fieldName === 'markerFile') {
        await processMarkerImage(file)
      }
    }

    setError(null)
    if (fieldName === 'modelFile') {
      setFormData((prev) => ({ ...prev, [fieldName]: file }))
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const base64 = reader.result as string
        resolve(base64.split(',')[1])
      }
      reader.onerror = (error) => reject(error)
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
      const {
        data: { user },
      } = await supabase.auth.getUser()
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
            upsert: false,
          })

        if (markerError) throw markerError

        const {
          data: { publicUrl },
        } = supabase.storage.from('ar-markers').getPublicUrl(markerPath)

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
            upsert: false,
          })

        if (modelError) throw modelError

        const {
          data: { publicUrl },
        } = supabase.storage.from('ar-models').getPublicUrl(modelPath)

        modelUrl = publicUrl
      }

      setUploadProgress({
        isUploading: true,
        progress: 80,
        message: 'Creating AR content record...',
      })

      // Create AR content record
      const { data: arContent, error: dbError } = await supabase
        .from('user_ar_contents')
        .insert({
          user_id: user.id,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          target_file_url: markerUrl,
          model_file_url: modelUrl,
          is_public: formData.isPublic,
          content_type: 'image', // Default to image type
        })
        .select()
        .single()

      if (dbError) throw dbError

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
            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
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
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
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
            disabled={isProcessingMarker}
          />

          {isProcessingMarker && (
            <div className="mt-3 flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-sm text-gray-600">Processing marker image...</span>
            </div>
          )}

          {markerValidation && (
            <div className="mt-3 space-y-2">
              {markerValidation.thumbnail && (
                <div className="flex items-start space-x-3">
                  <img
                    src={markerValidation.thumbnail}
                    alt="Marker thumbnail"
                    className="w-20 h-20 object-cover rounded border border-gray-300"
                  />
                  <div className="flex-1">
                    {markerValidation.qualityScore !== undefined && (
                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">Quality Score</span>
                          <span className="text-sm font-bold text-gray-900">
                            {markerValidation.qualityScore}/100
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              markerValidation.qualityScore >= 70
                                ? 'bg-green-500'
                                : markerValidation.qualityScore >= 50
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                            }`}
                            style={{ width: `${markerValidation.qualityScore}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    {markerValidation.qualityFeedback && (
                      <p
                        className={`text-sm ${
                          markerValidation.qualityScore && markerValidation.qualityScore >= 70
                            ? 'text-green-600'
                            : markerValidation.qualityScore && markerValidation.qualityScore >= 50
                              ? 'text-yellow-600'
                              : 'text-red-600'
                        }`}
                      >
                        {markerValidation.qualityFeedback}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {markerValidation.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                  <p className="text-sm font-medium text-yellow-800 mb-1">Warnings:</p>
                  <ul className="list-disc list-inside text-sm text-yellow-700">
                    {markerValidation.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {formData.markerFile && !isProcessingMarker && !markerValidation && (
            <p className="mt-2 text-sm text-gray-600">
              Selected: {formData.markerFile.name} (
              {(formData.markerFile.size / 1024 / 1024).toFixed(2)} MB)
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
              Selected: {formData.modelFile.name} (
              {(formData.modelFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isPublic}
              onChange={(e) => setFormData((prev) => ({ ...prev, isPublic: e.target.checked }))}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">Make this content public</span>
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
