import { MathComponentRenderer } from '../../components/math'

export default function MathComponentPreviewPage() {
  const items = [
    { name: 'CalcTotalMul', title: '用乘法求总数：每份数 × 份数' },
    { name: 'CalcPartDiv', title: '用除法求份数：总量 ÷ 每份数' },
    { name: 'CalcUnitDiv', title: '用除法求每份数：总量 ÷ 份数' },
    { name: 'CalcPriceMul', title: '用乘法求总价：单价 × 数量' },
    { name: 'CalcUnitPriceDiv', title: '用除法求单价：总价 ÷ 数量' },
    { name: 'CalcQtyDiv', title: '用除法求数量：总价 ÷ 单价' },
    { name: 'CalcDistMul', title: '用乘法求路程：速度 × 时间' },
    { name: 'CalcSpeedDiv', title: '用除法求速度：路程 ÷ 时间' },
    { name: 'CalcTimeDiv', title: '用除法求时间：路程 ÷ 速度' },
    { name: 'CalcDiffSub', title: '差值拖拽：大数减小数' },
    { name: 'CalcSumAdd', title: '用加法求两个数的和' },
    { name: 'CalcRemainSub', title: '用减法求剩余量' },
    { name: 'CalcTimesDiv', title: '用除法求倍数' },
    { name: 'CalcTimesMul', title: '用乘法求几倍是多少' },
    { name: 'CalcFracPart', title: '用乘除混合求部分量' },
    { name: 'CalcFracRate', title: '用除法求占比' },
    { name: 'CalcAvgDiv', title: '用除法求平均数' },
    { name: 'CalcMultiSum', title: '用加法求各部分之和' },
    { name: 'TimeSubSpan', title: '求经过时间' },
    { name: 'TimeSubPass', title: '求开始时刻' },
    { name: 'TimeAddPass', title: '求结束时刻' },
  ]

  const renderDemo = (name: string) => {
    switch (name) {
      case 'CalcTotalMul':
        return (
          <MathComponentRenderer
            block={{
              step: 1,
              type: '求总量',
              component: 'CalcTotalMul',
              math_object: '每份8个，共3份',
              visual_object: '小熊分糖',
              props: {
                count: 4,
                perValue: 10,
                unit: '个',
                stepLabel: '每组10个，共4组',
                totalLabel: '共40个',
                buttonText: '求总量',
              },
            }}
          />
        )
      case 'CalcPartDiv':
        return (
          <MathComponentRenderer
            block={{
              step: 1,
              type: '求份数',
              component: 'CalcPartDiv',
              math_object: '60厘米，每份15厘米',
              visual_object: '切分线段',
              props: {
                total: 60,
                stepValue: 15,
                unit: '厘米',
                stepLabel: '4份',
                buttonText: '求份数',
              },
            }}
          />
        )
      case 'CalcUnitDiv':
        return (
          <MathComponentRenderer
            block={{
              step: 1,
              type: '求每份数',
              component: 'CalcUnitDiv',
              math_object: '60个，分成4份',
              visual_object: '切分线段',
              props: {
                total: 60,
                stepValue: 15,
                unit: '个',
                stepLabel: '15个',
                buttonText: '求每份数',
              },
            }}
          />
        )
      case 'CalcPriceMul':
        return (
          <MathComponentRenderer
            block={{
              step: 1,
              type: '求总价',
              component: 'CalcPriceMul',
              math_object: '单价5元，买4个',
              visual_object: '商品、钱币',
              props: {
                type: 'CalcPriceMul',
                totalPrice: 20,
                price: 5,
                quantity: 4,
                unit: '元',
                itemLabel: '总价模型探究',
                buttonText: '求总价',
              },
            }}
          />
        )
      case 'CalcUnitPriceDiv':
        return (
          <MathComponentRenderer
            block={{
              step: 1,
              type: '求单价',
              component: 'CalcUnitPriceDiv',
              math_object: '总价20元，买4个',
              visual_object: '商品、钱币',
              props: {
                type: 'CalcUnitPriceDiv',
                totalPrice: 20,
                price: 5,
                quantity: 4,
                unit: '元',
                itemLabel: '单价: 5元',
                buttonText: '求单价',
              },
            }}
          />
        )
      case 'CalcQtyDiv':
        return (
          <MathComponentRenderer
            block={{
              step: 1,
              type: '求数量',
              component: 'CalcQtyDiv',
              math_object: '总价20元，单价5元',
              visual_object: '商品、钱币',
              props: {
                type: 'CalcQtyDiv',
                totalPrice: 20,
                price: 5,
                quantity: 4,
                unit: '元',
                itemLabel: '4个',
                buttonText: '求数量',
              },
            }}
          />
        )
      case 'CalcDistMul':
        return (
          <MathComponentRenderer
            block={{
              step: 1,
              type: '求路程',
              component: 'CalcDistMul',
              math_object: '速度80千米/时，时间3小时',
              visual_object: '火车、路程',
              props: {
                type: 'CalcDistMul',
                distance: 240,
                speed: 80,
                time: 3,
                speedUnit: '千米/时',
                timeUnit: '小时',
                distanceUnit: '千米',
                itemLabel: '路程模型探究',
                buttonText: '求路程',
              },
            }}
          />
        )
      case 'CalcSpeedDiv':
        return (
          <MathComponentRenderer
            block={{
              step: 1,
              type: '求速度',
              component: 'CalcSpeedDiv',
              math_object: '240千米，3小时',
              visual_object: '火车、路程',
              props: {
                type: 'CalcSpeedDiv',
                distance: 240,
                speed: 80,
                time: 3,
                speedUnit: '千米/时',
                timeUnit: '小时',
                distanceUnit: '千米',
                buttonText: '求速度',
              },
            }}
          />
        )
      case 'CalcTimeDiv':
        return (
          <MathComponentRenderer
            block={{
              step: 1,
              type: '求时间',
              component: 'CalcTimeDiv',
              math_object: '240千米，80千米/时',
              visual_object: '火车、路程',
              props: {
                type: 'CalcTimeDiv',
                distance: 240,
                speed: 80,
                time: 3,
                speedUnit: '千米/时',
                timeUnit: '小时',
                distanceUnit: '千米',
                buttonText: '求时间',
              },
            }}
          />
        )
      case 'CalcDiffSub':
        return (
          <MathComponentRenderer
            block={{
              step: 1,
              type: '差值拖拽',
              component: 'CalcDiffSub',
              math_object: '20个，拿掉8个',
              visual_object: '方块拖拽',
              props: {
                numA: 20,
                numB: 8,
                unit: '个',
                labelA: '',
                labelB: '',
                buttonText: '求差',
              },
            }}
          />
        )
      case 'CalcSumAdd':
        return (
          <MathComponentRenderer
            block={{
              step: 1,
              type: '求和',
              component: 'CalcSumAdd',
              math_object: '3个和5个',
              visual_object: '条块相加',
              props: {
                parts: [3, 5],
                unit: '个',
                labels: ['3个', '5个'],
                buttonText: '求和',
              },
            }}
          />
        )
      case 'CalcRemainSub':
        return (
          <MathComponentRenderer
            block={{
              step: 1,
              type: '求剩余',
              component: 'CalcRemainSub',
              math_object: '20个，拿走8个',
              visual_object: '方块减少',
              props: {
                total: 20,
                used: 8,
                unit: '个',
                totalLabel: '总数',
                usedLabel: '拿走',
                buttonText: '求剩余',
              },
            }}
          />
        )
      case 'CalcTimesDiv':
        return (
          <MathComponentRenderer
            block={{
              step: 1,
              type: '求倍数',
              component: 'CalcTimesDiv',
              math_object: '12个和3个',
              visual_object: '条形比较',
              props: {
                numA: 12,
                numB: 3,
                unit: '个',
                labelA: '比较数',
                labelB: '标准基准数',
                buttonText: '求倍数',
              },
            }}
          />
        )
      case 'CalcTimesMul':
        return (
          <MathComponentRenderer
            block={{
              step: 1,
              type: '求一倍数的几倍',
              component: 'CalcTimesMul',
              math_object: '4个的3倍',
              visual_object: '点阵复制',
              props: {
                baseNum: 4,
                multiple: 3,
                unit: '个',
                labelBase: '基础量',
                buttonText: '求一倍数的几倍',
              },
            }}
          />
        )
      case 'CalcFracPart':
        return (
          <MathComponentRenderer
            block={{
              step: 1,
              type: '求部分量',
              component: 'CalcFracPart',
              math_object: '12个，取3/4',
              visual_object: '份数选择',
              props: {
                total: 12,
                part: 9,
                numerator: 3,
                denominator: 4,
                unit: '个',
                buttonText: '下一步',
              },
            }}
          />
        )
      case 'CalcFracRate':
        return (
          <MathComponentRenderer
            block={{
              step: 1,
              type: '求占比',
              component: 'CalcFracRate',
              math_object: '部分8，总量12',
              visual_object: '占比条',
              props: {
                total: 12,
                part: 8,
                numerator: 8,
                denominator: 12,
                unit: '个',
                buttonText: '下一步',
              },
            }}
          />
        )
      case 'CalcAvgDiv':
        return (
          <MathComponentRenderer
            block={{
              step: 1,
              type: '求平均数',
              component: 'CalcAvgDiv',
              math_object: '12个，分成3份',
              visual_object: '容器分配',
              props: {
                total: 12,
                count: 3,
                unit: '个',
                totalLabel: '总量',
                buttonText: '下一步',
              },
            }}
          />
        )
      case 'CalcMultiSum':
        return (
          <MathComponentRenderer
            block={{
              step: 1,
              type: '求总数',
              component: 'CalcMultiSum',
              math_object: '2、3、4相加',
              visual_object: '多条柱状',
              props: {
                parts: [2, 3, 4],
                unit: '个',
                labels: ['A', 'B', 'C'],
                buttonText: '求总数',
              },
            }}
          />
        )
      case 'TimeSubSpan':
        return (
          <MathComponentRenderer
            block={{
              step: 1,
              type: '求经过时间',
              component: 'TimeSubSpan',
              math_object: '08:00 到 09:30',
              visual_object: '时间轴',
              props: {
                startTime: '08:00',
                endTime: '09:30',
                pauseMinutes: 10,
                durationMinutes: 90,
                buttonText: '下一步',
              },
            }}
          />
        )
      case 'TimeSubPass':
        return (
          <MathComponentRenderer
            block={{
              step: 1,
              type: '求开始时刻',
              component: 'TimeSubPass',
              math_object: '09:30，往前推 90 分钟',
              visual_object: '时间轴倒推',
              props: {
                startTime: '08:00',
                endTime: '09:30',
                pauseMinutes: 10,
                durationMinutes: 90,
                buttonText: '下一步',
              },
            }}
          />
        )
      case 'TimeAddPass':
        return (
          <MathComponentRenderer
            block={{
              step: 1,
              type: '求结束时刻',
              component: 'TimeAddPass',
              math_object: '09:00 + 135分钟',
              visual_object: '时间推进',
              props: {
                startTime: '09:00',
                endTime: '11:45',
                pauseMinutes: 30,
                durationMinutes: 135,
                buttonText: '画一段时间',
              },
            }}
          />
        )
      default:
        return (
          <div className="rounded-[16px] border border-dashed border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] px-3 py-8 text-center text-xs text-[var(--color-mute)]">
            待重写
          </div>
        )
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[var(--color-canvas)] p-4 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="rounded-[24px] border border-[var(--color-hairline)] bg-white p-4">
          <div className="text-lg font-semibold text-[var(--color-ink)]">数学组件</div>
          <div className="mt-1 text-sm text-[var(--color-body)]">占位列表页，后续逐个重写。</div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <section
              key={item.name}
              className="min-w-0 rounded-[20px] border border-[var(--color-hairline)] bg-white p-4"
            >
              <div className="text-[12px] font-bold leading-tight text-[var(--color-ink)]">
                {item.name}
              </div>
              <div className="mt-1 text-[12px] text-[var(--color-body)]">
                {item.title}
              </div>
              <div className="mt-4 min-w-0">
                {renderDemo(item.name)}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
