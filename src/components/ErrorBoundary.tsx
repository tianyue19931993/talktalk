import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--color-canvas-soft)]">
          <div className="max-w-md w-full bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-l3)] p-8 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-lg font-semibold text-[var(--color-ink)] mb-2">页面加载出错</h2>
            <p className="text-sm text-[var(--color-body)] mb-4">
              发生了意外的错误，请尝试刷新页面。
            </p>
            <details className="text-left text-xs text-[var(--color-mute)] bg-[var(--color-canvas-soft)] rounded-[var(--radius-md)] p-3 mb-6">
              <summary className="cursor-pointer font-medium">错误详情</summary>
              <pre className="mt-2 whitespace-pre-wrap break-all">{this.state.error?.message}</pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-gradient-brand text-white text-sm font-medium rounded-full shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              刷新页面
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
