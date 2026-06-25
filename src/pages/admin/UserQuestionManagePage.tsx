import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Search, Eye, Trash2, Plus } from 'lucide-react'
import { useAuth } from '../../stores/authStore'
import { Pagination } from '../../components/ui/Pagination'
import { getAllUserQuestions, getQuestionDemosBatch, adminUploadUserQuestionHtml, deleteQuestionDemo } from '../../lib/user-questions'
import type { UserQuestion, QuestionDemo } from '../../types/auth'

const PAGE_SIZE = 20

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '请耐心等待 1～3 分钟', color: 'bg-yellow-50 text-yellow-700' },
  completed: { label: '基础分析已完成', color: 'bg-green-50 text-green-700' },
  uploaded: { label: '已上传', color: 'bg-blue-50 text-blue-700' },
}

export default function UserQuestionManagePage() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [questions, setQuestions] = useState<UserQuestion[]>([])
  const [demosMap, setDemosMap] = useState<Record<string, QuestionDemo[]>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    if (!isAdmin) { navigate('/admin/lessons'); return }
    loadData()
  }, [isAdmin, navigate])

  async function loadData() {
    setLoading(true)
    const list = await getAllUserQuestions()
    setQuestions(list)

    // 批量加载所有题目的 demos（一次 SQL 查询代替 N 次）
    const ids = list.map((q) => q.id)
    const map = ids.length > 0 ? await getQuestionDemosBatch(ids) : {}
    setDemosMap(map)
    setLoading(false)
  }

  const handleUploadHtml = async (questionId: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.html,.htm'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        await adminUploadUserQuestionHtml(questionId, file)
        await loadData()
      } catch {
        alert('上传失败')
      }
    }
    input.click()
  }

  const handleRemoveDemo = async (demoId: string) => {
    await deleteQuestionDemo(demoId)
    await loadData()
  }

  const handlePreviewHtml = (url: string) => {
    if (url.startsWith('data:text/html')) {
      const html = decodeURIComponent(url.split(',')[1] || '')
      const win = window.open('', '_blank')
      if (win) { win.document.write(html); win.document.close() }
    } else {
      window.open(url, '_blank')
    }
  }

  const toggleExpand = (id: string | number) => {
    const sid = String(id)
    setEditingId(editingId === sid ? null : sid)
  }

  const filtered = useMemo(() => {
    const result = search
      ? questions.filter((q) => q.questionText.toLowerCase().includes(search.toLowerCase()))
      : questions
    return result
  }, [questions, search])

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE)
  const safePage = Math.min(page, Math.max(1, pageCount))
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  if (loading) return <div className="text-center py-12 text-sm text-[var(--color-mute)]">加载中...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-[var(--color-ink)]" />
          <h1 className="text-lg font-semibold text-[var(--color-ink)]">用户题目管理</h1>
          <span className="text-xs text-[var(--color-mute)] bg-[var(--color-canvas-soft)] px-2 py-0.5 rounded-full">{filtered.length} 条</span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-mute)]" />
          <input
            placeholder="搜索题目内容..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 pr-3 text-sm bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-md)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-link)]"
          />
        </div>
      </div>

      <div className="bg-[var(--color-canvas)] rounded-[var(--radius-xl)] shadow-[var(--shadow-l2)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-hairline)]">
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">题目</th>
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">状态</th>
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">演示数</th>
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">提交时间</th>
              <th className="text-right text-xs font-medium text-[var(--color-mute)] px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-sm text-[var(--color-mute)]">暂无用户题目数据</td></tr>
            ) : (
              paginated.map((q) => {
                // 状态以是否有真实演示为准（不依赖可能未及时更新的 DB status）
                const hasDemo = (demosMap[q.id] || []).length > 0
                const effectiveStatus = hasDemo ? 'completed' : q.status
                const st = STATUS_MAP[effectiveStatus] || STATUS_MAP.pending
                const isExpanded = editingId === String(q.id)
                const demos = demosMap[q.id] || []
                return (
                  <React.Fragment key={q.id}>
                    <tr className="border-b border-[var(--color-hairline)] hover:bg-[var(--color-canvas-soft)] transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm text-[var(--color-ink)] line-clamp-2 max-w-md">{q.questionText}</p>
                        <p className="text-xs text-[var(--color-mute)] font-mono mt-0.5">{q.id.slice(0, 8)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--color-mute)]">
                        {demos.length} 个
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--color-mute)]">
                        {new Date(q.createdAt).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => toggleExpand(q.id)}
                          className="p-1.5 rounded text-[var(--color-body)] hover:text-[var(--color-link)] hover:bg-[var(--color-link-bg-soft)] transition-colors cursor-pointer text-xs"
                        >
                          {isExpanded ? '收起' : '详情'}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={5} className="px-4 py-4 bg-[var(--color-canvas-soft)] border-b border-[var(--color-hairline)]">
                          <InlineDemoManager
                            demos={demos}
                            onUpload={() => handleUploadHtml(q.id)}
                            onPreview={(url) => handlePreviewHtml(url)}
                            onRemove={(demoId) => handleRemoveDemo(demoId)}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>



      <Pagination current={safePage} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
    </div>
  )
}

// ─── 行内演示管理组件 ───────────────────────

function InlineDemoManager({ demos, onUpload, onPreview, onRemove }: {
  demos: QuestionDemo[]
  onUpload: () => void
  onPreview: (url: string) => void
  onRemove: (id: string) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-[var(--color-ink)]">演示管理</h4>
        <button
          onClick={onUpload}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white rounded-full
            bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-highlight-pink)] cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          上传 HTML
        </button>
      </div>

      {demos.length === 0 ? (
        <p className="text-xs text-[var(--color-mute)] py-2">暂无演示，点击上方按钮上传</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {demos.map((demo) => (
            <div key={demo.id} className="flex items-center gap-1 px-2.5 py-1.5 bg-white rounded-[var(--radius-md)] border border-[var(--color-hairline)]">
              <span className="text-xs text-[var(--color-ink)]">{demo.title || '演示'}</span>
              <button onClick={() => onPreview(demo.htmlUrl)} className="p-0.5 rounded text-[var(--color-body)] hover:text-[var(--color-link)] cursor-pointer" title="预览">
                <Eye className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onRemove(demo.id)} className="p-0.5 rounded text-[var(--color-body)] hover:text-red-600 cursor-pointer" title="删除">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
