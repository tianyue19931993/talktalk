import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getQuestions } from '../../stores/appStore'

export default function DemoPage() {
  const { lessonId, demoId } = useParams<{ lessonId: string; demoId: string }>()
  const navigate = useNavigate()

  const questions = getQuestions()
  const question = questions.find((q) => q.id === lessonId)

  const demoIndex = demoId ? parseInt(demoId, 10) : -1
  const demo = question?.htmlDemos?.[demoIndex]

  if (!demo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-canvas-soft)] p-4">
        <button
          onClick={() => navigate(-1)}
          className="self-start inline-flex items-center gap-1 text-sm text-[var(--color-link)] hover:opacity-80 cursor-pointer mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
        <div className="flex flex-col items-center gap-2 text-[var(--color-mute)]">
          <p className="text-base font-medium">演示未找到</p>
          <p className="text-sm">该演示内容可能已被移除</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Top bar with back button */}
      <div className="flex items-center h-12 px-4 border-b border-[var(--color-hairline)] bg-[var(--color-canvas)] shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-[var(--color-link)] hover:opacity-80 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
        <span className="ml-3 text-sm font-medium text-[var(--color-body)] truncate">
          {demo.title}
        </span>
      </div>

      {/* IFrame content */}
      <div className="flex-1 relative">
        <iframe
          src={demo.url}
          title={demo.title}
          className="absolute inset-0 w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms"
          allowFullScreen
        />
      </div>
    </div>
  )
}
