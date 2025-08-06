'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Eye,
  MessageSquare,
  AlertCircle,
  MoreVertical,
  Filter,
  Search,
  Calendar,
  User,
  Tag,
  Folder,
} from 'lucide-react'

type ApprovalStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'published'

interface ContentApproval {
  id: string
  content_id: string
  content_type: string
  status: ApprovalStatus
  submitted_by: string
  submitted_at: string
  reviewed_by?: string
  reviewed_at?: string
  published_by?: string
  published_at?: string
  rejection_reason?: string
  notes?: string
  content?: {
    title: string
    description?: string
    thumbnail_url?: string
    user?: {
      email: string
      full_name?: string
    }
  }
  submitter?: {
    email: string
    full_name?: string
  }
  reviewer?: {
    email: string
    full_name?: string
  }
}

interface ApprovalHistory {
  id: string
  approval_id: string
  action: string
  performed_by: string
  performed_at: string
  from_status: ApprovalStatus
  to_status: ApprovalStatus
  comment?: string
  user?: {
    email: string
    full_name?: string
  }
}

const statusConfig: Record<ApprovalStatus, { label: string; color: string; icon: JSX.Element }> = {
  draft: {
    label: 'Draft',
    color: 'bg-gray-100 text-gray-800',
    icon: <FileText className="w-4 h-4" />,
  },
  pending_review: {
    label: 'Pending Review',
    color: 'bg-yellow-100 text-yellow-800',
    icon: <Clock className="w-4 h-4" />,
  },
  approved: {
    label: 'Approved',
    color: 'bg-green-100 text-green-800',
    icon: <CheckCircle className="w-4 h-4" />,
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-800',
    icon: <XCircle className="w-4 h-4" />,
  },
  published: {
    label: 'Published',
    color: 'bg-blue-100 text-blue-800',
    icon: <CheckCircle className="w-4 h-4" />,
  },
}

