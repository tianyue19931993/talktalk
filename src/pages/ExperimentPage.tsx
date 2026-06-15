import { useState, useEffect } from 'react'
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
  type?: ExperimentType
  [key: string]: unknown
}

export default function ExperimentPage() {
  const { demoId } = useParams<{ demoId: string }>()
  const navigate = useNavigate()
  const { subscription, isLoggedIn, isLoading } = useAuth()
  const [analysisJson, setAnalysisJson] = useState<AnalysisJson | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const hasAccess = isLoggedIn && canViewDemo(subscription)

  useEffect(() => {
    if (!demoId || !hasAccess || isLoading) return
    loadData()
  }, [demoId, hasAccess, isLoading])

  async function loadData() {
    if (!demoId) return
    setLoading(true)

    try {
      const { authedRequest } = await import('../lib/supabase-auth')

      // 1. 读取 question_demos 记录，获取 question_id
      const { data: demoData } = await authedRequest<any[]>(`/question_demos?id=eq.${demoId}`)
      const demo = demoData?.[0]
      if (!demo) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const questionId = demo.question_id
      if (!questionId) {
        setNotFound(true)
        setLoading(false)
        return
      }

      // 2. 读取 user_questions 记录，获取 analysis_json
      const { data: questionData } = await authedRequest<any[]>(`/user_questions?id=eq.${questionId}`)
      const question = questionData?.[0]
      if (!question) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const json = question.analysis_json
      if (!json || typeof json !== 'object') {
        setNotFound(true)
        setLoading(false)
        return
      }

      setAnalysisJson(json as AnalysisJson)
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  // 权限不足
  if (!isLoading && !hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <button
          onClick={() => navigate(-1)}
          className="self-start mb-4 inline-flex items-center gap-1 text-sm text-blue-600 hover:opacity-80 cursor-pointer"
        >
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-sm text-gray-400">加载中...</p>
      </div>
    )
  }

  if (notFound || !analysisJson) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="flex flex-col items-center gap-2 text-gray-400">
          <p className="text-base font-medium">实验未找到</p>
          <button onClick={() => navigate(-1)} className="text-sm text-blue-600 hover:underline cursor-pointer">
            返回
          </button>
        </div>
      </div>
    )
  }

  const renderComponent = () => {
    switch (analysisJson.type) {
      case 'comparison':
        return <ComparisonExperiment data={analysisJson as any} />
      case 'fraction':
        return <FractionExperiment data={analysisJson as any} />
      case 'area':
        return <AreaExperiment data={analysisJson as any} />
      default:
        return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-400">
            <p className="text-sm">未知的实验类型：{analysisJson.type || '未指定'}</p>
            <p className="text-xs mt-1">管理员需要为此题型配置实验组件</p>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header bar */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-xl mx-auto flex items-center h-12 px-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
          <span className="ml-auto text-[10px] text-gray-400 uppercase tracking-wider font-medium">
            {analysisJson.type === 'comparison' && '比较关系'}
            {analysisJson.type === 'fraction' && '分数模型'}
            {analysisJson.type === 'area' && '面积模型'}
          </span>
        </div>
      </div>

      {/* Component */}
      {renderComponent()}
    </div>
  )
}
