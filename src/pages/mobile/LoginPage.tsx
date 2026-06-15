import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { signIn, signUp } from '../../lib/supabase-auth'
import { refreshUserData } from '../../stores/authStore'

type Mode = 'login' | 'register' | 'forgot'

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectPath = searchParams.get('redirect')
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async () => {
    setError('')

    if (!email.trim()) { setError('请输入邮箱'); return }

    if (mode === 'forgot') {
      setLoading(true)
      try {
        // Supabase Auth 发送密码重置邮件
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
        const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
        const siteUrl = window.location.origin

        const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.trim(),
            redirect_to: `${siteUrl}/login`,
          }),
        })

        const text = await res.text()
        if (!res.ok) {
          const msg = text ? JSON.parse(text)?.msg || text : `HTTP ${res.status}`
          setError(msg)
          setLoading(false)
          return
        }

        // 成功发送 → 切换到登录并显示成功信息
        setSuccess('重置链接已发送到您的邮箱，请查收后设置新密码')
        setMode('login')
        setPassword('')
        setLoading(false)
        return
      } catch (e: any) {
        setError(e.message || '发送失败')
        setLoading(false)
        return
      }
    }

    if (!password) { setError('请输入密码'); return }
    if (password.length < 6) { setError('密码至少 6 位'); return }

    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password)
        if (error) { setError(error); setLoading(false); return }
      } else {
        const { error } = await signUp(email, password)
        if (error) { setError(error); setLoading(false); return }

        // 注册后自动登录（有些场景需要确认邮箱，先尝试登录）
        const { error: loginError } = await signIn(email, password)
        if (loginError) {
          setError('注册成功，请前往邮箱验证后登录')
          setLoading(false)
          return
        }
      }

      await refreshUserData()

      if (redirectPath) {
        navigate(redirectPath)
      } else {
        navigate(-1)
      }
    } catch (e: any) {
      setError(e.message || '操作失败')
    }

    setLoading(false)
  }

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-canvas)] px-6 pt-6">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-sm text-[var(--color-body)] hover:text-[var(--color-ink)] mb-8 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        返回
      </button>

      {/* Brand */}
      <div className="mb-8">
        <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-gradient-end)] bg-clip-text text-transparent">
          成长表达实验室 M
        </span>
        <h1 className="text-xl font-semibold text-[var(--color-ink)] mt-3">
          {mode === 'login' ? '登录账号' : mode === 'register' ? '注册账号' : '重置密码'}
        </h1>
        <p className="text-sm text-[var(--color-mute)] mt-1">
          {mode === 'login' ? '登录后解锁更多功能' : mode === 'register' ? '注册后开启数学思维之旅' : '输入邮箱，我们将发送重置链接'}
        </p>
      </div>

      {/* Success */}
      {success && (
        <div className="bg-green-50 text-green-700 text-sm px-4 py-2.5 rounded-[var(--radius-md)] mb-4">
          {success}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-[var(--color-error-soft)] text-[var(--color-error)] text-sm px-4 py-2.5 rounded-[var(--radius-md)] mb-4">
          {error}
        </div>
      )}

      {/* Form */}
      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[var(--color-body)]">邮箱</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-mute)]" />
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 pl-10 pr-4 text-sm bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-md)]
                text-[var(--color-ink)] placeholder:text-[var(--color-mute)]
                focus:outline-none focus:border-[var(--color-link)] focus:ring-2 focus:ring-[var(--color-link-bg-soft)]
                transition-all"
            />
          </div>
        </div>

        {mode !== 'forgot' && <>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[var(--color-body)]">密码</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-mute)]" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="至少 6 位密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 pl-10 pr-10 text-sm bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-md)]
                text-[var(--color-ink)] placeholder:text-[var(--color-mute)]
                focus:outline-none focus:border-[var(--color-link)] focus:ring-2 focus:ring-[var(--color-link-bg-soft)]
                transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-mute)] hover:text-[var(--color-ink)] cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        </>}

        <Button
          variant="primary"
          size="lg"
          className="w-full mt-2"
          onClick={handleSubmit}
          loading={loading}
        >
          {mode === 'login' ? '登录' : mode === 'register' ? '注册' : '发送重置链接'}
        </Button>

        {/* 忘记密码 */}
        {mode === 'login' && (
          <div className="text-center mt-3">
            <button
              onClick={() => { setMode('forgot'); setError(''); setPassword('') }}
              className="text-xs text-[var(--color-link)] hover:underline cursor-pointer"
            >
              忘记密码？
            </button>
          </div>
        )}
      </div>

      {/* Toggle mode */}
      {mode !== 'forgot' ? (
        <div className="mt-6 text-center">
          <span className="text-sm text-[var(--color-body)]">
            {mode === 'login' ? '没有账号？' : '已有账号？'}
          </span>
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
            className="text-sm text-[var(--color-link)] hover:underline ml-1 cursor-pointer"
          >
            {mode === 'login' ? '去注册' : '去登录'}
          </button>
        </div>
      ) : (
        <div className="mt-6 text-center">
          <button
            onClick={() => { setMode('login'); setError(''); setPassword('') }}
            className="text-sm text-[var(--color-link)] hover:underline cursor-pointer"
          >
            返回登录
          </button>
        </div>
      )}
    </div>
  )
}
