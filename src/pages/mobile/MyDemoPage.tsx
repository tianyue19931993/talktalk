import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock, Crown, Download } from 'lucide-react'
import { useAuth } from '../../stores/authStore'
import { authedRequest, canViewDemo } from '../../lib/supabase-auth'
import { downloadQuestionDemo, getUserQuestion } from '../../lib/user-questions'
import { Button } from '../../components/ui/Button'
import BasicPage from '../../components/preview/BasicPage'
import type { UserQuestion } from '../../types/auth'

type DemoRow = {
  question_id?: string
}

export default function MyDemoPage() {
  const { demoId } = useParams<{ demoId: string }>()
  const navigate = useNavigate()
  const { user, subscription, isLoggedIn, isLoading } = useAuth()
  const [question, setQuestion] = useState<UserQuestion | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'notfound' | 'locked'>('loading')

  useEffect(() => {
    let cancelled = false

    const loadDemo = async () => {
      if (!demoId || isLoading) return

      setLoadState('loading')
      setQuestion(null)

      const { data } = await authedRequest<DemoRow[]>(`/question_demos?id=eq.${demoId}`)
      const demo = data?.[0]
      if (!demo?.question_id || cancelled) {
        if (!cancelled) setLoadState('notfound')
        return
      }

      const question = await getUserQuestion(demo.question_id)
      const isOwner = !!user && question?.userId === user.id
      const hasAccess = isLoggedIn && (isOwner || canViewDemo(subscription))
      if (!cancelled && !hasAccess) {
        setLoadState('locked')
        return
      }
      if (!question || cancelled) {
        if (!cancelled) setLoadState('notfound')
        return
      }
      setQuestion(question)
      if (!cancelled) setLoadState('ready')
    }

    void loadDemo()
    return () => { cancelled = true }
  }, [demoId, isLoading, isLoggedIn, subscription, user])

  const handleDownload = async () => {
    if (!demoId) return
    try {
      await downloadQuestionDemo(demoId, '演示.html')
    } catch {
      alert('下载失败')
    }
  }

  // 权限不足 → 锁定页面
  if (!isLoading && loadState === 'locked') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-canvas-soft)] p-4">
        <button
          onClick={() => navigate(-1)}
          className="self-start mb-4 inline-flex items-center gap-1 text-sm text-[var(--color-link)] hover:opacity-80 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
        <div className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] p-8 border border-[var(--color-hairline)] text-center max-w-sm">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-[var(--color-canvas-soft-2)] flex items-center justify-center">
            <Lock className="w-7 h-7 text-[var(--color-mute)]" />
          </div>
          <p className="text-base font-semibold text-[var(--color-ink)] mb-1">互动演示已锁定</p>
          <p className="text-sm text-[var(--color-mute)] mb-5">开通会员后即可查看全部互动演示</p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(isLoggedIn ? '/subscribe' : '/login')}
          >
            <Crown className="w-4 h-4" />
            {isLoggedIn ? '开通会员' : '登录开通'}
          </Button>
        </div>
      </div>
    )
  }

  if (loadState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--color-canvas-soft)]">
        <p className="text-sm text-[var(--color-mute)]">加载中...</p>
      </div>
    )
  }

  if (loadState === 'notfound') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-canvas-soft)] p-4">
        <div className="flex flex-col items-center gap-2 text-[var(--color-mute)]">
          <p className="text-base font-medium">演示未找到</p>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-[var(--color-link)] hover:underline cursor-pointer"
          >
            返回
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-full bg-white relative">
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-50 flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        返回
      </button>
      {demoId && loadState === 'ready' && (
        <button
          onClick={handleDownload}
          className="absolute top-4 right-4 z-50 inline-flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          下载
        </button>
      )}

      {question && loadState === 'ready' && (
        <div className="h-full overflow-y-auto bg-[#FAFAFA] px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <BasicPage
              question_text={question.questionText}
              math_analysis_json={question.mathAnalysisJson}
              logic_analysis_json={question.logicAnalysisJson}
              tutor_analysis_json={question.tutorAnalysisJson}
              component_analysis_json={question.componentAnalysisJson}
            />
          </div>
        </div>
      )}
    </div>
  )
}
