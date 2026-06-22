import { query, insert, updateWhere } from './supabase-admin.js'

function nowIso() {
  return new Date().toISOString()
}

async function fetchPlanById(planId) {
  const { data, error } = await query('plans', {
    filters: { id: planId },
    select: 'id,code,name,duration_days,generation_limit,status',
    limit: 1,
  })
  if (error) throw error
  return data?.[0] || null
}

async function fetchPlanByCode(code) {
  const { data, error } = await query('plans', {
    filters: { code },
    select: 'id,code,name,duration_days,generation_limit,status',
    limit: 1,
  })
  if (error) throw error
  return data?.[0] || null
}

async function fetchActiveSubscription(userId) {
  const { data, error } = await query('active_subscriptions', {
    filters: { user_id: userId },
    select: 'id,user_id,plan_id,plan_code,plan_name,generation_limit,permissions,status,start_at,expire_at',
    limit: 1,
  })
  if (error) throw error
  return data?.[0] || null
}

async function fetchGenerationRow(userId) {
  const { data, error } = await query('user_generations', {
    filters: { user_id: userId },
    select: 'id,user_id,total_count,used_count',
    limit: 1,
  })
  if (error) throw error
  return data?.[0] || null
}

async function upsertGenerationRow(userId, totalCount, usedCount = 0) {
  const existing = await fetchGenerationRow(userId)
  const payload = {
    user_id: userId,
    total_count: Math.max(0, Number(totalCount || 0)),
    used_count: Math.max(0, Number(usedCount || 0)),
    updated_at: nowIso(),
  }

  if (!existing) {
    const { data, error } = await insert('user_generations', payload)
    if (error) throw error
    return data?.[0] || null
  }

  const { data, error } = await updateWhere('user_generations', { user_id: userId }, payload)
  if (error) throw error
  return data?.[0] || null
}

async function cancelActiveSubscriptions(userId) {
  await updateWhere('subscriptions', { user_id: userId, status: 'active' }, { status: 'cancelled' }).catch(() => {})
}

export async function ensureSubscriptionForPlan(userId, planId, { resetUsage = true } = {}) {
  const plan = await fetchPlanById(planId)
  if (!plan) throw new Error('套餐不存在')

  await cancelActiveSubscriptions(userId)

  const now = new Date()
  const durationDays = Number(plan.duration_days || 0)
  const expireAt = durationDays > 0
    ? new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000)
    : null

  const { data, error } = await insert('subscriptions', {
    user_id: userId,
    plan_id: plan.id,
    status: 'active',
    start_at: nowIso(),
    expire_at: expireAt ? expireAt.toISOString() : null,
  })
  if (error) throw error

  await upsertGenerationRow(userId, plan.generation_limit || 0, resetUsage ? 0 : (await fetchGenerationRow(userId))?.used_count || 0)
  return data?.[0] || null
}

export async function ensureBasicSubscription(userId) {
  const active = await fetchActiveSubscription(userId)
  if (active) {
    await upsertGenerationRow(userId, active.generation_limit || 0, (await fetchGenerationRow(userId))?.used_count || 0)
    return active
  }

  const basicPlan = await fetchPlanByCode('basic')
  if (!basicPlan || basicPlan.status !== 'active') return null
  return ensureSubscriptionForPlan(userId, basicPlan.id, { resetUsage: true })
}

export async function syncGenerationQuotaFromActiveSubscription(userId) {
  const active = await fetchActiveSubscription(userId)
  if (!active) return null
  return upsertGenerationRow(userId, active.generation_limit || 0, (await fetchGenerationRow(userId))?.used_count || 0)
}

export async function getGenerationStatus(userId) {
  const active = await fetchActiveSubscription(userId)
  const row = await fetchGenerationRow(userId)
  if (!active && !row) return null

  const totalCount = Number(row?.total_count ?? active?.generation_limit ?? 0)
  const usedCount = Number(row?.used_count ?? 0)
  return {
    totalCount,
    usedCount,
    remainingCount: Math.max(totalCount - usedCount, 0),
  }
}

export async function consumeGeneration(userId) {
  const active = await fetchActiveSubscription(userId)
  let row = await fetchGenerationRow(userId)

  if (!row) {
    if (!active) return { success: false, error: 'no_quota' }
    row = await upsertGenerationRow(userId, active.generation_limit || 0, 0)
  }

  const totalCount = Number(row.total_count || active?.generation_limit || 0)
  const usedCount = Number(row.used_count || 0)
  if (totalCount <= 0) {
    return { success: false, error: 'no_quota' }
  }
  if (usedCount >= totalCount) {
    return { success: false, error: 'quota_exceeded', totalCount, usedCount }
  }

  const nextUsed = usedCount + 1
  const updated = await upsertGenerationRow(userId, totalCount, nextUsed)
  return {
    success: true,
    totalCount,
    usedCount: nextUsed,
    remainingCount: Math.max(totalCount - nextUsed, 0),
    row: updated,
  }
}

export async function ensureGenerationRecordForPlan(userId, planId) {
  const plan = await fetchPlanById(planId)
  if (!plan) return null
  return upsertGenerationRow(userId, plan.generation_limit || 0, 0)
}
