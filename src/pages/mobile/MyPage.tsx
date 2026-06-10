import { MessageCircle, QrCode } from 'lucide-react'

export default function MyPage() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-4">
      {/* About TalkTalk */}
      <section>
        <h2 className="text-base font-semibold text-[var(--color-ink)] mb-3">关于 TalkTalk</h2>
        <div className="bg-[var(--color-canvas)] rounded-[var(--radius-md)] shadow-[var(--shadow-l2)] p-4">
          <p className="text-sm text-[var(--color-body)] leading-relaxed">
            TalkTalk 是一款专注于小学数学思维训练的互动学习工具。我们精选经典题型，
            提供详细的文字讲解、图片解析和互动演示，帮助孩子理解数学概念，培养解题思维。
            从一年级到六年级，覆盖植树问题、鸡兔同笼、和差问题等核心题型，
            让数学学习变得生动有趣。
          </p>
        </div>
      </section>

      {/* Contact Us */}
      <section>
        <h2 className="text-base font-semibold text-[var(--color-ink)] mb-3">联系我们</h2>
        <div className="bg-[var(--color-canvas)] rounded-[var(--radius-md)] shadow-[var(--shadow-l2)] p-4">
          <div className="flex items-center gap-3 text-sm text-[var(--color-body)] mb-2">
            <MessageCircle className="w-4 h-4 text-[var(--color-mute)]" />
            <span>关注微信公众号获取更多学习资源</span>
          </div>
          <div className="flex items-center justify-center py-6 bg-[var(--color-canvas-soft)] rounded-[var(--radius-sm)] border border-dashed border-[var(--color-hairline)]">
            <div className="flex flex-col items-center gap-2 text-[var(--color-mute)]">
              <QrCode className="w-12 h-12" />
              <span className="text-xs">微信扫码关注</span>
            </div>
          </div>
        </div>
      </section>

      {/* Generated Demos - Placeholder */}
      <section>
        <h2 className="text-base font-semibold text-[var(--color-ink)] mb-3">我生成的题目演示</h2>
        <div className="bg-[var(--color-canvas)] rounded-[var(--radius-md)] shadow-[var(--shadow-l2)] p-4">
          <div className="flex flex-col items-center justify-center py-10 bg-gray-50 rounded-[var(--radius-sm)] border border-dashed border-[var(--color-hairline)]">
            <p className="text-sm text-[var(--color-mute)] font-medium">即将开放</p>
            <p className="text-xs text-[var(--color-mute)] mt-1">此功能正在开发中，敬请期待</p>
          </div>
        </div>
      </section>
    </div>
  )
}
