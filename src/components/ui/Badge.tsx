import { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error'
  onClick?: () => void
  className?: string
}

const variantStyles = {
  default: 'bg-[var(--color-link-bg-soft)] text-[var(--color-link)]',
  primary: 'bg-gradient-brand text-white',
  success: 'bg-green-50 text-green-700',
  warning: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]',
  error: 'bg-[var(--color-error-soft)] text-[var(--color-error)]',
}

export function Badge({ children, variant = 'default', onClick, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full font-normal ${variantStyles[variant]} ${onClick ? 'cursor-pointer hover:opacity-80' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </span>
  )
}
