import BasicPage from '../../components/preview/BasicPage'

const questionText = '学校要买12张课桌和10把椅子，每张课桌90元，每把椅子32元。一共需要多少元？'

const mathAnalysisJson = {
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

const tutorAnalysisJson = {
  challenge_steps: [
    {
      step: 1,
      hint: '想一想，求一种商品的总价，可以用它的单价乘购买的数量。',
      question: '买12张课桌一共需要多少钱？',
      logic_type: '求总价',
    },
    {
      step: 2,
      hint: '和求课桌总价的方法相同，用椅子的单价乘椅子的数量。',
      question: '买10把椅子一共需要多少钱？',
      logic_type: '求总价',
    },
    {
      step: 3,
      hint: '把前面算出的课桌总价和椅子总价合在一起，就是一共需要的钱数。',
      question: '课桌和椅子的总花费合起来是多少元？',
      logic_type: '求和',
    },
  ],
}

const logicAnalysisJson = {
  logic_blocks: [
    {
      step: 1,
      type: '求总价',
      component: 'TotalAmountComponent',
      math_object: '课桌总价',
      visual_object: '课桌、钱币',
    },
    {
      step: 2,
      type: '求总价',
      component: 'TotalAmountComponent',
      math_object: '椅子总价',
      visual_object: '椅子、钱币',
    },
    {
      step: 3,
      type: '求和',
      component: 'GenericLogicComponent',
      math_object: '课桌总价 + 椅子总价',
      visual_object: '总金额',
    },
  ],
}

export default function ComponentPreviewPage() {
  return (
    <div className="bg-[#FAFAFA] p-0 text-[#171717]">
      <BasicPage
        question_text={questionText}
        math_analysis_json={mathAnalysisJson}
        logic_analysis_json={logicAnalysisJson}
        tutor_analysis_json={tutorAnalysisJson}
      />
    </div>
  )
}
