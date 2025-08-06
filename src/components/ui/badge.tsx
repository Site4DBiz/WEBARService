import * as React from 'react'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

function Badge({ className = '', variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-blue-100 text-blue-900 hover:bg-blue-200',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    destructive: 'bg-red-100 text-red-900 hover:bg-red-200',
    outline: 'text-gray-950 border border-gray-200',
  }

  return (
    <div
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}

export { Badge }