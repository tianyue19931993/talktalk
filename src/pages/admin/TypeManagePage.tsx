import { useState, useEffect } from 'react'
import { getTypes, addType, updateType, deleteType, subscribe, refreshStore } from '../../stores/appStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Plus, Pencil, Trash2, Check, X, BookType, FileText } from 'lucide-react'
import type { QuestionType } from '../../types'
import {
  COMPONENT_GROUPS,
  ComponentPickerPreviewHelp,
  splitComponentValue,
  joinComponentValue,
  ComponentMultiSelectPill,
} from '../../components/admin/questionTypeComponentCatalog'

export default function TypeManagePage() {
  const [, setTick] = useState(0)

  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCoreDiscovery, setNewCoreDiscovery] = useState('')
  const [newAnalysisPrompt, setNewAnalysisPrompt] = useState('')
  const [newHtmlPrompt, setNewHtmlPrompt] = useState('')
  const [newDiscoveryFlow, setNewDiscoveryFlow] = useState('')
  const [newInteractionFlow, setNewInteractionFlow] = useState('')
  const [newAnimationFlow, setNewAnimationFlow] = useState('')
  const [newLayoutComponent, setNewLayoutComponent] = useState('')
  const [newControlComponent, setNewControlComponent] = useState('')
  const [newVisualComponent, setNewVisualComponent] = useState('')
  const [newAnimationComponent, setNewAnimationComponent] = useState('')
  const [newDefaultAssets, setNewDefaultAssets] = useState('[]')
  const [newPageSchemaVersion, setNewPageSchemaVersion] = useState('1')
  const [newComponentRules, setNewComponentRules] = useState('{}')
  const [newFallbackStrategy, setNewFallbackStrategy] = useState('{}')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCoreDiscovery, setEditCoreDiscovery] = useState('')
  const [editAnalysisPrompt, setEditAnalysisPrompt] = useState('')
  const [editHtmlPrompt, setEditHtmlPrompt] = useState('')
  const [editDiscoveryFlow, setEditDiscoveryFlow] = useState('')
  const [editInteractionFlow, setEditInteractionFlow] = useState('')
  const [editAnimationFlow, setEditAnimationFlow] = useState('')
  const [editLayoutComponent, setEditLayoutComponent] = useState('')
  const [editControlComponent, setEditControlComponent] = useState('')
  const [editVisualComponent, setEditVisualComponent] = useState('')
  const [editAnimationComponent, setEditAnimationComponent] = useState('')
  const [editDefaultAssets, setEditDefaultAssets] = useState('[]')
  const [editPageSchemaVersion, setEditPageSchemaVersion] = useState('1')
  const [editComponentRules, setEditComponentRules] = useState('{}')
  const [editFallbackStrategy, setEditFallbackStrategy] = useState('{}')

  const [deleteTarget, setDeleteTarget] = useState<QuestionType | null>(null)

  const [showBatchForm, setShowBatchForm] = useState(false)
  const [batchText, setBatchText] = useState('')

  const parseJsonField = (value: string, fallback: any) => {
    const trimmed = value.trim()
    if (!trimmed) return fallback
    try {
      return JSON.parse(trimmed)
    } catch {
      return fallback
    }
  }

  const selectedLabelMap = (groupIndex: number) => {
    return new Map(COMPONENT_GROUPS[groupIndex].choices.map((item) => [item.key, item]))
  }

  function ComponentMultiSelect({
    label,
    helper,
    value,
    onChange,
    groupIndex,
  }: {
    label: string
    helper: string
    value: string
    onChange: (value: string) => void
    groupIndex: number
  }) {
    const group = COMPONENT_GROUPS[groupIndex]
    const selected = splitComponentValue(value)
    const selectedMap = selectedLabelMap(groupIndex)
    const toggle = (key: string) => {
      const next = selected.includes(key)
        ? selected.filter((item) => item !== key)
        : [...selected, key]
      onChange(joinComponentValue(next))
    }

    return (
      <div className="rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-[var(--color-body)]">{label}</div>
            <div className="text-[11px] text-[var(--color-mute)]">{helper}</div>
          </div>
          <div className="rounded-full bg-white px-2 py-0.5 text-[10px] text-[var(--color-body)]">
            {selected.length > 0 ? `${selected.length} 选中` : '未选'}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.length === 0 ? (
            <span className="text-[11px] text-[var(--color-mute)]">点击选择，支持多选</span>
          ) : (
            selected.map((key) => {
              const item = selectedMap.get(key)
              return (
                <ComponentMultiSelectPill
                  key={key}
                  value={key}
                  label={item ? `${item.zh} / ${item.en}` : key}
                  onRemove={() => {
                    const next = selected.filter((itemKey) => itemKey !== key)
                    onChange(joinComponentValue(next))
                  }}
                />
              )
            })
          )}
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {group.choices.map((choice) => {
            const active = selected.includes(choice.key)
            return (
              <button
                key={choice.key}
                type="button"
                onClick={() => toggle(choice.key)}
                className={`rounded-[18px] border p-3 text-left transition-all ${
                  active
                    ? 'border-[var(--color-link)] bg-[var(--color-link-bg-soft)] shadow-[0_10px_24px_rgba(0,112,243,0.08)]'
                    : 'border-[var(--color-hairline)] bg-white hover:border-[var(--color-link)]/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-[var(--color-ink)]">{choice.zh}</div>
                    <div className="text-[11px] text-[var(--color-mute)]">{choice.en}</div>
                  </div>
                  <span className="rounded-full bg-[var(--color-canvas-soft)] px-2 py-0.5 text-[10px] text-[var(--color-body)]">
                    {active ? '已选' : '可选'}
                  </span>
                </div>
                <div className="mt-2 text-[11px] leading-5 text-[var(--color-body)]">{choice.description}</div>
                <div className="mt-2 overflow-hidden rounded-[14px] border border-[var(--color-hairline)] bg-white p-1">
                  {choice.preview}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  useEffect(() => {
    // 页面挂载时刷新数据
    refreshStore()
    const unsub = subscribe(() => setTick((t) => t + 1))
    return unsub
  }, [])

  const types = getTypes()

  const handleAdd = () => {
    if (!newName.trim()) return
    addType({
      name: newName.trim(),
      coreDiscovery: newCoreDiscovery.trim(),
      analysisPrompt: newAnalysisPrompt.trim(),
      htmlPrompt: newHtmlPrompt.trim(),
      discoveryFlow: newDiscoveryFlow.trim(),
      interactionFlow: newInteractionFlow.trim(),
      animationFlow: newAnimationFlow.trim(),
      layoutComponent: newLayoutComponent.trim(),
      controlComponent: newControlComponent.trim(),
      visualComponent: newVisualComponent.trim(),
      animationComponent: newAnimationComponent.trim(),
      defaultAssets: parseJsonField(newDefaultAssets, []),
      pageSchemaVersion: Number(newPageSchemaVersion) || 1,
      componentRules: parseJsonField(newComponentRules, {}),
      fallbackStrategy: parseJsonField(newFallbackStrategy, {}),
    })
    setNewName('')
    setNewCoreDiscovery('')
    setNewAnalysisPrompt('')
    setNewHtmlPrompt('')
    setShowNewForm(false)
    setNewDiscoveryFlow('')
    setNewInteractionFlow('')
    setNewAnimationFlow('')
    setNewLayoutComponent('')
    setNewControlComponent('')
    setNewVisualComponent('')
    setNewAnimationComponent('')
    setNewDefaultAssets('[]')
    setNewPageSchemaVersion('1')
    setNewComponentRules('{}')
    setNewFallbackStrategy('{}')
  }

  const startEdit = (t: QuestionType) => {
    setEditingId(t.id)
    setEditName(t.name)
    setEditCoreDiscovery(t.coreDiscovery || '')
    setEditAnalysisPrompt(t.analysisPrompt || '')
    setEditHtmlPrompt(t.htmlPrompt || '')
    setEditDiscoveryFlow(t.discoveryFlow || '')
    setEditInteractionFlow(t.interactionFlow || '')
    setEditAnimationFlow(t.animationFlow || '')
    setEditLayoutComponent(t.layoutComponent || '')
    setEditControlComponent(t.controlComponent || '')
    setEditVisualComponent(t.visualComponent || '')
    setEditAnimationComponent(t.animationComponent || '')
    setEditDefaultAssets(JSON.stringify(t.defaultAssets || [], null, 2))
    setEditPageSchemaVersion(String(t.pageSchemaVersion || 1))
    setEditComponentRules(JSON.stringify(t.componentRules || {}, null, 2))
    setEditFallbackStrategy(JSON.stringify(t.fallbackStrategy || {}, null, 2))
  }

  const handleUpdate = () => {
    if (!editingId || !editName.trim()) return
    updateType(editingId, {
      name: editName.trim(),
      coreDiscovery: editCoreDiscovery.trim(),
      analysisPrompt: editAnalysisPrompt.trim(),
      htmlPrompt: editHtmlPrompt.trim(),
      discoveryFlow: editDiscoveryFlow.trim(),
      interactionFlow: editInteractionFlow.trim(),
      animationFlow: editAnimationFlow.trim(),
      layoutComponent: editLayoutComponent.trim(),
      controlComponent: editControlComponent.trim(),
      visualComponent: editVisualComponent.trim(),
      animationComponent: editAnimationComponent.trim(),
      defaultAssets: parseJsonField(editDefaultAssets, []),
      pageSchemaVersion: Number(editPageSchemaVersion) || 1,
      componentRules: parseJsonField(editComponentRules, {}),
      fallbackStrategy: parseJsonField(editFallbackStrategy, {}),
    })
    setEditingId(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditCoreDiscovery('')
    setEditDiscoveryFlow('')
    setEditInteractionFlow('')
    setEditAnimationFlow('')
    setEditLayoutComponent('')
    setEditControlComponent('')
    setEditVisualComponent('')
    setEditAnimationComponent('')
    setEditDefaultAssets('[]')
    setEditPageSchemaVersion('1')
    setEditComponentRules('{}')
    setEditFallbackStrategy('{}')
  }

  const handleDelete = () => {
    if (deleteTarget) {
      deleteType(deleteTarget.id)
      setDeleteTarget(null)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BookType className="w-5 h-5 text-[var(--color-ink)]" />
          <h1 className="text-lg font-semibold text-[var(--color-ink)]">题型管理</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowBatchForm(true)}>
            <FileText className="w-4 h-4" />
            批量新增题型
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowNewForm(true)}>
            <Plus className="w-4 h-4" />
            新增题型
          </Button>
        </div>
      </div>

      {/* Inline new type form */}
      {showNewForm && (
        <div className="bg-[var(--color-canvas)] rounded-[var(--radius-xl)] shadow-[var(--shadow-l2)] p-5 mb-4">
          <ComponentPickerPreviewHelp />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <Input
              placeholder="题型名称"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
            <Input
              placeholder="core_discovery（分类锚点）"
              value={newCoreDiscovery}
              onChange={(e) => setNewCoreDiscovery(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 mb-3">
            <textarea
              placeholder="题目分析 prompt（可选）"
              value={newAnalysisPrompt}
              onChange={(e) => setNewAnalysisPrompt(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-md)]
                text-[var(--color-ink)] placeholder:text-[var(--color-mute)] font-mono text-xs
                focus:outline-none focus:border-[var(--color-link)] transition-colors resize-y"
            />
            <div className="flex flex-col gap-1 mb-1">
              <label className="text-xs font-medium text-[var(--color-body)]">HTML prompt</label>
            </div>
            <textarea
              placeholder="给 AI 的 HTML 生成提示词，系统会自动传入分析数据"
              value={newHtmlPrompt}
              onChange={(e) => setNewHtmlPrompt(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 text-sm bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-md)]
                text-[var(--color-ink)] placeholder:text-[var(--color-mute)] font-mono text-xs
                focus:outline-none focus:border-[var(--color-link)] transition-colors resize-y"
            />
          </div>

          {/* 三个流程字段 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-body)]">🧠 discovery_flow（思维引导）</label>
            <textarea
              placeholder="设计孩子脑子里的路..."
              value={newDiscoveryFlow}
              onChange={(e) => setNewDiscoveryFlow(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-md)]
                text-[var(--color-ink)] placeholder:text-[var(--color-mute)] font-mono text-xs
                focus:outline-none focus:border-[var(--color-link)] transition-colors resize-y"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-body)]">👆 interaction_flow（交互操作）</label>
            <textarea
              placeholder="设计孩子手上的路..."
              value={newInteractionFlow}
              onChange={(e) => setNewInteractionFlow(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-md)]
                text-[var(--color-ink)] placeholder:text-[var(--color-mute)] font-mono text-xs
                focus:outline-none focus:border-[var(--color-link)] transition-colors resize-y"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-body)]">👀 animation_flow（视觉呈现）</label>
            <textarea
              placeholder="设计孩子眼睛看到的路..."
              value={newAnimationFlow}
              onChange={(e) => setNewAnimationFlow(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-md)]
                text-[var(--color-ink)] placeholder:text-[var(--color-mute)] font-mono text-xs
                focus:outline-none focus:border-[var(--color-link)] transition-colors resize-y"
            />
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <ComponentMultiSelect
              label="Layout / Scene"
              helper="页面骨架"
              value={newLayoutComponent}
              onChange={setNewLayoutComponent}
              groupIndex={0}
            />
            <ComponentMultiSelect
              label="操作控件"
              helper="孩子怎么操作"
              value={newControlComponent}
              onChange={setNewControlComponent}
              groupIndex={1}
            />
            <ComponentMultiSelect
              label="数学视觉"
              helper="怎么表达数量和关系"
              value={newVisualComponent}
              onChange={setNewVisualComponent}
              groupIndex={2}
            />
            <ComponentMultiSelect
              label="动画积木"
              helper="页面怎么演"
              value={newAnimationComponent}
              onChange={setNewAnimationComponent}
              groupIndex={3}
            />
          </div>
          <details className="mt-4 rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] p-4">
            <summary className="cursor-pointer text-sm font-medium text-[var(--color-ink)]">高级配置</summary>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder="page_schema_version"
                value={newPageSchemaVersion}
                onChange={(e) => setNewPageSchemaVersion(e.target.value)}
              />
              <Input
                placeholder="core_discovery（分类锚点）"
                value={newCoreDiscovery}
                onChange={(e) => setNewCoreDiscovery(e.target.value)}
              />
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <label className="text-xs font-medium text-[var(--color-body)]">default_assets（JSON）</label>
              <textarea
                placeholder='[{"name":"AppleIcon","label":"苹果"}]'
                value={newDefaultAssets}
                onChange={(e) => setNewDefaultAssets(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-md)]
                  text-[var(--color-ink)] placeholder:text-[var(--color-mute)] font-mono text-xs
                  focus:outline-none focus:border-[var(--color-link)] transition-colors resize-y"
              />
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <label className="text-xs font-medium text-[var(--color-body)]">component_rules（JSON）</label>
              <textarea
                placeholder='{"required_components":["MCard"]}'
                value={newComponentRules}
                onChange={(e) => setNewComponentRules(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-md)]
                  text-[var(--color-ink)] placeholder:text-[var(--color-mute)] font-mono text-xs
                  focus:outline-none focus:border-[var(--color-link)] transition-colors resize-y"
              />
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <label className="text-xs font-medium text-[var(--color-body)]">fallback_strategy（JSON）</label>
              <textarea
                placeholder='{"layout":"TwoColumnLayout","control":"ClickControl"}'
                value={newFallbackStrategy}
                onChange={(e) => setNewFallbackStrategy(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-md)]
                  text-[var(--color-ink)] placeholder:text-[var(--color-mute)] font-mono text-xs
                  focus:outline-none focus:border-[var(--color-link)] transition-colors resize-y"
              />
            </div>
          </details>
          <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => { setShowNewForm(false); setNewName(''); setNewCoreDiscovery(''); setNewAnalysisPrompt(''); setNewHtmlPrompt(''); setNewDiscoveryFlow(''); setNewInteractionFlow(''); setNewAnimationFlow(''); setNewLayoutComponent(''); setNewControlComponent(''); setNewVisualComponent(''); setNewAnimationComponent(''); setNewDefaultAssets('[]'); setNewPageSchemaVersion('1'); setNewComponentRules('{}'); setNewFallbackStrategy('{}') }}>
                取消
              </Button>
            <Button variant="primary" size="sm" onClick={handleAdd}>
              创建
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-[var(--color-canvas)] rounded-[var(--radius-xl)] shadow-[var(--shadow-l2)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-hairline)]">
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">模板入口 / core_discovery</th>
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">流程</th>
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">组件配置</th>
              <th className="text-left text-xs font-medium text-[var(--color-mute)] px-4 py-3">Prompt</th>
              <th className="text-right text-xs font-medium text-[var(--color-mute)] px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {types.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-sm text-[var(--color-mute)]">
                  暂无题型数据
                </td>
              </tr>
            ) : (
              types.map((t) => {
                const layoutTags = splitComponentValue(t.layoutComponent || '')
                const controlTags = splitComponentValue(t.controlComponent || '')
                const visualTags = splitComponentValue(t.visualComponent || '')
                const animationTags = splitComponentValue(t.animationComponent || '')

                return (
                  <tr key={t.id} className="border-b border-[var(--color-hairline)] hover:bg-[var(--color-canvas-soft)] transition-colors align-top">
                    <td className="px-4 py-3 min-w-[220px]">
                      <div className="flex items-start gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[var(--color-ink)]">{t.name}</div>
                          <div className="mt-1 text-xs text-[var(--color-mute)] break-words">{t.coreDiscovery || '未填写 core_discovery'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 min-w-[220px]">
                      <div className="space-y-1 text-[11px] text-[var(--color-body)]">
                        {t.discoveryFlow && <div className="truncate"><span className="text-[var(--color-mute)]">discovery_flow:</span> {t.discoveryFlow}</div>}
                        {t.interactionFlow && <div className="truncate"><span className="text-[var(--color-mute)]">interaction_flow:</span> {t.interactionFlow}</div>}
                        {t.animationFlow && <div className="truncate"><span className="text-[var(--color-mute)]">animation_flow:</span> {t.animationFlow}</div>}
                        {!t.discoveryFlow && !t.interactionFlow && !t.animationFlow && <span className="text-[var(--color-mute)]">暂无流程</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 min-w-[260px]">
                      <div className="flex flex-wrap gap-2 text-[10px]">
                        {layoutTags.map((item) => (
                          <span key={item} className="rounded-full bg-[var(--color-link-bg-soft)] px-2 py-1 text-[var(--color-link)]">Layout: {item}</span>
                        ))}
                        {controlTags.map((item) => (
                          <span key={item} className="rounded-full bg-[var(--color-canvas-soft)] px-2 py-1 text-[var(--color-body)]">Control: {item}</span>
                        ))}
                        {visualTags.map((item) => (
                          <span key={item} className="rounded-full bg-[var(--color-canvas-soft)] px-2 py-1 text-[var(--color-body)]">Visual: {item}</span>
                        ))}
                        {animationTags.map((item) => (
                          <span key={item} className="rounded-full bg-[var(--color-canvas-soft)] px-2 py-1 text-[var(--color-body)]">Animation: {item}</span>
                        ))}
                        {!layoutTags.length && !controlTags.length && !visualTags.length && !animationTags.length && (
                          <span className="text-[var(--color-mute)]">暂无组件配置</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 min-w-[260px]">
                      <div className="space-y-1">
                        {t.analysisPrompt && (
                          <details>
                            <summary className="cursor-pointer text-xs text-[var(--color-link)] hover:opacity-80">分析 Prompt</summary>
                            <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap rounded-[var(--radius-sm)] bg-[var(--color-canvas-soft)] p-2 text-[10px] text-[var(--color-body)]">{t.analysisPrompt}</pre>
                          </details>
                        )}
                        {t.htmlPrompt && (
                          <details>
                            <summary className="cursor-pointer text-xs text-[var(--color-link)] hover:opacity-80">HTML Prompt</summary>
                            <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap rounded-[var(--radius-sm)] bg-[var(--color-canvas-soft)] p-2 text-[10px] text-[var(--color-body)]">{t.htmlPrompt}</pre>
                          </details>
                        )}
                        {!t.analysisPrompt && !t.htmlPrompt && <span className="text-xs text-[var(--color-mute)]">暂无 prompt</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => startEdit(t)}
                          className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-body)] hover:text-[var(--color-ink)] hover:bg-[var(--color-canvas-soft-2)] transition-colors cursor-pointer"
                          title="编辑"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(t)}
                          className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-body)] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-[var(--radius-xl)] bg-[var(--color-canvas)] p-5 shadow-[var(--shadow-l3)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-[var(--color-ink)]">编辑题型</h3>
                <p className="mt-1 text-xs text-[var(--color-mute)]">按表格方式查看和编辑，组件字段支持多选。</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={cancelEdit}>
                  取消
                </Button>
                <Button variant="primary" size="sm" onClick={handleUpdate}>
                  保存
                </Button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3 rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="题型名称" />
                  <Input value={editCoreDiscovery} onChange={(e) => setEditCoreDiscovery(e.target.value)} placeholder="core_discovery" />
                </div>
                <textarea
                  value={editDiscoveryFlow}
                  onChange={(e) => setEditDiscoveryFlow(e.target.value)}
                  placeholder="discovery_flow"
                  rows={2}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-white px-3 py-2 text-xs text-[var(--color-ink)] font-mono resize-y"
                />
                <textarea
                  value={editInteractionFlow}
                  onChange={(e) => setEditInteractionFlow(e.target.value)}
                  placeholder="interaction_flow"
                  rows={2}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-white px-3 py-2 text-xs text-[var(--color-ink)] font-mono resize-y"
                />
                <textarea
                  value={editAnimationFlow}
                  onChange={(e) => setEditAnimationFlow(e.target.value)}
                  placeholder="animation_flow"
                  rows={2}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-white px-3 py-2 text-xs text-[var(--color-ink)] font-mono resize-y"
                />
              </div>

              <div className="space-y-3">
                <ComponentMultiSelect
                  label="Layout / Scene"
                  helper="页面骨架"
                  value={editLayoutComponent}
                  onChange={setEditLayoutComponent}
                  groupIndex={0}
                />
                <ComponentMultiSelect
                  label="操作控件"
                  helper="操作方式"
                  value={editControlComponent}
                  onChange={setEditControlComponent}
                  groupIndex={1}
                />
                <ComponentMultiSelect
                  label="数学视觉"
                  helper="数学对象展示"
                  value={editVisualComponent}
                  onChange={setEditVisualComponent}
                  groupIndex={2}
                />
                <ComponentMultiSelect
                  label="动画积木"
                  helper="动效"
                  value={editAnimationComponent}
                  onChange={setEditAnimationComponent}
                  groupIndex={3}
                />
              </div>
            </div>

            <details className="mt-4 rounded-[var(--radius-xl)] border border-[var(--color-hairline)] bg-[var(--color-canvas-soft)] p-4">
              <summary className="cursor-pointer text-sm font-medium text-[var(--color-ink)]">高级配置</summary>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input value={editPageSchemaVersion} onChange={(e) => setEditPageSchemaVersion(e.target.value)} placeholder="page_schema_version" />
                <Input value={editDefaultAssets} onChange={(e) => setEditDefaultAssets(e.target.value)} placeholder="default_assets（JSON）" />
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <textarea
                  value={editComponentRules}
                  onChange={(e) => setEditComponentRules(e.target.value)}
                  placeholder="component_rules（JSON）"
                  rows={5}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-white px-3 py-2 text-xs text-[var(--color-ink)] font-mono resize-y"
                />
                <textarea
                  value={editFallbackStrategy}
                  onChange={(e) => setEditFallbackStrategy(e.target.value)}
                  placeholder="fallback_strategy（JSON）"
                  rows={5}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-white px-3 py-2 text-xs text-[var(--color-ink)] font-mono resize-y"
                />
              </div>
            </details>
          </div>
        </div>
      )}

      {/* Batch add modal */}
      {showBatchForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-[var(--color-canvas)] rounded-[var(--radius-xl)] shadow-[var(--shadow-l3)] p-6 max-w-lg w-full mx-4">
            <h3 className="text-base font-semibold text-[var(--color-ink)] mb-2">批量新增题型</h3>
            <p className="text-xs text-[var(--color-mute)] mb-4">每行或每个中文分号（；）分隔一个题型名称</p>
            <textarea
              placeholder={`格式：name 或 name|core_discovery\n例如：\n统一单位|不同单位必须先统一\n平均分配|总量平均分成若干份`}
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              rows={8}
              className="w-full px-4 py-2.5 text-sm bg-[var(--color-canvas-soft)] border border-[var(--color-hairline)] rounded-[var(--radius-md)]
                text-[var(--color-ink)] placeholder:text-[var(--color-mute)]
                focus:outline-none focus:border-[var(--color-ink)] focus:ring-1 focus:ring-[var(--color-ink)]
                transition-colors resize-y"
            />
            <div className="flex items-center justify-end gap-2 mt-4">
              <Button variant="secondary" size="sm" onClick={() => { setShowBatchForm(false); setBatchText('') }}>
                取消
              </Button>
              <Button variant="primary" size="sm" onClick={() => {
                const names = batchText
                  .replace(/\\n/g, '\n')
                  .split(/[；;\n]+/)
                  .map(s => s.trim())
                  .filter(Boolean)
                names.forEach((entry) => {
                  const [rawName, rawCoreDiscovery] = entry.split('|').map((s) => s.trim())
                  const name = rawName || ''
                  if (!name) return
                  addType({ name, coreDiscovery: rawCoreDiscovery || name })
                })
                setShowBatchForm(false)
                setBatchText('')
              }}>
                批量创建 ({batchText.split(/[；;\n]+/).map(s => s.trim()).filter(Boolean).length} 个)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-[var(--color-canvas)] rounded-[var(--radius-xl)] shadow-[var(--shadow-l3)] p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-[var(--color-ink)] mb-2">确认删除</h3>
            <p className="text-sm text-[var(--color-body)] mb-1">
              确定要删除题型「{deleteTarget.name}」吗？
            </p>
            <p className="text-xs text-[var(--color-mute)] mb-6">
              删除后，使用此题型的题目将变为未指定题型。
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>
                取消
              </Button>
              <Button variant="danger" size="sm" onClick={handleDelete}>
                删除
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
