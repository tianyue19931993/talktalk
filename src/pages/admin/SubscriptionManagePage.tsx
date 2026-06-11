import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crown, Search } from 'lucide-react'
import { authedRequest } from '../../lib/supabase-auth'
import { useAuth } from '../../stores/authStore'
import { Pagination } from '../../components/ui/Pagination'

const PAGE_SIZE = 20

interface SubRow {
  id: string
  userId: string
  email: string
  planName: string
  planCode: string
  status: string
  startAt: string
  expireAt: string | null
}

export default function SubscriptionManagePage() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [rows, setRows] = useState<SubRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!isAdmin) { navigate('/admin/lessons'); return }
    loadData()
  }, [isAdmin])

  async function loadData() {
    setLoading(true)
    const { data, error } = await authedRequest<any[]>('/active_subscriptions?order=created_at.desc')
    if (error) { setLoading(false); return }

    // 补上 user email（active_subscriptions 只有 user_id）
    const { data: profiles } = await authedRequest<any[]>('/profiles?select=id,email')
    const emailMap = new Map<string, string>()
    if (profiles) {
      profiles.forEach((p: any) => emailMap.set(p.id, p.email || ''))
    }

    setRows(
      (data || []).map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        email: emailMap.get(r.user_id) || '-',
        planName: r.plan_name,
        planCode: r.plan_code,
        status: r.status,
        startAt: r.start_at,
        expireAt: r.expire_at,
      }))
    )
    setLoading(false)
  }

  const filtered = useMemo(() => {
    const result = search
      ? rows.filter((r) => r.email.toLowerCase().includes(search.toLowerCase()) || r.planName.includes(search))
      : rows
    return result
  }, [rows, search])

  // 分页
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE)
  const safePage = Math.min(page, Math.max(1, pageCount))
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => { setPage(1) }, [search])

  if (loading) return <div className="text-center py-12 text-sm text-[var(--color-mute)]">加载中...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-[var(--color-ink)]" />
          <h1 className="text-lg font-semibold text-[var(--color-ink)]">订阅管理</h1>
          <span className="text-xs text-[var(--color-mute)] bg-[var(--color-canvas-soft)] px-2 py-0.5 rounded-full">{filtered.length} 条</span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-mute)]" />
          <input
            placeholder="搜索用户邮箱..."
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
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">用户</th>
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">套餐</th>
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">状态</th>
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">开始时间</th>
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">到期时间</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-sm text-[var(--color-mute)]">暂无订阅数据</td></tr>
            ) : (
              paginated.map((r) => (
                <tr key={r.id} className="border-b border-[var(--color-hairline)] hover:bg-[var(--color-canvas-soft)] transition-colors">
                  <td className="px-4 py-3 text-sm text-[var(--color-ink)]">{r.email}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[var(--color-link-bg-soft)] text-[var(--color-link)]">
                      <Crown className="w-3 h-3" />
                      {r.planName}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">有效</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-mute)]">
                    {new Date(r.startAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-mute)]">
                    {r.expireAt ? new Date(r.expireAt).toLocaleDateString('zh-CN') : '永久'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination current={safePage} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
    </div>
  )
}