export function ContentApprovalWorkflow() {
  const [approvals, setApprovals] = useState<ContentApproval[]>([])
  const [selectedApproval, setSelectedApproval] = useState<ContentApproval | null>(null)
  const [history, setHistory] = useState<ApprovalHistory[]>([])
  const [filter, setFilter] = useState<ApprovalStatus | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [comment, setComment] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadApprovals()
  }, [filter])

  useEffect(() => {
    if (selectedApproval) {
      loadHistory(selectedApproval.id)
    }
  }, [selectedApproval])

  async function loadApprovals() {
    setLoading(true)
    try {
      let query = supabase
        .from('content_approvals')
        .select(`
          *,
          content:ar_contents(
            title,
            description,
            thumbnail_url,
            user:user_profiles(email, full_name)
          ),
          submitter:user_profiles!content_approvals_submitted_by_fkey(email, full_name),
          reviewer:user_profiles!content_approvals_reviewed_by_fkey(email, full_name)
        `)
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) throw error
      setApprovals(data || [])
    } catch (error) {
      console.error('Error loading approvals:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadHistory(approvalId: string) {
    try {
      const { data, error } = await supabase
        .from('approval_history')
        .select(`
          *,
          user:user_profiles!approval_history_performed_by_fkey(email, full_name)
        `)
        .eq('approval_id', approvalId)
        .order('performed_at', { ascending: false })

      if (error) throw error
      setHistory(data || [])
    } catch (error) {
      console.error('Error loading history:', error)
    }
  }

  async function handleApprove(approvalId: string, autoPublish: boolean = false) {
    setActionLoading(true)
    try {
      const { error } = await supabase.rpc('approve_content', {
        p_approval_id: approvalId,
        p_comment: comment,
        p_auto_publish: autoPublish,
      })

      if (error) throw error

      await loadApprovals()
      if (selectedApproval?.id === approvalId) {
        await loadHistory(approvalId)
      }
      setComment('')
    } catch (error) {
      console.error('Error approving content:', error)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReject(approvalId: string) {
    if (!rejectReason.trim()) {
      alert('Please provide a rejection reason')
      return
    }

    setActionLoading(true)
    try {
      const { error } = await supabase.rpc('reject_content', {
        p_approval_id: approvalId,
        p_reason: rejectReason,
        p_comment: comment,
      })

      if (error) throw error

      await loadApprovals()
      if (selectedApproval?.id === approvalId) {
        await loadHistory(approvalId)
      }
      setShowRejectModal(false)
      setRejectReason('')
      setComment('')
    } catch (error) {
      console.error('Error rejecting content:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const filteredApprovals = approvals.filter((approval) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        approval.content?.title?.toLowerCase().includes(searchLower) ||
        approval.content?.description?.toLowerCase().includes(searchLower) ||
        approval.submitter?.email?.toLowerCase().includes(searchLower) ||
        approval.submitter?.full_name?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Content Approval Workflow</h1>
        <p className="text-gray-600">Review and approve content submissions</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search content, users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {Object.keys(statusConfig).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status as ApprovalStatus)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === status
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {statusConfig[status as ApprovalStatus].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Approvals List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Approval Queue</h2>
            </div>
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            ) : filteredApprovals.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No content to review</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredApprovals.map((approval) => (
                  <div
                    key={approval.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedApproval?.id === approval.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedApproval(approval)}
                  >
                    <div className="flex items-start gap-4">
                      {approval.content?.thumbnail_url ? (
                        <img
                          src={approval.content.thumbnail_url}
                          alt={approval.content.title}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                          <FileText className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-medium mb-1">{approval.content?.title || 'Untitled'}</h3>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {approval.content?.description || 'No description'}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {approval.submitter?.full_name || approval.submitter?.email || 'Unknown'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {approval.submitted_at
                              ? new Date(approval.submitted_at).toLocaleDateString()
                              : 'Not submitted'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            statusConfig[approval.status].color
                          }`}
                        >
                          {statusConfig[approval.status].icon}
                          {statusConfig[approval.status].label}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Approval Details */}
        <div className="lg:col-span-1">
          {selectedApproval ? (
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b">
                <h2 className="font-semibold">Approval Details</h2>
              </div>
              <div className="p-4">
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                        statusConfig[selectedApproval.status].color
                      }`}
                    >
                      {statusConfig[selectedApproval.status].icon}
                      {statusConfig[selectedApproval.status].label}
                    </span>
                  </div>
                </div>

                {selectedApproval.notes && (
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700">Submission Notes</label>
                    <p className="mt-1 text-sm text-gray-600">{selectedApproval.notes}</p>
                  </div>
                )}

                {selectedApproval.rejection_reason && (
                  <div className="mb-4 p-3 bg-red-50 rounded-lg">
                    <label className="text-sm font-medium text-red-800">Rejection Reason</label>
                    <p className="mt-1 text-sm text-red-600">{selectedApproval.rejection_reason}</p>
                  </div>
                )}

                {selectedApproval.status === 'pending_review' && (
                  <div className="space-y-3">
                    <textarea
                      placeholder="Add a comment (optional)"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(selectedApproval.id, false)}
                        disabled={actionLoading}
                        className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleApprove(selectedApproval.id, true)}
                        disabled={actionLoading}
                        className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Approve & Publish
                      </button>
                      <button
                        onClick={() => setShowRejectModal(true)}
                        disabled={actionLoading}
                        className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}

                {/* History */}
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Activity History</h3>
                  <div className="space-y-3">
                    {history.map((item) => (
                      <div key={item.id} className="flex gap-3 text-sm">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-900">
                            <span className="font-medium">
                              {item.user?.full_name || item.user?.email || 'Unknown'}
                            </span>{' '}
                            {item.action.replace('_', ' ')}
                          </p>
                          {item.comment && <p className="text-gray-600 mt-1">{item.comment}</p>}
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(item.performed_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
              <Eye className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Select an item to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && selectedApproval && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Reject Content</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={4}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Comments
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Any additional feedback..."
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleReject(selectedApproval.id)}
                  disabled={actionLoading || !rejectReason.trim()}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reject Content
                </button>
                <button
                  onClick={() => {
                    setShowRejectModal(false)
                    setRejectReason('')
                    setComment('')
                  }}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
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