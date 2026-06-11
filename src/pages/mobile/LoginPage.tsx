import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { signIn, signUp } from '../../lib/supabase-auth'
import { refreshUserData } from '../../stores/authStore'

type Mode = 'login' | 'register'

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

  const handleSubmit = async () => {
    setError('')

    if (!email.trim()) { setError('请输入邮箱'); return }
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
          TalkTalk
        </span>
        <h1 className="text-xl font-semibold text-[var(--color-ink)] mt-3">
          {mode === 'login' ? '登录账号' : '注册账号'}
        </h1>
        <p className="text-sm text-[var(--color-mute)] mt-1">
          {mode === 'login' ? '登录后解锁更多功能' : '注册后开启数学思维之旅'}
        </p>
      </div>

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

        <Button
          variant="primary"
          size="lg"
          className="w-full mt-2"
          onClick={handleSubmit}
          loading={loading}
        >
          {mode === 'login' ? '登录' : '注册'}
        </Button>
      </div>

      {/* Toggle mode */}
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
    </div>
  )
}
