import type { ReactNode } from 'react'
import { MHint, MInfo } from '../../components/preview/stageOneBlocks'

const observationData = {
  question_text: '学校要买12张课桌和10把椅子，每张课桌90元，每把椅子32元。一共需要多少元？',
  goal: {
    text: '一共需要多少元？',
    target: '总花费金额',
  },
  known_conditions: [
    { text: '学校要买12张课桌', unit: '张', value: 12 },
    { text: '学校要买10把椅子', unit: '把', value: 10 },
    { text: '每张课桌90元', unit: '元/张', value: 90 },
    { text: '每把椅子32元', unit: '元/把', value: 32 },
  ],
  hidden_conditions: [
    { text: '总花费等于购买课桌的总价与购买椅子的总价之和' },
  ],
}

const challengeData = {
  challenge_steps: [
    {
      hint: '想一想，求一种商品的总价，可以用它的单价乘购买的数量。',
      question: '买12张课桌一共需要多少钱？',
      logic_type: '求总价',
    },
    {
      hint: '和求课桌总价的方法相同，用椅子的单价乘椅子的数量。',
      question: '买10把椅子一共需要多少钱？',
      logic_type: '求总价',
    },
    {
      hint: '把前面算出的课桌总价和椅子总价合在一起，就是一共需要的钱数。',
      question: '课桌和椅子的总花费合起来是多少元？',
      logic_type: '求和',
    },
  ],
}

function SectionCard({
  title,
  accent = 'pink',
  children,
}: {
  title: string
  accent?: 'pink' | 'blue'
  children: ReactNode
}) {
  const accentClass =
    accent === 'pink'
      ? 'from-[#7928CA] to-[#FF0080]'
      : 'from-[#0070F3] to-[#7928CA]'

  return (
    <section className="rounded-[28px] border border-[#E8E8E8] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`inline-flex rounded-full bg-gradient-to-r ${accentClass} px-3 py-1 text-[11px] font-medium text-white`}>
            {title}
          </div>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function EmptyCard() {
  return (
    <div className="min-h-[220px] rounded-[24px] border border-dashed border-[#D8D8D8] bg-[#FAFAFA]" />
  )
}

export default function ComponentPreviewPage() {
  return (
    <div className="space-y-6 bg-[#FAFAFA] text-[#171717]">
      <div className="grid gap-5">
        <SectionCard
          title="1. 观察区"
          accent="pink"
        >
          <div className="mb-4 rounded-[24px] bg-[#FFFFFF] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
            <div className="text-xs font-medium text-[#888888]">question_text</div>
            <div className="mt-2 text-sm leading-7 text-[#171717]">
              {observationData.question_text}
            </div>
          </div>
          <MHint data={observationData} />
        </SectionCard>

        <SectionCard
          title="2. 发现区"
          accent="blue"
        >
          <EmptyCard />
        </SectionCard>

        <SectionCard
          title="3. 挑战区"
          accent="pink"
        >
          <MInfo data={challengeData} />
        </SectionCard>
      </div>
    </div>
  )
}
