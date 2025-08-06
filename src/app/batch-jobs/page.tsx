'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BatchJob, BatchJobType, JobStatus } from '@/types/batch'
import {
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Plus,
  Filter,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader,
  Package,
  Settings,
  Calendar,
  Activity,
} from 'lucide-react'
import { RoleGuard } from '@/components/auth/RoleGuard'

const statusColors: Record<JobStatus, string> = {
  pending: 'bg-gray-100 text-gray-800',
  queued: 'bg-blue-100 text-blue-800',
  processing: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-600',
}

const statusIcons: Record<JobStatus, React.ReactNode> = {
  pending: <Clock className="w-4 h-4" />,
  queued: <AlertCircle className="w-4 h-4" />,
  processing: <Loader className="w-4 h-4 animate-spin" />,
  completed: <CheckCircle className="w-4 h-4" />,
  failed: <XCircle className="w-4 h-4" />,
  cancelled: <XCircle className="w-4 h-4" />,
}

const jobTypeLabels: Record<BatchJobType, string> = {
  marker_optimization: 'Marker Optimization',
  mindar_generation: 'MindAR Generation',
  content_update: 'Content Update',
  data_export: 'Data Export',
  statistics_aggregation: 'Statistics Aggregation',
}

export default function BatchJobsPage() {
  const [jobs, setJobs] = useState<BatchJob[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<{ status?: JobStatus; type?: BatchJobType }>({})
  const [showNewJobModal, setShowNewJobModal] = useState(false)
  const [selectedJob, setSelectedJob] = useState<BatchJob | null>(null)
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchJobs()
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchJobs, 5000)
    setRefreshInterval(interval)
    return () => clearInterval(interval)
  }, [filter])

  const fetchJobs = async () => {
    try {
      const params = new URLSearchParams()
      if (filter.status) params.append('status', filter.status)
      if (filter.type) params.append('type', filter.type)

      const response = await fetch(`/api/batch-jobs?${params}`)
      const data = await response.json()
      setJobs(data.jobs || [])
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleJobAction = async (jobId: string, action: 'cancel' | 'retry') => {
    try {
      const response = await fetch(`/api/batch-jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      if (response.ok) {
        fetchJobs()
      }
    } catch (error) {
      console.error(`Error ${action}ing job:`, error)
    }
  }

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return

    try {
      const response = await fetch(`/api/batch-jobs/${jobId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchJobs()
      }
    } catch (error) {
      console.error('Error deleting job:', error)
    }
  }

  const getProgressBar = (job: BatchJob) => {
    const progress = job.progress || 0
    const color =
      job.status === 'failed'
        ? 'bg-red-500'
        : job.status === 'completed'
          ? 'bg-green-500'
          : 'bg-blue-500'

    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all duration-300`}
          style={{ width: `${progress}%` }}
        />
      </div>
    )
  }

  return (
    <RoleGuard allowedRoles={['admin', 'moderator']}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Batch Jobs Management</h1>
            <p className="text-gray-600 mt-2">Monitor and manage batch processing jobs</p>
          </div>
          <button
            onClick={() => setShowNewJobModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Job
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-4 items-center">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={filter.status || ''}
              onChange={(e) =>
                setFilter({ ...filter, status: (e.target.value as JobStatus) || undefined })
              }
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="queued">Queued</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={filter.type || ''}
              onChange={(e) =>
                setFilter({ ...filter, type: (e.target.value as BatchJobType) || undefined })
              }
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">All Types</option>
              <option value="marker_optimization">Marker Optimization</option>
              <option value="mindar_generation">MindAR Generation</option>
              <option value="content_update">Content Update</option>
              <option value="data_export">Data Export</option>
              <option value="statistics_aggregation">Statistics Aggregation</option>
            </select>
          </div>
        </div>

        {/* Active Jobs */}
        {jobs.filter((j) => j.status === 'processing').length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Active Jobs
            </h2>
            <div className="grid gap-4">
              {jobs
                .filter((j) => j.status === 'processing')
                .map((job) => (
                  <div
                    key={job.id}
                    className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">{job.name}</h3>
                        <p className="text-sm text-gray-600">{jobTypeLabels[job.type]}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Loader className="w-5 h-5 animate-spin text-yellow-600" />
                        <span className="text-sm font-medium">{job.progress}%</span>
                      </div>
                    </div>
                    {getProgressBar(job)}
                    <div className="mt-2 flex justify-between text-sm text-gray-600">
                      <span>
                        {job.processed_items} / {job.total_items} items
                      </span>
                      <button
                        onClick={() => handleJobAction(job.id, 'cancel')}
                        className="text-red-600 hover:text-red-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Job List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Schedule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center">
                    <Loader className="w-6 h-6 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No jobs found
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium">{job.name}</div>
                        <div className="text-sm text-gray-500">ID: {job.id.slice(0, 8)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm">{jobTypeLabels[job.type]}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors[job.status]}`}
                      >
                        {statusIcons[job.status]}
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-32">
                        {getProgressBar(job)}
                        <div className="text-xs text-gray-500 mt-1">
                          {job.processed_items}/{job.total_items}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm">
                        {job.schedule_type === 'immediate' && <Clock className="w-4 h-4" />}
                        {job.schedule_type === 'scheduled' && <Calendar className="w-4 h-4" />}
                        {job.schedule_type === 'recurring' && <RotateCcw className="w-4 h-4" />}
                        <span>{job.schedule_type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {new Date(job.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        {job.status === 'failed' && (
                          <button
                            onClick={() => handleJobAction(job.id, 'retry')}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Retry"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        {job.status === 'processing' && (
                          <button
                            onClick={() => handleJobAction(job.id, 'cancel')}
                            className="p-1 text-orange-600 hover:bg-orange-50 rounded"
                            title="Cancel"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedJob(job)}
                          className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                          title="View Details"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteJob(job.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* New Job Modal */}
        {showNewJobModal && (
          <NewJobModal onClose={() => setShowNewJobModal(false)} onSuccess={fetchJobs} />
        )}

        {/* Job Details Modal */}
        {selectedJob && <JobDetailsModal job={selectedJob} onClose={() => setSelectedJob(null)} />}
      </div>
    </RoleGuard>
  )
}

function NewJobModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'marker_optimization' as BatchJobType,
    schedule_type: 'immediate' as 'immediate' | 'scheduled',
    scheduled_at: '',
    priority: 5,
    config: {},
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch('/api/batch-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        onSuccess()
        onClose()
      }
    } catch (error) {
      console.error('Error creating job:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Create New Batch Job</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Job Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Job Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as BatchJobType })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="marker_optimization">Marker Optimization</option>
                <option value="mindar_generation">MindAR Generation</option>
                <option value="content_update">Content Update</option>
                <option value="data_export">Data Export</option>
                <option value="statistics_aggregation">Statistics Aggregation</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Schedule Type</label>
              <select
                value={formData.schedule_type}
                onChange={(e) => setFormData({ ...formData, schedule_type: e.target.value as any })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="immediate">Immediate</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>
            {formData.schedule_type === 'scheduled' && (
              <div>
                <label className="block text-sm font-medium mb-1">Scheduled At</label>
                <input
                  type="datetime-local"
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Priority (1-10)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Job
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function JobDetailsModal({ job, onClose }: { job: BatchJob; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Job Details</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Job ID</label>
              <p className="font-mono text-sm">{job.id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Name</label>
              <p>{job.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Type</label>
              <p>{jobTypeLabels[job.type]}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors[job.status]}`}
              >
                {statusIcons[job.status]}
                {job.status}
              </span>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Progress</label>
              <div>
                {getProgressBar(job)}
                <p className="text-sm mt-1">
                  {job.processed_items} / {job.total_items} items
                </p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Priority</label>
              <p>{job.priority}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Created At</label>
              <p>{new Date(job.created_at).toLocaleString()}</p>
            </div>
            {job.started_at && (
              <div>
                <label className="text-sm font-medium text-gray-500">Started At</label>
                <p>{new Date(job.started_at).toLocaleString()}</p>
              </div>
            )}
            {job.completed_at && (
              <div>
                <label className="text-sm font-medium text-gray-500">Completed At</label>
                <p>{new Date(job.completed_at).toLocaleString()}</p>
              </div>
            )}
          </div>
          {job.error_message && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-medium text-red-800 mb-2">Error Message</h3>
              <p className="text-sm text-red-600">{job.error_message}</p>
            </div>
          )}
          {job.config && Object.keys(job.config).length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium mb-2">Configuration</h3>
              <pre className="text-sm overflow-x-auto">{JSON.stringify(job.config, null, 2)}</pre>
            </div>
          )}
        </div>
        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function getProgressBar(job: BatchJob) {
  const progress = job.progress || 0
  const color =
    job.status === 'failed'
      ? 'bg-red-500'
      : job.status === 'completed'
        ? 'bg-green-500'
        : 'bg-blue-500'

  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className={`${color} h-2 rounded-full transition-all duration-300`}
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
