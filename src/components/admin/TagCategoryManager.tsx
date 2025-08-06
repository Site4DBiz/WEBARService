'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Tag as TagIcon,
  Folder,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  ChevronRight,
  Hash,
  Palette,
  FileText,
  Search,
  Filter,
  MoreVertical,
} from 'lucide-react'

interface Tag {
  id: string
  name: string
  slug: string
  description?: string
  color: string
  icon?: string
  parent_id?: string
  metadata?: any
  created_at: string
  updated_at: string
  usage_count?: number
}

interface Category {
  id: string
  name: string
  slug: string
  description?: string
  icon?: string
  parent_id?: string
  sort_order: number
  active: boolean
  metadata?: any
  created_at: string
  updated_at: string
  content_count?: number
  children?: Category[]
}

type TabType = 'tags' | 'categories'

export function TagCategoryManager() {
  const [activeTab, setActiveTab] = useState<TabType>('tags')
  const [tags, setTags] = useState<Tag[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    color: '#3B82F6',
    icon: '',
    parent_id: '',
    sort_order: 0,
    active: true,
  })
  const supabase = createClient()

  useEffect(() => {
    if (activeTab === 'tags') {
      loadTags()
    } else {
      loadCategories()
    }
  }, [activeTab])

  async function loadTags() {
    setLoading(true)
    try {
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .order('name')

      if (tagsError) throw tagsError

      // Get usage counts
      const { data: usageData, error: usageError } = await supabase
        .from('content_tags')
        .select('tag_id')

      if (!usageError && usageData) {
        const usageCounts = usageData.reduce((acc: Record<string, number>, item) => {
          acc[item.tag_id] = (acc[item.tag_id] || 0) + 1
          return acc
        }, {})

        const tagsWithUsage = tagsData?.map((tag) => ({
          ...tag,
          usage_count: usageCounts[tag.id] || 0,
        }))

        setTags(tagsWithUsage || [])
      } else {
        setTags(tagsData || [])
      }
    } catch (error) {
      console.error('Error loading tags:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadCategories() {
    setLoading(true)
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order')

      if (categoriesError) throw categoriesError

      // Get content counts
      const { data: contentData, error: contentError } = await supabase
        .from('content_categories')
        .select('category_id')

      if (!contentError && contentData) {
        const contentCounts = contentData.reduce((acc: Record<string, number>, item) => {
          acc[item.category_id] = (acc[item.category_id] || 0) + 1
          return acc
        }, {})

        const categoriesWithCount = categoriesData?.map((category) => ({
          ...category,
          content_count: contentCounts[category.id] || 0,
        }))

        // Build hierarchy
        const buildHierarchy = (items: Category[], parentId: string | null = null): Category[] => {
          return items
            .filter((item) => item.parent_id === parentId)
            .map((item) => ({
              ...item,
              children: buildHierarchy(items, item.id),
            }))
        }

        setCategories(buildHierarchy(categoriesWithCount || []))
      } else {
        setCategories(categoriesData || [])
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateTag() {
    try {
      const { error } = await supabase.from('tags').insert({
        name: formData.name,
        slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-'),
        description: formData.description,
        color: formData.color,
        icon: formData.icon,
        parent_id: formData.parent_id || null,
      })

      if (error) throw error

      await loadTags()
      setShowCreateModal(false)
      resetForm()
    } catch (error) {
      console.error('Error creating tag:', error)
    }
  }

  async function handleCreateCategory() {
    try {
      const { error } = await supabase.from('categories').insert({
        name: formData.name,
        slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-'),
        description: formData.description,
        icon: formData.icon,
        parent_id: formData.parent_id || null,
        sort_order: formData.sort_order,
        active: formData.active,
      })

      if (error) throw error

      await loadCategories()
      setShowCreateModal(false)
      resetForm()
    } catch (error) {
      console.error('Error creating category:', error)
    }
  }

  async function handleUpdateTag(id: string, updates: Partial<Tag>) {
    try {
      const { error } = await supabase.from('tags').update(updates).eq('id', id)

      if (error) throw error

      await loadTags()
      setEditingId(null)
    } catch (error) {
      console.error('Error updating tag:', error)
    }
  }

  async function handleUpdateCategory(id: string, updates: Partial<Category>) {
    try {
      const { error } = await supabase.from('categories').update(updates).eq('id', id)

      if (error) throw error

      await loadCategories()
      setEditingId(null)
    } catch (error) {
      console.error('Error updating category:', error)
    }
  }

  async function handleDeleteTag(id: string) {
    if (!confirm('Are you sure you want to delete this tag?')) return

    try {
      const { error } = await supabase.from('tags').delete().eq('id', id)

      if (error) throw error

      await loadTags()
    } catch (error) {
      console.error('Error deleting tag:', error)
    }
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm('Are you sure you want to delete this category?')) return

    try {
      const { error } = await supabase.from('categories').delete().eq('id', id)

      if (error) throw error

      await loadCategories()
    } catch (error) {
      console.error('Error deleting category:', error)
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      slug: '',
      description: '',
      color: '#3B82F6',
      icon: '',
      parent_id: '',
      sort_order: 0,
      active: true,
    })
  }

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filterCategories = (items: Category[]): Category[] => {
    return items
      .filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .map((item) => ({
        ...item,
        children: item.children ? filterCategories(item.children) : [],
      }))
  }

  const filteredCategories = filterCategories(categories)

  const renderCategoryTree = (items: Category[], level: number = 0) => {
    return items.map((category) => (
      <div key={category.id}>
        <div
          className={`p-4 border-b hover:bg-gray-50 ${level > 0 ? `ml-${level * 8}` : ''}`}
          style={{ marginLeft: level * 32 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {category.children && category.children.length > 0 && (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
              <div className="flex items-center gap-2">
                {category.icon && <span className="text-lg">{category.icon}</span>}
                <div>
                  <h3 className="font-medium">{category.name}</h3>
                  <p className="text-sm text-gray-500">{category.slug}</p>
                  {category.description && (
                    <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">{category.content_count || 0} items</span>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    category.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {category.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingId(category.id)
                  setFormData({
                    name: category.name,
                    slug: category.slug,
                    description: category.description || '',
                    color: '#3B82F6',
                    icon: category.icon || '',
                    parent_id: category.parent_id || '',
                    sort_order: category.sort_order,
                    active: category.active,
                  })
                }}
                className="p-1 text-gray-500 hover:text-blue-500"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteCategory(category.id)}
                className="p-1 text-gray-500 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        {category.children && category.children.length > 0 && renderCategoryTree(category.children, level + 1)}
      </div>
    ))
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Tags & Categories</h1>
        <p className="text-gray-600">Manage content organization and classification</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('tags')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeTab === 'tags'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <TagIcon className="w-4 h-4" />
            Tags
          </div>
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeTab === 'categories'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4" />
            Categories
          </div>
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Plus className="w-4 h-4" />
            Add {activeTab === 'tags' ? 'Tag' : 'Category'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : activeTab === 'tags' ? (
          <div className="divide-y">
            {filteredTags.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <TagIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No tags found</p>
              </div>
            ) : (
              filteredTags.map((tag) => (
                <div key={tag.id} className="p-4 hover:bg-gray-50">
                  {editingId === tag.id ? (
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="flex-1 px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-10 h-10 border rounded cursor-pointer"
                      />
                      <button
                        onClick={() => handleUpdateTag(tag.id, formData)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: tag.color + '20', color: tag.color }}
                        >
                          <Hash className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-medium">{tag.name}</h3>
                          <p className="text-sm text-gray-500">{tag.slug}</p>
                          {tag.description && (
                            <p className="text-sm text-gray-600 mt-1">{tag.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">{tag.usage_count || 0} uses</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingId(tag.id)
                              setFormData({
                                name: tag.name,
                                slug: tag.slug,
                                description: tag.description || '',
                                color: tag.color,
                                icon: tag.icon || '',
                                parent_id: tag.parent_id || '',
                                sort_order: 0,
                                active: true,
                              })
                            }}
                            className="p-1 text-gray-500 hover:text-blue-500"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTag(tag.id)}
                            className="p-1 text-gray-500 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div>
            {filteredCategories.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Folder className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No categories found</p>
              </div>
            ) : (
              renderCategoryTree(filteredCategories)
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
              Create {activeTab === 'tags' ? 'Tag' : 'Category'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="auto-generated-from-name"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              {activeTab === 'tags' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-12 h-12 border rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
              {activeTab === 'categories' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Icon (Emoji)</label>
                    <input
                      type="text"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      placeholder="📁"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                    <input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) =>
                        setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="active"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="rounded"
                    />
                    <label htmlFor="active" className="text-sm font-medium text-gray-700">
                      Active
                    </label>
                  </div>
                </>
              )}
              <div className="flex gap-3">
                <button
                  onClick={activeTab === 'tags' ? handleCreateTag : handleCreateCategory}
                  disabled={!formData.name}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    resetForm()
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}