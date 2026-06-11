import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Sparkles, Lock, Smartphone, Download } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { getPlans, loadSession } from '../../lib/supabase-auth'
import { refreshUserData, useAuth } from '../../stores/authStore'
import type { Plan } from '../../types/auth'
import QRCode from 'qrcode'

/** 支付状态 */
type PayState = 'idle' | 'creating' | 'waiting' | 'polling' | 'success' | 'error'

/** 支付参数 */
interface PayParams {
  orderNo: string
  payment: {
    mode: 'native'
    codeUrl?: string
  }
}

export default function SubscribePage() {
  const navigate = useNavigate()
  const { subscription, isLoggedIn } = useAuth()
  const [plans, setPlans] = useState<Plan[]>([])
  const [_loading, setLoading] = useState(false)

  // 支付状态
  const [payState, setPayState] = useState<PayState>('idle')
  const [payParams, setPayParams] = useState<PayParams | null>(null)
  const [payError, setPayError] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [countdown, setCountdown] = useState(0)

  // QR 码 canvas 引用 + 渲染
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const codeUrl = payParams?.payment?.codeUrl
    if (payState === 'waiting' && codeUrl && qrCanvasRef.current) {
      QRCode.toCanvas(qrCanvasRef.current, codeUrl, {
        width: 260,
        margin: 2,
        color: { dark: '#1a1a1a', light: '#ffffff' },
      })
    }
  }, [payState, payParams])

  const handleDownloadQr = () => {
    const canvas = qrCanvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = 'wechat-pay-qr.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  useEffect(() => {
    getPlans().then((r) => {
      if (r.data) setPlans(r.data)
    })
  }, [])

  // 轮询订单状态
  useEffect(() => {
    if (payState !== 'polling' || !payParams) return

    const token = loadSession()?.accessToken
    if (!token) return

    let cancelled = false
    let attempts = 0
    const maxAttempts = 60 // 最多轮询 3 分钟

    const poll = async () => {
      if (cancelled || attempts >= maxAttempts) {
        if (!cancelled) {
          setPayError('支付超时，请重试')
          setPayState('error')
        }
        return
      }
      attempts++

      try {
        const res = await fetch(`/api/pay/query?orderNo=${payParams.orderNo}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (data.status === 'paid') {
          await refreshUserData()
          setPayState('success')
          return
        }
      } catch {}

      if (!cancelled) {
        setTimeout(poll, 3000)
      }
    }

    poll()
    return () => { cancelled = true }
  }, [payState, payParams])

  // 支付倒计时（Native 模式，二维码过期倒计时）
  useEffect(() => {
    if (payState !== 'waiting' || !payParams) return
    setCountdown(120)
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer)
          setPayState('error')
          setPayError('二维码已过期，请重新下单')
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [payState, payParams])

  // ============================================================
  // 开始支付
  // ============================================================

  const handleSubscribe = async (plan: Plan) => {
    if (!isLoggedIn) {
      navigate('/login?redirect=/subscribe')
      return
    }

    if (plan.price === 0) {
      // 免费套餐
      setLoading(true)
      try {
        const res = await fetch('/api/pay/create-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${loadSession()?.accessToken}`,
          },
          body: JSON.stringify({ planId: plan.id }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || '下单失败')
        }

        // 将免费套餐当成功效（实际免费套餐不会触发支付）
        await refreshUserData()
        setPayState('success')
      } catch (e: any) {
        alert('操作失败：' + e.message)
      } finally {
        setLoading(false)
      }
      return
    }

    // 付费套餐 → 真实支付流程
    setSelectedPlan(plan)
    setPayState('creating')
    setPayError('')

    try {
      const token = loadSession()?.accessToken
      if (!token) throw new Error('请先登录')

      const res = await fetch('/api/pay/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId: plan.id }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.detail || '下单失败')

      setPayParams(data)
      // Native 模式：显示二维码
      setPayState('waiting')
    } catch (e: any) {
      setPayError(e.message)
      setPayState('error')
    }
  }

  // ============================================================
  // 轮询开始（Native 模式用户扫码后手动触发）
  // ============================================================

  const startPolling = () => {
    if (payParams) {
      setPayState('polling')
    }
  }

  // 重新检查支付状态
  const retryPolling = () => {
    setPayError('')
    if (payParams) {
      setPayState('polling')
    }
  }

  // ============================================================
  // 渲染
  // ============================================================

  // 支付成功页
  if (payState === 'success') {
    return (
      <div className="flex flex-col min-h-screen bg-[var(--color-canvas-soft)] px-6 pt-20">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-5 animate-bounce">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-[var(--color-ink)] mb-2">开通成功！🎉</h2>
          <p className="text-sm text-[var(--color-body)] mb-2">您现在可以解锁全部互动演示了</p>
          {selectedPlan && (
            <p className="text-xs text-[var(--color-mute)] mb-8">{selectedPlan.name} · 有效期{selectedPlan.durationDays}天</p>
          )}
          <Button variant="primary" size="lg" onClick={() => navigate('/lessons')}>
            开始学习
          </Button>
        </div>
      </div>
    )
  }

  // 支付等待页（展示微信支付二维码）
  if (payState === 'waiting') {
    return (
      <div className="flex flex-col min-h-screen bg-[var(--color-canvas-soft)] px-6 pt-20">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          {/* QR Code Canvas — 由顶层 hook 渲染 */}
          <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-l3)] p-6 mb-6">
            <canvas ref={qrCanvasRef} className="w-60 h-60" />
          </div>

          <h2 className="text-base font-semibold text-[var(--color-ink)] mb-1">请使用微信扫码支付</h2>
          <p className="text-xs text-[var(--color-mute)] mb-2">
            二维码有效期 {countdown}s
          </p>
          <p className="text-xs text-[var(--color-mute)] mb-4">
            用另一台手机微信扫码，或截图保存后打开微信扫一扫
          </p>

          <div className="flex flex-col items-center gap-3 mb-6">
            <div className="flex items-center gap-3">
              <Button variant="primary" size="sm" onClick={startPolling}>
                已完成支付
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setPayState('idle')
                  setPayParams(null)
                  setSelectedPlan(null)
                }}
              >
                取消
              </Button>
            </div>
            <button
              onClick={handleDownloadQr}
              className="inline-flex items-center gap-1 text-xs text-[var(--color-link)] hover:underline cursor-pointer"
            >
              <Download className="w-3 h-3" />
              保存二维码
            </button>
          </div>

          <p className="text-xs text-[var(--color-mute)]">
            {selectedPlan?.name} · ¥{selectedPlan?.price} · 有效期{selectedPlan?.durationDays}天
          </p>
        </div>
      </div>
    )
  }

  // 错误页
  if (payState === 'error') {
    return (
      <div className="flex flex-col min-h-screen bg-[var(--color-canvas-soft)] px-6 pt-20">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--color-ink)] mb-2">支付异常</h2>
          <p className="text-sm text-[var(--color-body)] mb-6">{payError || '支付过程中出现问题'}</p>
          <div className="flex items-center gap-3">
            <Button variant="primary" size="sm" onClick={retryPolling}>
              重新检查
            </Button>
            <Button variant="primary" size="sm" onClick={() => {
              setPayState('idle')
              setPayParams(null)
              setSelectedPlan(null)
              setPayError('')
            }}>
              重新选择
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/my')}>
              查看订单
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================
  // 主页面：选择套餐
  // ============================================================

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
        <p className="text-sm text-[var(--color-mute)] mt-1">解锁全部互动演示学习资源</p>

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

      {/* 支付方式提示 */}
      <div className="px-6 pt-3">
        <div className="flex items-center gap-2 text-xs text-[var(--color-mute)] bg-[var(--color-canvas)] rounded-[var(--radius-md)] px-4 py-2.5">
          <Smartphone className="w-3.5 h-3.5 shrink-0" />
          <span>微信扫码支付 · 手机/电脑通用</span>
        </div>
      </div>

      {/* Plan cards */}
      <div className="flex-1 px-6 pt-4 pb-8 space-y-4">
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
                  {plan.price === 0 ? '价格待定' : `¥${plan.price}`}
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
                  loading={payState === 'creating' && selectedPlan?.id === plan.id}
                  disabled={isCurrent || plan.price === 0}
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
  