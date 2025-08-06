'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Save, X, Upload, Image as ImageIcon } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Image from 'next/image'

interface ARContentFormProps {
  contentId?: string
  onSave?: () => void
  onCancel?: () => void
  mode?: 'create' | 'edit'
}

interface ARContentData {
  title: string
  description: string
  category: string
  status: string
  thumbnail_url?: string
  model_url?: string
  marker_image_url?: string
  scale: number
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  animation_settings?: any
  interaction_settings?: any
  is_public: boolean
  tags?: string[]
}

const categories = [
  'Education',
  'Entertainment',
  'Marketing',
  'Art',
  'Technology',
  'Business',
  'Gaming',
  'Other',
]

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
]

export default function ARContentForm({
  contentId,
  onSave,
  onCancel,
  mode = 'create',
}: ARContentFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [modelFile, setModelFile] = useState<File | null>(null)
  const [markerFile, setMarkerFile] = useState<File | null>(null)
  const [markerPreview, setMarkerPreview] = useState<string | null>(null)

  const [formData, setFormData] = useState<ARContentData>({
    title: '',
    description: '',
    category: 'Other',
    status: 'draft',
    scale: 1,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    is_public: false,
    tags: [],
  })

  const supabase = createClient()

  useEffect(() => {
    if (mode === 'edit' && contentId) {
      fetchContent()
    }
  }, [contentId, mode])

  const fetchContent = async () => {
    if (!contentId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('ar_contents')
        .select('*')
        .eq('id', contentId)
        .single()

      if (error) throw error

      if (data) {
        setFormData({
          title: data.title || '',
          description: data.description || '',
          category: data.category || 'Other',
          status: data.status || 'draft',
          thumbnail_url: data.thumbnail_url,
          model_url: data.model_url,
          marker_image_url: data.marker_image_url,
          scale: data.scale || 1,
          position: data.position || { x: 0, y: 0, z: 0 },
          rotation: data.rotation || { x: 0, y: 0, z: 0 },
          animation_settings: data.animation_settings,
          interaction_settings: data.interaction_settings,
          is_public: data.is_public || false,
          tags: data.tags || [],
        })

        if (data.thumbnail_url) {
          setThumbnailPreview(data.thumbnail_url)
        }
        if (data.marker_image_url) {
          setMarkerPreview(data.marker_image_url)
        }
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setThumbnailFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setModelFile(file)
    }
  }

  const handleMarkerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setMarkerFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setMarkerPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadFile = async (file: File, bucket: string): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
    return data.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let thumbnailUrl = formData.thumbnail_url
      let modelUrl = formData.model_url
      let markerUrl = formData.marker_image_url

      // Upload files if provided
      if (thumbnailFile) {
        thumbnailUrl = await uploadFile(thumbnailFile, 'ar-thumbnails')
      }
      if (modelFile) {
        modelUrl = await uploadFile(modelFile, 'ar-models')
      }
      if (markerFile) {
        markerUrl = await uploadFile(markerFile, 'ar-markers')
      }

      const contentData = {
        ...formData,
        thumbnail_url: thumbnailUrl,
        model_url: modelUrl,
        marker_image_url: markerUrl,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      }

      if (mode === 'create') {
        // Create new content
        const { error } = await supabase.from('ar_contents').insert([contentData])
        if (error) throw error
      } else {
        // Update existing content
        const { error } = await supabase
          .from('ar_contents')
          .update(contentData)
          .eq('id', contentId)
        if (error) throw error
      }

      setSuccess(true)
      setTimeout(() => {
        onSave?.()
      }, 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{mode === 'create' ? 'Create New' : 'Edit'} AR Content</span>
          {onCancel && (
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>
                AR content {mode === 'create' ? 'created' : 'updated'} successfully!
              </AlertDescription>
            </Alert>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  disabled={loading}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                  disabled={loading}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* File Uploads */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="thumbnail">Thumbnail Image</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="thumbnail"
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                  disabled={loading}
                  className="flex-1"
                />
                {thumbnailPreview && (
                  <div className="relative h-20 w-20">
                    <Image
                      src={thumbnailPreview}
                      alt="Thumbnail preview"
                      fill
                      className="object-cover rounded"
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="model">3D Model</Label>
              <Input
                id="model"
                type="file"
                accept=".glb,.gltf,.fbx,.obj"
                onChange={handleModelChange}
                disabled={loading}
              />
              {formData.model_url && !modelFile && (
                <p className="text-sm text-muted-foreground mt-1">
                  Current: {formData.model_url.split('/').pop()}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="marker">Marker Image</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="marker"
                  type="file"
                  accept="image/*"
                  onChange={handleMarkerChange}
                  disabled={loading}
                  className="flex-1"
                />
                {markerPreview && (
                  <div className="relative h-20 w-20">
                    <Image
                      src={markerPreview}
                      alt="Marker preview"
                      fill
                      className="object-cover rounded"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Transform Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Transform Settings</h3>
            
            <div>
              <Label htmlFor="scale">Scale</Label>
              <Input
                id="scale"
                type="number"
                step="0.1"
                value={formData.scale}
                onChange={(e) => setFormData({ ...formData, scale: parseFloat(e.target.value) })}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="posX">Position X</Label>
                <Input
                  id="posX"
                  type="number"
                  step="0.1"
                  value={formData.position.x}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      position: { ...formData.position, x: parseFloat(e.target.value) },
                    })
                  }
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="posY">Position Y</Label>
                <Input
                  id="posY"
                  type="number"
                  step="0.1"
                  value={formData.position.y}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      position: { ...formData.position, y: parseFloat(e.target.value) },
                    })
                  }
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="posZ">Position Z</Label>
                <Input
                  id="posZ"
                  type="number"
                  step="0.1"
                  value={formData.position.z}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      position: { ...formData.position, z: parseFloat(e.target.value) },
                    })
                  }
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="rotX">Rotation X</Label>
                <Input
                  id="rotX"
                  type="number"
                  step="1"
                  value={formData.rotation.x}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rotation: { ...formData.rotation, x: parseFloat(e.target.value) },
                    })
                  }
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="rotY">Rotation Y</Label>
                <Input
                  id="rotY"
                  type="number"
                  step="1"
                  value={formData.rotation.y}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rotation: { ...formData.rotation, y: parseFloat(e.target.value) },
                    })
                  }
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="rotZ">Rotation Z</Label>
                <Input
                  id="rotZ"
                  type="number"
                  step="1"
                  value={formData.rotation.z}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rotation: { ...formData.rotation, z: parseFloat(e.target.value) },
                    })
                  }
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Visibility Settings */}
          <div className="flex items-center space-x-2">
            <Switch
              id="public"
              checked={formData.is_public}
              onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
              disabled={loading}
            />
            <Label htmlFor="public">Make this content public</Label>
          </div>

          {/* Tags */}
          <div>
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input
              id="tags"
              value={formData.tags?.join(', ')}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  tags: e.target.value.split(',').map((tag) => tag.trim()).filter(Boolean),
                })
              }
              placeholder="e.g. education, interactive, 3d"
              disabled={loading}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? (
                'Saving...'
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {mode === 'create' ? 'Create' : 'Update'} Content
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}