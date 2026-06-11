// 认证与订阅状态管理
import { useState, useEffect } from 'react'
import { ensureValidSession, clearSession, getProfile, getActiveSubscription, hasStoredSession } from '../lib/supabase-auth'
import type { Profile, Subscription } from '../types/auth'

// ============================================================
// 全局状态（发布-订阅模式，与 appStore 风格一致）
// ============================================================

let currentUser: Profile | null = null
let currentSubscription: Subscription | null = null
let initialized = false
let loading = false
let listeners: Array<() => void> = []

export function subscribe(fn: () => void) {
  listeners.push(fn)
  return () => { listeners = listeners.filter((f) => f !== fn) }
}

function notify() { listeners.forEach((fn) => fn()) }

// ============================================================
// 初始化：加载缓存的 session + 拉取 profile / 订阅
// ============================================================

if (hasStoredSession()) {
  loadUserData()
}

async function loadUserData() {
  if (loading || initialized) return
  loading = true

  try {
    // 第一步：获取有效 session（过期自动刷新 token）
    const session = await ensureValidSession()
    if (!session) {
      // 无有效 session（没登录 / token 过期且刷新失败）
      clearSession()
      currentUser = null
      currentSubscription = null
      initialized = true
      loading = false
      notify()
      return
    }

    // 检查订阅是否过期（服务端自动标记 expired）
    try {
      await fetch('/api/subscription/check', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      })
    } catch {}

    const [profileRes, subRes] = await Promise.all([
      getProfile(),
      getActiveSubscription(),
    ])

    if (profileRes.data) {
      if (profileRes.data.status === 'disabled') {
        // 账号已被禁用
        clearSession()
        currentUser = null
        currentSubscription = null
      } else {
        currentUser = profileRes.data
      }
    } else {
      // session 已过期或无效
      clearSession()
      currentUser = null
      currentSubscription = null
    }

    currentSubscription = subRes.data || null
  } catch (e) {
    console.warn('[authStore] load failed:', e)
  }

  initialized = true
  loading = false
  notify()
}

// ============================================================
// 公开方法
// ============================================================

export function getUser(): Profile | null { return currentUser }
export function getSubscription(): Subscription | null { return currentSubscription }

/** 手动刷新用户数据（登录/登出后调用） */
export async function refreshUserData() {
  initialized = false
  loading = false
  currentUser = null
  currentSubscription = null

  if (hasStoredSession()) {
    await loadUserData()
  }

  notify()
}

/** 清除所有状态（登出时调用） */
export function resetAuth() {
  currentUser = null
  currentSubscription = null
  initialized = false
  loading = false
  clearSession()
  notify()
}

// ============================================================
// React Hook
// ============================================================

export function useAuth() {
  const [, setTick] = useState(0)

  useEffect(() => {
    const unsub = subscribe(() => setTick((t) => t + 1))
    return unsub
  }, [])

  return {
    user: currentUser,
    subscription: currentSubscription,
    isLoggedIn: !!currentUser,
    isLoading: !initialized && hasStoredSession(),
    isAdmin: currentUser?.role === 'admin',
  }
}
