import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock, Crown } from 'lucide-react'
import { useAuth } from '../stores/authStore'
import { canViewDemo } from '../lib/supabase-auth'
import { Button } from '../components/ui/Button'
import ComparisonExperiment from '../components/experiments/ComparisonExperiment'
import FractionExperiment from '../components/experiments/FractionExperiment'
import AreaExperiment from '../components/experiments/AreaExperiment'

type ExperimentType = 'comparison' | 'fraction' | 'area'

interface AnalysisJson {
  type?: string
  whole?: number
  part?: number
  width?: number
  height?: number
  known_data?: unknown[]
  [key: string]: unknown
}

/**
 * 从 analysis_json 结构自动推断实验类型
 * 优先用 data.type，没有则根据字段特征判断
 */
function detectType(data: AnalysisJson): ExperimentType | null {
  if (data.type === 'comparison' || data.type === 'fraction' || data.type === 'area') {
    return data.type
  }

  // 根据字段特征推断
  if (typeof data.whole === 'number' && typeof data.part === 'number') {
    return 'fraction'
  }
  if (typeof data.width === 'number' && typeof data.height === 'number') {
    return 'area'
  }
  if (
    Array.isArray(data.known_data) &&
    data.known_data.length >= 2 &&
    typeof (data.known_data[0] as Record<string, unknown>)?.base_count === 'number'
  ) {
    return 'comparison'
  }

  return null
}

export default function ExperimentPage() {
  const { demoId } = useParams<{ demoId: string }>()
  const navigate = useNavigate()
  const { subscription, isLoggedIn, isLoading } = useAuth()
  const [analysisJson, setAnalysisJson] = useState<AnalysisJson | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'notfound'>('loading')

  const hasAccess = isLoggedIn && canViewDemo(subscription)
  const experimentType = useMemo(() => (analysisJson ? detectType(analysisJson) : null), [analysisJson])

  useEffect(() => {
    if (!demoId || !hasAccess || isLoading) return
    loadData()
  }, [demoId, hasAccess, isLoading])

  async function loadData() {
    if (!demoId) return

    try {
      const { authedRequest } = await import('../lib/supabase-auth')

      const { data: demoData } = await authedRequest<unknown[]>(`/question_demos?id=eq.${demoId}`)
      const demo = demoData?.[0] as Record<string, unknown> | undefined
      if (!demo) {
        setLoadState('notfound')
        return
      }

      const questionId = demo.question_id as string | undefined
      if (!questionId) {
        setLoadState('notfound')
        return
      }

      const { data: questionData } = await authedRequest<unknown[]>(`/user_questions?id=eq.${questionId}`)
      const question = questionData?.[0] as Record<string, unknown> | undefined
      if (!question) {
        setLoadState('notfound')
        return
      }

      const json = question.analysis_json as AnalysisJson | undefined
      if (!json || typeof json !== 'object') {
        setLoadState('notfound')
        return
      }

      setAnalysisJson(json)
      setLoadState('ready')
    } catch {
      setLoadState('notfound')
    }
  }

  // 权限不足
  if (!isLoading && !hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <button onClick={() => navigate(-1)} className="self-start mb-4 inline-flex items-center gap-1 text-sm text-blue-600 hover:opacity-80 cursor-pointer">
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
        <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center max-w-sm shadow-sm">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gray-50 flex items-center justify-center">
            <Lock className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-base font-semibold text-gray-900 mb-1">互动实验已锁定</p>
          <p className="text-sm text-gray-500 mb-5">开通会员后即可查看全部互动实验</p>
          <Button variant="primary" size="sm" onClick={() => navigate(isLoggedIn ? '/subscribe' : '/login')}>
            <Crown className="w-4 h-4" />
            {isLoggedIn ? '开通会员' : '登录开通'}
          </Button>
        </div>
      </div>
    )
  }

  if (loadState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-sm text-gray-400">加载中...</p>
      </div>
    )
  }

  if (loadState === 'notfound' || !analysisJson) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="flex flex-col items-center gap-2 text-gray-400">
          <p className="text-base font-medium">实验未找到</p>
          <button onClick={() => navigate(-1)} className="text-sm text-blue-600 hover:underline cursor-pointer">返回</button>
        </div>
      </div>
    )
  }

  const renderComponent = () => {
    switch (experimentType) {
      case 'comparison':
        return <ComparisonExperiment data={analysisJson as never} />
      case 'fraction':
        return <FractionExperiment data={analysisJson as never} />
      case 'area':
        return <AreaExperiment data={analysisJson as never} />
      default:
        return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-400">
            <p className="text-sm">无法自动识别实验类型</p>
            <p className="text-xs mt-1">
              {analysisJson?.type
                ? `未知类型：${analysisJson.type}`
                : 'analysis_json 缺少 type 字段且无法通过结构推断'}
            </p>
            <details className="mt-4 max-w-md text-left">
              <summary className="text-xs text-blue-500 cursor-pointer">查看原始数据</summary>
              <pre className="mt-2 text-[10px] bg-gray-100 p-3 rounded-xl overflow-auto max-h-60">
                {JSON.stringify(analysisJson, null, 2)}
              </pre>
            </details>
          </div>
        )
    }
  }

  const typeLabel = experimentType === 'comparison' ? '比较关系'
    : experimentType === 'fraction' ? '分数模型'
    : experimentType === 'area' ? '面积模型'
    : ''

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-xl mx-auto flex items-center h-12 px-4">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
          {typeLabel && (
            <span className="ml-auto text-[10px] text-gray-400 uppercase tracking-wider font-medium">{typeLabel}</span>
          )}
        </div>
      </div>
      {renderComponent()}
    </div>
  )
}
