// SSE 事件流工厂
// 生命周期铁律：task_done / error 后必须手动 es.close()（后端关连接，浏览器默认会 3 秒重连）
export function createEventSource(sessionId, { onEvent, onError }) {
  const es = new EventSource(`/api/sessions/${sessionId}/events`)

  es.onmessage = (e) => {
    let ev
    try {
      ev = JSON.parse(e.data)
    } catch {
      return
    }
    onEvent?.(ev)
  }

  es.onerror = () => onError?.(es)

  return es
}
