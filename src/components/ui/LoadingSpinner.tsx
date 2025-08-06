import React from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  message?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className = '',
  message
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-4 border-gray-200 border-t-blue-600`}
        role="status"
        aria-label="Loading"
      >
        <span className="sr-only">Loading...</span>
      </div>
      {message && (
        <p className="mt-4 text-sm text-gray-600 animate-pulse">{message}</p>
      )}
    </div>
  )
}

export const PageLoader: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <LoadingSpinner size="lg" message={message} />
    </div>
  )
}

export const ComponentLoader: React.FC<{ message?: string }> = ({ message }) => {
  return (
    <div className="p-8 flex items-center justify-center">
      <LoadingSpinner size="md" message={message} />
    </div>
  )
}