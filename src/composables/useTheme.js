// 深浅主题切换：Naive 主题对象 + CSS 变量注入 + localStorage 持久化
import { computed, ref, watchEffect } from 'vue'
import { darkTheme } from 'naive-ui'
import { lightTokens, darkTokens, buildThemeOverrides, FONT_UI, FONT_MONO } from '@/styles/theme'
import { THEME_STORAGE_KEY } from '@/config'

const MODE_KEY = THEME_STORAGE_KEY

function initialMode() {
  if (typeof window === 'undefined') return 'light'
  const saved = localStorage.getItem(MODE_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  // 未设置过 → 跟随系统
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

const mode = ref(initialMode())

/** 令牌 → CSS 变量，注入 <html>；自定义组件统一消费这些变量 */
function applyCssVars(t) {
  const root = document.documentElement
  const map = {
    '--font-ui': FONT_UI,
    '--font-mono': FONT_MONO,
    '--bg-page': t.bgPage,
    '--bg-surface': t.bgSurface,
    '--bg-hover': t.bgHover,
    '--bg-subtle': t.bgSubtle,
    '--border': t.border,
    '--border-strong': t.borderStrong,
    '--text-primary': t.textPrimary,
    '--text-secondary': t.textSecondary,
    '--text-tertiary': t.textTertiary,
    '--primary': t.primary,
    '--primary-hover': t.primaryHover,
    '--primary-soft': t.primarySoft,
    '--success': t.success,
    '--success-soft': t.successSoft,
    '--warning': t.warning,
    '--warning-soft': t.warningSoft,
    '--danger': t.danger,
    '--danger-soft': t.dangerSoft,
    '--tool-idle': t.toolIdle,
    '--tool-ok': t.toolOk,
    '--tool-fail': t.toolFail,
    '--shadow-card': t.shadowCard,
    '--shadow-card-hover': t.shadowCardHover,
    '--shadow-modal': t.shadowModal,
    '--perm-l1-text': t.perm.l1.text,
    '--perm-l1-bg': t.perm.l1.bg,
    '--perm-l1-border': t.perm.l1.border,
    '--perm-l2-text': t.perm.l2.text,
    '--perm-l2-bg': t.perm.l2.bg,
    '--perm-l2-border': t.perm.l2.border,
    '--perm-l3-text': t.perm.l3.text,
    '--perm-l3-bg': t.perm.l3.bg,
    '--perm-l3-border': t.perm.l3.border,
  }
  for (const [k, v] of Object.entries(map)) {
    root.style.setProperty(k, v)
  }
}

const isDark = computed(() => mode.value === 'dark')

/** Naive UI 主题对象（null = 浅色） */
const theme = computed(() => (isDark.value ? darkTheme : null))

const themeOverrides = computed(() => buildThemeOverrides(isDark.value ? darkTokens : lightTokens))

function toggle() {
  mode.value = isDark.value ? 'light' : 'dark'
}

function setMode(m) {
  if (m === 'light' || m === 'dark') mode.value = m
}

// 主题变化时注入 CSS 变量并持久化到 localStorage（刷新后保持选择）
watchEffect(() => {
  if (typeof document !== 'undefined') {
    applyCssVars(isDark.value ? darkTokens : lightTokens)
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem(MODE_KEY, mode.value)
  }
})

export function useTheme() {
  return { mode, isDark, theme, themeOverrides, toggle, setMode }
}
