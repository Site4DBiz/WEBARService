'use client'

import { useState } from 'react'
import { Download, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react'

interface ExportButtonProps {
  data: any
  onExport?: (format: 'csv' | 'pdf') => void
}

export default function ExportButton({ data, onExport }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      // Flatten the data structure for CSV export
      const csvData = flattenData(data)
      const csv = convertToCSV(csvData)
      
      // Create blob and download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      link.setAttribute('href', url)
      link.setAttribute('download', `analytics-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      if (onExport) onExport('csv')
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setExporting(false)
      setIsOpen(false)
    }
  }

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      // For PDF export, we would typically use a library like jsPDF
      // For now, we'll create a formatted HTML and open in new window for printing
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        alert('Please allow popups to export as PDF')
        return
      }

      const htmlContent = generatePDFHTML(data)
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      
      // Trigger print dialog after content loads
      printWindow.onload = () => {
        printWindow.print()
      }
      
      if (onExport) onExport('pdf')
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setExporting(false)
      setIsOpen(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={!data || exporting}
        className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="h-4 w-4" />
        <span>Export</span>
        <ChevronDown className="h-4 w-4" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          ></div>
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <button
              onClick={handleExportCSV}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 transition-colors"
              disabled={exporting}
            >
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              <span>Export as CSV</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 transition-colors border-t border-gray-100"
              disabled={exporting}
            >
              <FileText className="h-4 w-4 text-red-600" />
              <span>Export as PDF</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function flattenData(data: any): any[] {
  if (!data) return []
  
  const flattened: any[] = []
  
  // Overview metrics
  if (data.overview) {
    flattened.push({
      category: 'Overview',
      metric: 'Total Users',
      value: data.overview.users?.total || 0
    })
    flattened.push({
      category: 'Overview',
      metric: 'New Users',
      value: data.overview.users?.new || 0
    })
    flattened.push({
      category: 'Overview',
      metric: 'Active Users',
      value: data.overview.users?.active || 0
    })
    flattened.push({
      category: 'Overview',
      metric: 'Total Contents',
      value: data.overview.contents?.total || 0
    })
    flattened.push({
      category: 'Overview',
      metric: 'Total Views',
      value: data.overview.views?.total || 0
    })
    flattened.push({
      category: 'Overview',
      metric: 'Total Sessions',
      value: data.overview.sessions?.total || 0
    })
  }
  
  // Time series data
  if (data.timeSeries) {
    data.timeSeries.forEach((point: any) => {
      flattened.push({
        category: 'Time Series',
        metric: 'Date',
        value: point.date,
        users: point.users,
        views: point.views,
        sessions: point.sessions,
        contents: point.contents
      })
    })
  }
  
  return flattened
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return ''
  
  const headers = Object.keys(data[0])
  const csvHeaders = headers.join(',')
  
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header]
      // Escape quotes and wrap in quotes if contains comma
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }).join(',')
  })
  
  return [csvHeaders, ...csvRows].join('\n')
}

function generatePDFHTML(data: any): string {
  const date = new Date().toLocaleDateString()
  const time = new Date().toLocaleTimeString()
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Analytics Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          color: #333;
        }
        h1 {
          color: #1e40af;
          border-bottom: 2px solid #1e40af;
          padding-bottom: 10px;
        }
        h2 {
          color: #374151;
          margin-top: 30px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f3f4f6;
          font-weight: bold;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .metric {
          display: inline-block;
          margin: 10px 20px 10px 0;
        }
        .metric-label {
          font-size: 12px;
          color: #6b7280;
        }
        .metric-value {
          font-size: 24px;
          font-weight: bold;
          color: #111827;
        }
        @media print {
          body { margin: 0; }
        }
      </style>
    </head>
    <body>
      <h1>Analytics Report</h1>
      <p>Generated on ${date} at ${time}</p>
      
      <h2>Overview Metrics</h2>
      <div>
        <div class="metric">
          <div class="metric-label">Total Users</div>
          <div class="metric-value">${data?.overview?.users?.total || 0}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Total Contents</div>
          <div class="metric-value">${data?.overview?.contents?.total || 0}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Total Views</div>
          <div class="metric-value">${data?.overview?.views?.total || 0}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Total Sessions</div>
          <div class="metric-value">${data?.overview?.sessions?.total || 0}</div>
        </div>
      </div>
      
      ${data?.timeSeries ? `
        <h2>Time Series Data</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Users</th>
              <th>Views</th>
              <th>Sessions</th>
              <th>Contents</th>
            </tr>
          </thead>
          <tbody>
            ${data.timeSeries.map((point: any) => `
              <tr>
                <td>${point.date}</td>
                <td>${point.users || 0}</td>
                <td>${point.views || 0}</td>
                <td>${point.sessions || 0}</td>
                <td>${point.contents || 0}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}
      
      ${data?.demographics?.devices ? `
        <h2>Device Distribution</h2>
        <table>
          <thead>
            <tr>
              <th>Device Type</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(data.demographics.devices.devices || {}).map(([device, percentage]) => `
              <tr>
                <td>${device}</td>
                <td>${percentage}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}
    </body>
    </html>
  `
}