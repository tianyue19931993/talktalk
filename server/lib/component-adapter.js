const COMPONENT_NAMES = new Set(['Combine', 'Separate', 'Replicate', 'Partition'])

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function normalizeMathObject(value = {}) {
  return {
    label: typeof value?.name === 'string' ? value.name : '',
    value: value?.value ?? null,
    unit: typeof value?.unit === 'string' ? value.unit : '',
  }
}

export function compileToComponentScript(mathJson, logicJson) {
  const mathStages = toArray(mathJson?.logic_stages)
  const logicBlocks = toArray(logicJson?.logic_blocks)

  return mathStages.map((mathStep, index) => {
    const step = mathStep?.step ?? index + 1
    const logicBlock = logicBlocks.find((block) => Number.parseInt(block?.step, 10) === Number(step))
    const componentName = COMPONENT_NAMES.has(logicBlock?.component)
      ? logicBlock.component
      : 'Combine'
    const mathObjects = toArray(mathStep?.math_object)
    const obj1 = normalizeMathObject(mathObjects[0])
    const obj2 = normalizeMathObject(mathObjects[1])
    const stepAnswer = mathStep?.step_answer || {}

    const barConfig = {
      formula: typeof mathStep?.formula_tag === 'string' ? mathStep.formula_tag : '',
      component: componentName,
      step_info: {
        current: step,
        answer_name: typeof stepAnswer.name === 'string' ? stepAnswer.name : '',
        answer_value: stepAnswer.value ?? null,
        unit: typeof stepAnswer.unit === 'string' ? stepAnswer.unit : '',
      },
    }

    switch (componentName) {
      case 'Combine':
        barConfig.bars = [
          { ...obj1, color: '#7928CA' },
          { ...obj2, color: '#FF0080' },
        ]
        barConfig.interaction = 'drag_merge'
        break
      case 'Separate':
        barConfig.bars = [
          { ...obj1, type: 'total', color: '#7928CA' },
          { ...obj2, type: 'cut_part', color: '#94A3B8' },
        ]
        barConfig.interaction = 'scissors_cut'
        break
      case 'Replicate':
        barConfig.bars = [{ ...obj1, color: '#7928CA' }]
        barConfig.multiplier = obj2.value
        barConfig.interaction = 'pull_replicate'
        break
      case 'Partition':
        barConfig.bars = [{ ...obj1, type: 'total', color: '#F59E0B' }]
        barConfig.parts = obj2.value
        barConfig.interaction = 'slice_divide'
        break
      default:
        break
    }

    return barConfig
  })
}
