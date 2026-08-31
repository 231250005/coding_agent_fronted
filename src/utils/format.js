// 展示格式化与状态归一化
import { ShieldCheckmarkOutline, FlashOutline, RocketOutline } from '@vicons/ionicons5'

/**
 * 三级权限的展示元信息（面向普通用户的文案）：
 * 默认模式 L1（逐步确认）/ 代理模式 L2（自动执行可撤销）/ 自动模式 L3（自动 + git 提交）
 * 色相分离：L1 琥珀 / L2 蓝 / L3 紫
 */
export const PERM_META = {
  1: {
    label: '默认模式',
    short: '默认',
    level: 'L1',
    icon: ShieldCheckmarkOutline,
    desc: '每步文件修改都先征求你的确认，最安全',
    cls: 'perm-l1',
  },
  2: {
    label: '代理模式',
    short: '代理',
    level: 'L2',
    icon: FlashOutline,
    desc: '自动执行所有步骤，文件变更可对比、可撤销',
    cls: 'perm-l2',
  },
  3: {
    label: '自动模式',
    short: '自动',
    level: 'L3',
    icon: RocketOutline,
    desc: '自动执行，任务完成后自动提交 git 变更',
    cls: 'perm-l3',
  },
}

/**
 * 变更状态归一化展示。
 * 注意：SSE change_status 事件中确认后状态为 "confirmed"，REST 接口中为 "applied"，
 * 两者语义一致，统一归一为 applied。
 */
export const STATUS_META = {
  pending: { label: '待确认', color: 'warning' },
  confirmed: { label: '已应用', color: 'success', norm: 'applied' },
  applied: { label: '已应用', color: 'success' },
  rejected: { label: '已拒绝', color: 'error' },
  reverted: { label: '已撤销', color: 'default' },
}

/** 归一化：confirmed → applied；其余原样返回 */
export function normalizeStatus(s) {
  if (!s) return 'pending'
  return STATUS_META[s]?.norm || s
}

export function statusLabel(s) {
  return STATUS_META[normalizeStatus(s)]?.label || s
}

/** 工具操作名中文化：write 视为新建文件，其余改文件的视为修改 */
export const OPERATION_META = {
  write: '新建',
  write_file: '新建',
  edit: '修改',
  patch: '修改',
  replace: '修改',
  delete: '删除',
  mkdir: '创建目录',
  move: '移动',
}

export function operationLabel(op) {
  return OPERATION_META[op] || op || '变更'
}

/** 12000 → "12k" */
export function formatTokens(n) {
  if (n == null) return '-'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k'
  return String(n)
}

/** 工具参数 JSON 美化展示（解析失败原样返回） */
export function prettyJson(str) {
  if (str == null || str === '') return ''
  try {
    return JSON.stringify(JSON.parse(str), null, 2)
  } catch {
    return String(str)
  }
}
