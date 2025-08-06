'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import {
  Eye,
  Edit,
  Trash2,
  Download,
  Share2,
  Clock,
  User,
  Tag,
  Layers,
  Move3D,
  RotateCw,
  Maximize2,
  Globe,
  Lock,
  PlayCircle,
  MousePointer,
} from 'lucide-react'
import Image from 'next/image'
import { format } from 'date-fns'
import ARContentForm from './ARContentForm'
import ModelViewer from '@/components/3d/ModelViewer'

interface ARContentDetailProps {
  contentId: string
  onEdit?: () => void
  onDelete?: () => void
}

interface ContentData {
  id: string
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
  created_at: string
  updated_at: string
  published_at?: string
  view_count: number
  like_count: number
  user_id: string
  profiles?: {
    username: string
    full_name: string
    avatar_url?: string
  }
}

export default function ARContentDetail({ contentId, onEdit, onDelete }: ARContentDetailProps) {
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState<ContentData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const supabase = createClient()

  useEffect(() => {
    fetchContent()
  }, [contentId])

  const fetchContent = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('ar_contents')
        .select(
          `
          *,
          profiles!ar_contents_user_id_fkey (
            username,
            full_name,
            avatar_url
          )
        `
        )
        .eq('id', contentId)
        .single()

      if (error) throw error
      setContent(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveEdit = () => {
    setIsEditing(false)
    fetchContent()
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this AR content?')) return

    try {
      const { error } = await supabase
        .from('ar_contents')
        .update({ status: 'deleted' })
        .eq('id', contentId)

      if (error) throw error
      onDelete?.()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-500'
      case 'draft':
        return 'bg-yellow-500'
      case 'archived':
        return 'bg-gray-500'
      default:
        return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-8 w-1/3" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="py-8">
          <p className="text-center text-red-500">Error: {error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!content) {
    return (
      <Card className="w-full">
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Content not found</p>
        </CardContent>
      </Card>
    )
  }

  if (isEditing) {
    return (
      <ARContentForm
        contentId={contentId}
        mode="edit"
        onSave={handleSaveEdit}
        onCancel={() => setIsEditing(false)}
      />
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-2xl">{content.title}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(content.status)}>{content.status}</Badge>
              <Badge variant="outline">{content.category}</Badge>
              {content.is_public ? (
                <Badge variant="outline">
                  <Globe className="mr-1 h-3 w-3" />
                  Public
                </Badge>
              ) : (
                <Badge variant="outline">
                  <Lock className="mr-1 h-3 w-3" />
                  Private
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="3d-model">3D Model</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Thumbnail and Marker Images */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {content.thumbnail_url && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Thumbnail</h3>
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                    <Image
                      src={content.thumbnail_url}
                      alt="Thumbnail"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              )}
              {content.marker_image_url && (
                <div>
                  <h3 className="text-sm font-medium mb-2">AR Marker</h3>
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                    <Image
                      src={content.marker_image_url}
                      alt="AR Marker"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {content.description && (
              <div>
                <h3 className="text-sm font-medium mb-2">Description</h3>
                <p className="text-muted-foreground">{content.description}</p>
              </div>
            )}

            {/* Tags */}
            {content.tags && content.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {content.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      <Tag className="mr-1 h-3 w-3" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="text-sm font-medium">
                  {format(new Date(content.created_at), 'MMM dd, yyyy')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Updated</p>
                <p className="text-sm font-medium">
                  {format(new Date(content.updated_at), 'MMM dd, yyyy')}
                </p>
              </div>
              {content.published_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Published</p>
                  <p className="text-sm font-medium">
                    {format(new Date(content.published_at), 'MMM dd, yyyy')}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Author</p>
                <p className="text-sm font-medium">
                  {content.profiles?.full_name || content.profiles?.username || 'Unknown'}
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="3d-model" className="space-y-6">
            {content.model_url ? (
              <div>
                <h3 className="text-sm font-medium mb-4">3D Model Preview</h3>
                <div className="bg-muted rounded-lg p-4">
                  <ModelViewer modelUrl={content.model_url} />
                </div>
                <div className="mt-4">
                  <Button variant="outline" size="sm" asChild>
                    <a href={content.model_url} download>
                      <Download className="mr-2 h-4 w-4" />
                      Download Model
                    </a>
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No 3D model uploaded</p>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            {/* Transform Settings */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Transform Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center">
                      <Maximize2 className="mr-2 h-4 w-4" />
                      Scale
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{content.scale}x</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center">
                      <Move3D className="mr-2 h-4 w-4" />
                      Position
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">
                      X: {content.position.x}, Y: {content.position.y}, Z: {content.position.z}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center">
                      <RotateCw className="mr-2 h-4 w-4" />
                      Rotation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">
                      X: {content.rotation.x}°, Y: {content.rotation.y}°, Z: {content.rotation.z}°
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Animation Settings */}
            {content.animation_settings && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Animation Settings
                </h3>
                <Card>
                  <CardContent className="pt-6">
                    <pre className="text-sm bg-muted p-4 rounded overflow-auto">
                      {JSON.stringify(content.animation_settings, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Interaction Settings */}
            {content.interaction_settings && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <MousePointer className="mr-2 h-5 w-5" />
                  Interaction Settings
                </h3>
                <Card>
                  <CardContent className="pt-6">
                    <pre className="text-sm bg-muted p-4 rounded overflow-auto">
                      {JSON.stringify(content.interaction_settings, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center">
                    <Eye className="mr-2 h-4 w-4" />
                    Total Views
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{content.view_count || 0}</p>
                  <p className="text-xs text-muted-foreground">All time</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Unique Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">-</p>
                  <p className="text-xs text-muted-foreground">Not available</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center">
                    <Clock className="mr-2 h-4 w-4" />
                    Avg. Session
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">-</p>
                  <p className="text-xs text-muted-foreground">Not available</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Performance Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-8">
                  Analytics data will be available once the content is published and viewed.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
