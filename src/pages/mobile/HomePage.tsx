import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-canvas-soft)] px-5 pt-6">
      {/* Logo — brand gradient */}
      <div className="mb-6">
        <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-gradient-end)] bg-clip-text text-transparent">
          TalkTalk
        </span>
      </div>

      {/* Search Bar — pill with shadow */}
      <div
        className="flex items-center gap-2.5 h-12 px-5 bg-[var(--color-canvas)] border border-[var(--color-hairline)] rounded-full shadow-[var(--shadow-l2)] cursor-pointer mb-7 hover:shadow-[var(--shadow-l3)] hover:border-[var(--color-mute)] transition-all duration-200"
        onClick={() => navigate('/lessons')}
      >
        <Search className="w-4 h-4 text-[var(--color-mute)] shrink-0" />
        <span className="text-sm text-[var(--color-mute)]">搜索题目、题型、知识点…</span>
      </div>

      {/* Core card */}
      <div className="bg-[var(--color-canvas)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-l2)] p-8 text-center">
        {/* Brand-colored icon */}
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[var(--color-gradient-start)] to-[var(--color-gradient-end)] shadow-[0_4px_16px_rgba(121,40,202,0.2)]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="4" />
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-[var(--color-ink)] mb-2">生成题目演示</h2>
        <p className="text-sm text-[var(--color-body)] leading-relaxed">
          录入题目，为孩子生成图片讲解或互动讲解
        </p>
        {/* Accent decorative dot */}
        <div className="flex items-center justify-center gap-1.5 mt-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gradient-start)]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-cyan)]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-highlight-pink)]" />
        </div>
        <p className="text-xs text-[var(--color-mute)] mt-3">暂未开放</p>
      </div>
    </div>
  )
}
