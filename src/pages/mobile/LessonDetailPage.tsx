import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft, Lock, Crown } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { getQuestions } from '../../stores/appStore'
import { useAuth } from '../../stores/authStore'
import { canViewDemo } from '../../lib/supabase-auth'

export default function LessonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { subscription, isLoggedIn, isLoading } = useAuth()

  const questions = getQuestions()
  const question = questions.find((q) => q.id === id)

  const hasDemoAccess = canViewDemo(subscription) && isLoggedIn

  // 认证加载中 → 不渲染，避免订阅状态还没加载出来就显示锁定状态
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-canvas-soft)]">
        <div className="text-sm text-[var(--color-mute)]">加载中...</div>
      </div>
    )
  }

  if (!question) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-[var(--color-link)] hover:opacity-80 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
        <div className="flex flex-col items-center justify-center py-20 text-[var(--color-mute)]">
          <p className="text-base font-medium">题目未找到</p>
          <p className="text-sm mt-1">该题目可能已被删除或链接有误</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-8">
      {/* Fixed back button */}
      <button
        onClick={() => navigate(-1)}
        className="sticky top-0 z-10 inline-flex items-center gap-1 text-sm text-[var(--color-link)] hover:opacity-80 cursor-pointer bg-[var(--color-canvas-soft)] py-2"
      >
        <ArrowLeft className="w-4 h-4" />
        返回
      </button>

      {/* Basic Info */}
      <section>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-mute)] mb-2">
          <span>{question.grade}</span>
          <span className="w-1 h-1 rounded-full bg-[var(--color-hairline)]" />
          <span>{question.typeName}</span>
        </div>
        {question.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {question.tags.map((tag) => (
              <Badge key={tag} className="!bg-yellow-50 !text-yellow-600">{tag}</Badge>
            ))}
          </div>
        )}
      </section>

      {/* Original Question */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-3">原题</h2>
        <div className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-l2)] p-5 border border-[var(--color-hairline)]">
          <p className="text-sm text-[var(--color-body)] leading-relaxed whitespace-pre-wrap">{question.question}</p>
        </div>
      </section>

      {/* HTML Interactive Demo — 需要权限 */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-3">互动演示</h2>
        {hasDemoAccess ? (
          // 有权限 → 显示演示按钮
          question.htmlDemos && question.htmlDemos.length > 0 ? (
            <div className="flex flex-col gap-3">
              {question.htmlDemos.map((_demo, i) => (
                <button
                  key={i}
                  onClick={() => navigate(`/demo/${question.id}/${i}`)}
                  className="w-full py-3 px-5 bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-highlight-pink)] text-white text-sm font-medium rounded-full shadow-[0_2px_12px_rgba(121,40,202,0.2)] hover:shadow-[0_4px_20px_rgba(121,40,202,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer"
                >
                  查看演示动画
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] p-5 border border-dashed border-[var(--color-hairline)]">
              <p className="text-sm text-[var(--color-mute)] text-center">暂无演示动画</p>
            </div>
          )
        ) : (
          // 无权限 → 显示锁定状态
          <div className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] p-6 border border-[var(--color-hairline)] text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--color-canvas-soft-2)] flex items-center justify-center">
              <Lock className="w-6 h-6 text-[var(--color-mute)]" />
            </div>
            <p className="text-sm font-medium text-[var(--color-ink)] mb-1">互动演示已锁定</p>
            <p className="text-xs text-[var(--color-mute)] mb-4">开通会员后即可查看全部互动演示</p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(isLoggedIn ? '/subscribe' : '/login')}
            >
              <Crown className="w-4 h-4" />
              {isLoggedIn ? '开通会员' : '登录开通'}
            </Button>
          </div>
        )}
      </section>

      {/* Text Explanation (Markdown) — 所有人可看 */}
      {question.content?.markdown && (
        <section className="relative">
          <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-3">讲解</h2>
          <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-l2)] p-5 border border-[var(--color-hairline)] overflow-hidden relative">
            {/* Brand gradient accent bar at top */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--color-gradient-start)] via-[var(--color-highlight-pink)] to-[var(--color-cyan)] rounded-t-[var(--radius-2xl)]" />
            <div className="prose prose-sm max-w-none prose-headings:text-[var(--color-ink)] prose-headings:font-semibold prose-p:text-[var(--color-body)] prose-p:leading-relaxed prose-code:text-[var(--color-gradient-start)] prose-code:bg-[var(--color-canvas-soft)] prose-code:px-1 prose-code:rounded prose-pre:bg-[var(--color-canvas-soft-2)] prose-pre:rounded-[var(--radius-md)] prose-pre:border prose-pre:border-[var(--color-hairline)] mt-3">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {question.content.markdown}
              </ReactMarkdown>
            </div>
          </div>
        </section>
      )}

    </div>
  )
}
