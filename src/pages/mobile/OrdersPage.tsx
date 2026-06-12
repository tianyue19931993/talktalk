import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Receipt, XCircle } from 'lucide-react'
import { getOrders, authedRequest } from '../../lib/supabase-auth'
import { useAuth } from '../../stores/authStore'
import { refreshStore } from '../../stores/appStore'
import type { Order } from '../../types/auth'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待支付', color: 'text-[var(--color-warning)]' },
  paid: { label: '已支付', color: 'text-green-600' },
  cancelled: { label: '已取消', color: 'text-[var(--color-mute)]' },
  refunded: { label: '已退款', color: 'text-[var(--color-error)]' },
}

export default function OrdersPage() {
  const navigate = useNavigate()
  const { isLoggedIn } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const loadOrders = async () => {
    const r = await getOrders()
    if (r.data) setOrders(r.data)
    setLoading(false)
  }

  const handleCancel = async (orderId: string) => {
    if (!confirm('确定取消此订单？')) return
    setCancellingId(orderId)
    try {
      await authedRequest(`/orders?id=eq.${orderId}`, {
        method: 'PATCH',
        body: { status: 'cancelled' },
      })
      // 取消后刷新订阅数据
      refreshStore()
      await loadOrders()
    } catch {
      alert('取消失败，请重试')
    } finally {
      setCancellingId(null)
    }
  }

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login')
      return
    }
    loadOrders()
  }, [isLoggedIn, navigate])

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-canvas-soft)] px-5 pt-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-[var(--color-body)] hover:text-[var(--color-ink)] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
        <h1 className="text-lg font-semibold text-[var(--color-ink)]">订单记录</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-[var(--color-mute)]">加载中...</div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--color-mute)]">
          <Receipt className="w-12 h-12 mb-3" />
          <p className="text-sm font-medium">暂无订单</p>
          <p className="text-xs mt-1">购买会员后订单会显示在这里</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: 'text-[var(--color-mute)]' }
            return (
              <div
                key={order.id}
                className="bg-[var(--color-canvas)] rounded-[var(--radius-xl)] shadow-[var(--shadow-l2)] p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-[var(--color-mute)]">{order.orderNo}</span>
                  <span className={`text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--color-ink)] font-medium">¥{order.amount}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--color-mute)]">
                      {new Date(order.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                    {order.status === 'pending' && (
                      <button
                        onClick={() => handleCancel(order.id)}
                        disabled={cancellingId === order.id}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium
                          text-red-600 bg-red-50 rounded-full
                          hover:bg-red-100 disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        <XCircle className="w-3 h-3" />
                        {cancellingId === order.id ? '取消中...' : '取消订单'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
