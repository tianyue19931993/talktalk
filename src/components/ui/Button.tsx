import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'primary-sm' | 'secondary-sm'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variantStyles: Record<Variant, string> = {
  'primary':
    'bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-[var(--radius-pill)] hover:opacity-90',
  'secondary':
    'bg-[var(--color-canvas)] text-[var(--color-ink)] rounded-[var(--radius-pill)] border border-[var(--color-hairline)] hover:bg-[var(--color-canvas-soft)]',
  'ghost':
    'bg-transparent text-[var(--color-ink)] rounded-[var(--radius-sm)] hover:bg-[var(--color-canvas-soft-2)]',
  'danger':
    'bg-[var(--color-error)] text-white rounded-sm hover:opacity-90',
  'primary-sm':
    'bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-[var(--radius-sm)] hover:opacity-90',
  'secondary-sm':
    'bg-[var(--color-canvas)] text-[var(--color-ink)] rounded-[var(--radius-sm)] border border-[var(--color-hairline)] hover:bg-[var(--color-canvas-soft)]',
}

const sizeStyles: Record<Size, string> = {
  sm: 'px-3 h-7 text-sm font-medium',
  md: 'px-4 h-9 text-sm font-medium',
  lg: 'px-6 h-11 text-base font-medium',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className = '', children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-2 cursor-pointer transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
