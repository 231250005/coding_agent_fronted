// 解析 diff 文本 → 行级结构 [{type:'meta'|'hunk'|'add'|'del'|'ctx', text}]
// 兼容 unified diff 与简化预览（- 旧行 / + 新行）
export function parseDiff(diffText) {
  if (!diffText) return []
  const lines = String(diffText).split('\n')
  const out = []
  for (const line of lines) {
    if (/^diff --git|^index |^--- |^\+\+\+ /.test(line)) {
      out.push({ type: 'meta', text: line })
    } else if (/^@@/.test(line)) {
      out.push({ type: 'hunk', text: line })
    } else if (line.startsWith('+')) {
      out.push({ type: 'add', text: line })
    } else if (line.startsWith('-')) {
      out.push({ type: 'del', text: line })
    } else {
      out.push({ type: 'ctx', text: line })
    }
  }
  return out
}

/** 无 diff 文本时的兜底：用 old/new 内容生成简易对比 */
export function buildSimpleDiff(oldContent, newContent) {
  const oldLines = (oldContent || '').split('\n')
  const newLines = (newContent || '').split('\n')
  const out = []
  if (oldLines.length === 0) {
    for (const l of newLines) out.push({ type: 'add', text: '+' + l })
    return out
  }
  // 简单逐行对比（长度差则按行数少的对齐）
  const n = Math.max(oldLines.length, newLines.length)
  for (let i = 0; i < n; i++) {
    const a = oldLines[i]
    const b = newLines[i]
    if (a === undefined) out.push({ type: 'add', text: '+' + b })
    else if (b === undefined) out.push({ type: 'del', text: '-' + a })
    else if (a === b) out.push({ type: 'ctx', text: ' ' + a })
    else {
      out.push({ type: 'del', text: '-' + a })
      out.push({ type: 'add', text: '+' + b })
    }
  }
  return out
}
