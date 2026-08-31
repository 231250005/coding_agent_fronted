// 相对时间：刚刚 / 5 分钟前 / 昨天 14:30 / 2026-08-01
export function relTime(iso, now = Date.now()) {
  if (!iso) return ''
  // 支持：毫秒时间戳 / ISO 字符串 / "YYYY-MM-DD HH:mm:ss" 字符串
  const t = typeof iso === 'number' ? iso : new Date(String(iso).replace(' ', 'T')).getTime()
  if (Number.isNaN(t)) return String(iso)
  const diff = now - t
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} 小时前`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} 天前`
  const date = new Date(t)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function fullTime(iso) {
  if (!iso) return ''
  const t = new Date(String(iso).replace(' ', 'T'))
  if (Number.isNaN(t.getTime())) return iso
  const p = (n) => String(n).padStart(2, '0')
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())} ${p(t.getHours())}:${p(t.getMinutes())}`
}
