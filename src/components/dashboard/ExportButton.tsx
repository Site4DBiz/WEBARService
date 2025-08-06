'use client'

import { Download } from 'lucide-react'
import { useState } from 'react'

interface ExportButtonProps {
  data: any
  filename?: string
  format?: 'csv' | 'json'
  className?: string
}

export function ExportButton({
  data,
  filename = 'statistics',
  format = 'csv',
  className = '',
}: ExportButtonProps) {
  const [exporting, setExporting] = useState(false)

  const convertToCSV = (data: any[]): string => {
    if (!data || data.length === 0) return ''

    // ヘッダーを取得
    const headers = Object.keys(data[0])
    const csvHeaders = headers.join(',')

    // データ行を作成
    const csvRows = data.map((row) => {
      return headers
        .map((header) => {
          const value = row[header]
          // 値に改行やカンマが含まれる場合は引用符で囲む
          if (value === null || value === undefined) return ''
          const stringValue = String(value)
          if (
            stringValue.includes(',') ||
            stringValue.includes('\n') ||
            stringValue.includes('"')
          ) {
            return `"${stringValue.replace(/"/g, '""')}"`
          }
          return stringValue
        })
        .join(',')
    })

    return [csvHeaders, ...csvRows].join('\n')
  }

  const handleExport = () => {
    setExporting(true)

    try {
      let content: string
      let mimeType: string

      if (format === 'csv') {
        content = convertToCSV(Array.isArray(data) ? data : [data])
        mimeType = 'text/csv;charset=utf-8;'
      } else {
        content = JSON.stringify(data, null, 2)
        mimeType = 'application/json;charset=utf-8;'
      }

      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting || !data}
      className={`flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <Download size={16} className="mr-2" />
      {exporting ? 'Exporting...' : `Export ${format.toUpperCase()}`}
    </button>
  )
}
