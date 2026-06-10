import { useNavigate } from 'react-router-dom'
import {
  User, Crown, Clock, CreditCard,
  LogIn, LogOut, Sparkles, ChevronRight, Shield
} from 'lucide-react'
import { useAuth, resetAuth } from '../../stores/authStore'
import { signOut } from '../../lib/supabase-auth'
import { Button } from '../../components/ui/Button'

export default function MyPage() {
  const navigate = useNavigate()
  const { user, subscription, isLoggedIn, isAdmin } = useAuth()

  const handleLogout = async () => {
    await signOut()
    resetAuth()
  }

  // ===== 未登录状态 =====
  if (!isLoggedIn) {
    return (
      <div className="flex flex-col gap-6 px-5 pt-5 pb-6">
        {/* Profile card */}
        <div className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-l2)] p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[var(--color-canvas-soft-2)] flex items-center justify-center">
            <User className="w-8 h-8 text-[var(--color-mute)]" />
          </div>
          <h2 className="text-base font-semibold text-[var(--color-ink)] mb-1">未登录</h2>
          <p className="text-sm text-[var(--color-mute)] mb-4">登录后开启学习之旅</p>
          <Button variant="primary" size="lg" className="w-full" onClick={() => navigate('/login')}>
            <LogIn className="w-4 h-4" />
            登录 / 注册
          </Button>
        </div>

        {/* Quick links */}
        <div className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-l2)] divide-y divide-[var(--color-hairline)]">
          <LinkItem icon={Crown} label="开通会员" onClick={() => navigate('/login?redirect=/subscribe')} />
          <LinkItem icon={Sparkles} label="我生成题目演示" disabled badge="暂未开放" />
        </div>

        {/* About */}
        <AboutSection />
      </div>
    )
  }

  // ===== 已登录状态 =====
  const isSubscribed = !!subscription
  const isBasic = subscription?.planCode === 'basic'
  const isAi = subscription?.planCode === 'ai'

  return (
    <div className="flex flex-col gap-6 px-5 pt-5 pb-6">
      {/* Profile card — 根据订阅状态显示 */}
      <div className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-l2)] p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--color-gradient-start)] to-[var(--color-gradient-end)] flex items-center justify-center shrink-0">
            <span className="text-white text-lg font-bold">
              {(user?.nickname || user?.email || '?')[0].toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-[var(--color-ink)] truncate">
              {user?.nickname || user?.email || '用户'}
            </h2>
            <p className="text-xs text-[var(--color-mute)]">{user?.email}</p>
          </div>
        </div>

        {/* 未开通会员 */}
        {!isSubscribed && (
          <div className="bg-[var(--color-canvas-soft)] rounded-[var(--radius-xl)] p-4 text-center">
            <p className="text-sm text-[var(--color-mute)] mb-3">尚未开通会员</p>
            <Button variant="primary" size="sm" onClick={() => navigate('/subscribe')}>
              <Crown className="w-4 h-4" />
              立即订阅
            </Button>
          </div>
        )}

        {/* 基础会员 */}
        {isSubscribed && isBasic && (
          <div className="bg-blue-50 rounded-[var(--radius-xl)] p-4">
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-4 h-4 text-[var(--color-link)]" />
              <span className="text-sm font-semibold text-[var(--color-link)]">基础会员</span>
            </div>
            {subscription.expireAt && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--color-body)] mb-3">
                <Clock className="w-3.5 h-3.5" />
                <span>到期 {new Date(subscription.expireAt).toLocaleDateString('zh-CN')}</span>
              </div>
            )}
            <Button variant="primary-sm" size="sm" onClick={() => navigate('/subscribe')}>
              续费
            </Button>
          </div>
        )}

        {/* AI 会员 */}
        {isSubscribed && isAi && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-[var(--radius-xl)] p-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-[var(--color-violet)]" />
              <span className="text-sm font-semibold text-[var(--color-violet)]">AI 会员</span>
            </div>
            {subscription.expireAt && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--color-body)] mb-3">
                <Clock className="w-3.5 h-3.5" />
                <span>到期 {new Date(subscription.expireAt).toLocaleDateString('zh-CN')}</span>
              </div>
            )}
            <Button variant="primary-sm" size="sm" onClick={() => navigate('/subscribe')}>
              续费
            </Button>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-l2)] divide-y divide-[var(--color-hairline)]">
        {!isSubscribed && (
          <LinkItem icon={Crown} label="开通会员" onClick={() => navigate('/subscribe')} />
        )}
        <LinkItem icon={CreditCard} label="订单记录" onClick={() => navigate('/orders')} />
        {isAi && (
          <LinkItem icon={Sparkles} label="AI 功能" onClick={() => {}} />
        )}
        {isAdmin && (
          <LinkItem icon={Shield} label="管理后台" onClick={() => navigate('/admin')} />
        )}
        <LinkItem icon={Sparkles} label="我生成题目演示" disabled badge="暂未开放" />
        <LinkItem
          icon={LogOut}
          label="退出登录"
          className="!text-[var(--color-error)]"
          onClick={handleLogout}
        />
      </div>

      {/* About */}
      <AboutSection />
    </div>
  )
}

// ===== 子组件 =====

function LinkItem({
  icon: Icon,
  label,
  onClick,
  disabled,
  badge,
  className = '',
}: {
  icon: any
  label: string
  onClick?: () => void
  disabled?: boolean
  badge?: string
  className?: string
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={`w-full flex items-center gap-3 px-5 py-3.5 text-sm text-[var(--color-body)] transition-colors ${disabled ? 'cursor-default opacity-60' : 'hover:text-[var(--color-ink)] cursor-pointer'} ${className}`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {badge && <span className="text-[10px] text-[var(--color-mute)] bg-[var(--color-canvas-soft-2)] px-1.5 py-0.5 rounded-full">{badge}</span>}
      {!disabled && <ChevronRight className="w-4 h-4 text-[var(--color-mute)]" />}
    </button>
  )
}

function AboutSection() {
  return (
    <section>
      <h2 className="text-base font-semibold text-[var(--color-ink)] mb-3">关于 TalkTalk</h2>
      <div className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-l2)] p-5">
        <p className="text-sm text-[var(--color-body)] leading-relaxed">
          客服: tyAnan1993
        </p>
      </div>
    </section>
  )
}
