import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Sparkles, Lock } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { getPlans, createOrder, createSubscription } from '../../lib/supabase-auth'
import { refreshUserData, useAuth } from '../../stores/authStore'
import type { Plan } from '../../types/auth'

export default function SubscribePage() {
  const navigate = useNavigate()
  const { user, subscription, isLoggedIn } = useAuth()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(false)
  const [paying, setPaying] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    getPlans().then((r) => {
      if (r.data) setPlans(r.data)
    })
  }, [])

  const handleSubscribe = async (plan: Plan) => {
    if (!isLoggedIn) {
      navigate('/login')
      return
    }

    if (plan.price === 0) {
      // 免费套餐（预留），直接激活
      setPaying(true)
      await createSubscription(user!.id, plan.id)
      await refreshUserData()
      setSuccess(true)
      setPaying(false)
      return
    }

    // V1 简化流程：下单即自动激活（未来接入真实支付后再改为 pending→回调→paid）
    setPaying(true)
    try {
      const { data: order, error: orderError } = await createOrder(plan.id, plan.price)
      if (orderError || !order) {
        alert('下单失败：' + orderError)
        return
      }

      await createSubscription(user!.id, plan.id)
      await refreshUserData()
      setSuccess(true)
    } catch (e: any) {
      alert('支付失败：' + e.message)
    } finally {
      setPaying(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col min-h-screen bg-[var(--color-canvas-soft)] px-6 pt-20">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-[var(--color-ink)] mb-2">开通成功！</h2>
          <p className="text-sm text-[var(--color-body)] mb-8">您现在可以解锁互动演示了</p>
          <Button variant="primary" onClick={() => navigate('/lessons')}>
            开始学习
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-canvas-soft)]">
      {/* Header */}
      <div className="bg-[var(--color-canvas)] px-6 pt-6 pb-8">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-[var(--color-body)] hover:text-[var(--color-ink)] mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>

        <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-gradient-end)] bg-clip-text text-transparent">
          TalkTalk
        </span>
        <h1 className="text-xl font-semibold text-[var(--color-ink)] mt-3">选择会员套餐</h1>
        <p className="text-sm text-[var(--color-mute)] mt-1">解锁全部学习资源</p>

        {subscription && (
          <div className="mt-4 p-3 bg-[var(--color-link-bg-soft)] rounded-[var(--radius-md)] text-sm">
            <span className="text-[var(--color-link)] font-medium">当前订阅：{subscription.planName}</span>
            {subscription.expireAt && (
              <span className="text-[var(--color-mute)] ml-2">
                到期 {new Date(subscription.expireAt).toLocaleDateString('zh-CN')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Plan cards */}
      <div className="flex-1 px-6 pt-6 pb-8 space-y-4">
        {plans.map((plan) => {
          const isCurrent = subscription?.planId === plan.id

          return (
            <div
              key={plan.id}
              className={`bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-l2)] p-6 border-2 transition-all ${
                isCurrent
                  ? 'border-[var(--color-link)] shadow-[var(--shadow-l3)]'
                  : 'border-transparent'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {plan.code === 'basic' ? (
                    <Lock className="w-5 h-5 text-[var(--color-link)]" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-[var(--color-violet)]" />
                  )}
                  <h2 className="text-base font-semibold text-[var(--color-ink)]">{plan.name}</h2>
                </div>
                {isCurrent && (
                  <span className="text-xs px-2 py-0.5 bg-[var(--color-link-bg-soft)] text-[var(--color-link)] rounded-full font-medium">
                    当前订阅
                  </span>
                )}
              </div>

              {/* Price */}
              <div className="mb-4">
                <span className="text-3xl font-bold text-[var(--color-ink)]">
                  ¥{plan.price === 0 ? '?' : plan.price}
                </span>
                {plan.price > 0 && (
                  <span className="text-sm text-[var(--color-mute)] ml-1">/月</span>
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-[var(--color-body)] mb-4">{plan.description}</p>

              {/* Permissions */}
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm text-[var(--color-body)]">
                  <Check className="w-4 h-4 text-green-500 shrink-0" />
                  <span>查看全部互动演示</span>
                </div>
                {plan.permissions.includes('create_demo') && (
                  <div className="flex items-center gap-2 text-sm text-[var(--color-body)]">
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                    <span>创建互动演示（即将开放）</span>
                  </div>
                )}
              </div>

              {/* Action */}
              <Button
                variant={isCurrent ? 'secondary' : 'primary'}
                size="lg"
                className="w-full"
                onClick={() => handleSubscribe(plan)}
                loading={paying && !isCurrent}
                disabled={isCurrent}
              >
                {isCurrent ? '已订阅' : plan.price === 0 ? '价格待定' : '立即开通'}
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
