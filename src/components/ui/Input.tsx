import { InputHTMLAttributes, forwardRef } from 'react'
import { Search, X } from 'lucide-react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-medium text-[var(--color-body)]">{label}</label>
        )}
        <input
          ref={ref}
          className={`h-10 px-3 text-sm bg-[var(--color-canvas)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)] 
            text-[var(--color-ink)] placeholder:text-[var(--color-mute)]
            focus:outline-none focus:border-[var(--color-ink)] focus:ring-1 focus:ring-[var(--color-ink)]
            transition-colors ${error ? 'border-[var(--color-error)]' : ''} ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-[var(--color-error)]">{error}</span>}
      </div>
    )
  }
)
Input.displayName = 'Input'

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onClear, className = '', value, ...props }, ref) => {
    return (
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-mute)]" />
        <input
          ref={ref}
          className={`h-10 w-full pl-10 pr-8 text-sm bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-sm)]
            text-[var(--color-ink)] placeholder:text-[var(--color-mute)]
            focus:outline-none focus:border-[var(--color-ink)] focus:ring-1 focus:ring-[var(--color-ink)]
            transition-colors ${className}`}
          value={value}
          {...props}
        />
        {value && onClear && (
          <button onClick={onClear} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-mute)] hover:text-[var(--color-ink)] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    )
  }
)
SearchInput.displayName = 'SearchInput'
