import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Sparkles, Send, BookOpen, Loader2, Check, Play } from 'lucide-react'
import { useAuth } from '../../stores/authStore'
import { createUserQuestion, getMyQuestions, getQuestionDemos } from '../../lib/user-questions'
import type { UserQuestion, QuestionDemo } from '../../types/auth'

export default function HomePage() {
  const navigate = useNavigate()
  const { isLoggedIn } = useAuth()
  const [questionText, setQuestionText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [latestQuestion, setLatestQuestion] = useState<UserQuestion | null>(null)
  const [latestDemos, setLatestDemos] = useState<QuestionDemo[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isLoggedIn) {
      getMyQuestions().then(async (list) => {
        if (list.length > 0) {
          setLatestQuestion(list[0])
          const demos = await getQuestionDemos(list[0].id)
          setLatestDemos(demos)
        }
      })
    }
  }, [isLoggedIn, submitted])

  const handleSubmit = async () => {
    if (!questionText.trim()) return

    if (!isLoggedIn) {
      navigate('/login?redirect=/')
      return
    }

    setSubmitting(true)
    try {
      await createUserQuestion(questionText.trim())
      setSubmitted(true)
      setQuestionText('')
      setTimeout(() => setSubmitted(false), 3000)
    } catch {
      alert('提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-canvas-soft)] px-5 pt-6">
      {/* Logo */}
      <div className="mb-6">
        <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-gradient-end)] bg-clip-text text-transparent">
          TalkTalk
        </span>
      </div>

      {/* Search Bar — 进题库 */}
      <div
        className="flex items-center gap-2.5 h-12 px-5 bg-[var(--color-canvas)] border border-[var(--color-hairline)] rounded-full shadow-[var(--shadow-l2)] cursor-pointer mb-7 hover:shadow-[var(--shadow-l3)] hover:border-[var(--color-mute)] transition-all duration-200"
        onClick={() => navigate('/lessons')}
      >
        <Search className="w-4 h-4 text-[var(--color-mute)] shrink-0" />
        <span className="text-sm text-[var(--color-mute)]">搜索题目、题型、知识点…</span>
      </div>

      {/* 生成题目演示动画板块 */}
      <div className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-l2)] p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--color-gradient-start)] to-[var(--color-gradient-end)] shadow-[0_2px_8px_rgba(121,40,202,0.2)]">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-base font-semibold text-[var(--color-ink)]">生成题目演示动画</h2>
        </div>

        <p className="text-xs text-[var(--color-mute)] mb-3">
          录入题目文字，TalkTalk 将为您生成互动演示动画
        </p>

        <div className="flex flex-col gap-2">
          <textarea
            ref={textareaRef}
            placeholder="在此输入题目文字…"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            rows={4}
            className="w-full px-4 py-2.5 text-sm bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-md)]
              text-[var(--color-ink)] placeholder:text-[var(--color-mute)]
              focus:outline-none focus:border-[var(--color-link)] focus:ring-2 focus:ring-[var(--color-link-bg-soft)]
              transition-all resize-y"
          />

          <div className="flex items-center justify-end">
            {submitted ? (
              <span className="inline-flex items-center gap-1 px-4 h-9 text-sm font-medium text-green-700 bg-green-50 rounded-full">
                <Check className="w-4 h-4" />
                已保存
              </span>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!questionText.trim() || submitting}
                className="inline-flex items-center gap-1.5 px-5 h-9 text-sm font-medium text-white rounded-full
                  bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-highlight-pink)]
                  shadow-[0_1px_8px_rgba(121,40,202,0.2)]
                  hover:shadow-[0_2px_16px_rgba(121,40,202,0.3)] hover:scale-[1.02] active:scale-[0.98]
                  disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {submitting ? '保存中...' : '立即生成'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 最近生成的互动 — 未登录时不显示 */}
      {isLoggedIn && latestQuestion && (
        <div className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-l2)] p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-[var(--color-link)]" />
            <span className="text-xs font-medium text-[var(--color-body)]">最近生成的互动</span>
          </div>
          <p className="text-sm text-[var(--color-ink)] leading-relaxed line-clamp-2 whitespace-pre-wrap mb-3">
            {latestQuestion.questionText}
          </p>
          {latestDemos.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--color-hairline)]">
              {latestDemos.map((demo) => (
                <button
                  key={demo.id}
                  onClick={() => navigate(`/my/demo/${demo.id}`)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium
                    text-[var(--color-link)] bg-[var(--color-link-bg-soft)]
                    rounded-full hover:bg-blue-100 hover:scale-[1.02] active:scale-[0.98]
                    transition-all duration-200 cursor-pointer"
                >
                  <Play className="w-3 h-3" />
                  查看 {demo.title || '演示'}
                </button>
              ))}
            </div>
          ) : (
            <div className="pt-2 border-t border-[var(--color-hairline)]">
              <span className="text-[10px] text-[var(--color-mute)]">暂未生成</span>
            </div>
          )}
        </div>
      )}

      {/* 我的互动演示入口 */}
      <button
        onClick={() => navigate('/my/questions')}
        className="inline-flex items-center justify-center gap-2 w-full h-12 text-sm font-medium text-white rounded-full
          bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-highlight-pink)]
          shadow-[0_1px_8px_rgba(121,40,202,0.2)]
          hover:shadow-[0_2px_16px_rgba(121,40,202,0.3)] hover:scale-[1.02] active:scale-[0.98]
          transition-all duration-200 cursor-pointer"
      >
        <BookOpen className="w-4 h-4" />
        我的互动演示
      </button>
    </div>
  )
}
