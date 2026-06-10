import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Receipt } from 'lucide-react'
import { getOrders } from '../../lib/supabase-auth'
import { useAuth } from '../../stores/authStore'
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

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login')
      return
    }
    getOrders().then((r) => {
      if (r.data) setOrders(r.data)
      setLoading(false)
    })
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
                  <span className="text-xs text-[var(--color-mute)]">
                    {new Date(order.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
