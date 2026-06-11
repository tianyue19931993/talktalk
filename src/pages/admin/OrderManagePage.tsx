import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Receipt, Search, CheckCircle } from 'lucide-react'
import { authedRequest, adminConfirmOrder } from '../../lib/supabase-auth'
import { useAuth } from '../../stores/authStore'
import { Pagination } from '../../components/ui/Pagination'

const PAGE_SIZE = 20

interface OrderRow {
  id: string
  orderNo: string
  email: string
  amount: number
  status: string
  paidAt: string | null
  createdAt: string
  userId: string
  planId: string
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: '待支付', color: 'bg-yellow-50 text-yellow-700' },
  paid: { label: '已支付', color: 'bg-green-50 text-green-700' },
  cancelled: { label: '已取消', color: 'bg-gray-50 text-gray-500' },
  refunded: { label: '已退款', color: 'bg-red-50 text-red-600' },
}

export default function OrderManagePage() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [rows, setRows] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [confirming, setConfirming] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!isAdmin) { navigate('/admin/lessons'); return }
    loadData()
  }, [isAdmin])

  async function loadData() {
    setLoading(true)

    // 获取所有 orders + 关联的 user email
    const { data: orders } = await authedRequest<any[]>('/orders?order=created_at.desc&limit=100')
    const { data: profiles } = await authedRequest<any[]>('/profiles?select=id,email')

    const emailMap = new Map<string, string>()
    if (profiles) {
      profiles.forEach((p: any) => emailMap.set(p.id, p.email || ''))
    }

    setRows(
      (orders || []).map((o: any) => ({
        id: o.id,
        orderNo: o.order_no,
        userId: o.user_id,
      planId: o.plan_id,
      email: emailMap.get(o.user_id) || o.user_id.slice(0, 8),
        amount: Number(o.amount),
        status: o.status,
        paidAt: o.paid_at,
        createdAt: o.created_at,
      }))
    )
    setLoading(false)
  }

  const filtered = useMemo(() => {
    const result = search
      ? rows.filter((r) => r.orderNo.includes(search) || r.email.toLowerCase().includes(search.toLowerCase()))
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
          <Receipt className="w-5 h-5 text-[var(--color-ink)]" />
          <h1 className="text-lg font-semibold text-[var(--color-ink)]">订单管理</h1>
          <span className="text-xs text-[var(--color-mute)] bg-[var(--color-canvas-soft)] px-2 py-0.5 rounded-full">{filtered.length} 条</span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-mute)]" />
          <input
            placeholder="搜索订单号或邮箱..."
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
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">订单号</th>
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">用户</th>
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">金额</th>
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">状态</th>
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">支付时间</th>
              <th className="text-right text-xs font-medium text-[var(--color-mute)] px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-sm text-[var(--color-mute)]">暂无订单数据</td></tr>
            ) : (
              paginated.map((r) => {
                const si = STATUS_LABEL[r.status] || { label: r.status, color: 'bg-gray-50 text-gray-500' }
                return (
                  <tr key={r.id} className="border-b border-[var(--color-hairline)] hover:bg-[var(--color-canvas-soft)] transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-[var(--color-mute)]">{r.orderNo}</td>
                    <td className="px-4 py-3 text-sm text-[var(--color-ink)]">{r.email}</td>
                    <td className="px-4 py-3 text-sm text-[var(--color-ink)] font-medium">¥{r.amount}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${si.color}`}>{si.label}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-mute)]">
                      {r.paidAt ? new Date(r.paidAt).toLocaleDateString('zh-CN') : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.status === 'pending' && (
                        <button
                          onClick={async () => {
                            setConfirming(r.id)
                            await adminConfirmOrder(r.id, r.userId, r.planId)
                            setConfirming(null)
                            loadData()
                          }}
                          disabled={confirming === r.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 rounded-full hover:bg-green-100 transition-colors cursor-pointer disabled:opacity-40"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          {confirming === r.id ? '确认中...' : '确认支付'}
                        </button>
                      )}
                    </td>
                  </tr>
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
