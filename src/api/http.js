// axios 实例：统一解包 {code, message, data}
// 默认走 vite 代理（/api → http://127.0.0.1:8000）；排障时可用 VITE_API_BASE 直连后端
import axios from 'axios'

const http = axios.create({
  timeout: 30000,
})

http.interceptors.response.use(
  (res) => {
    const body = res.data
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code === 0) return body.data
      const err = new Error(body.message || '请求失败')
      err.code = body.code
      return Promise.reject(err)
    }
    return body
  },
  (err) => {
    // HTTP 层错误（400/404/409/500…）：优先取后端响应体中的 message
    const body = err.response?.data || {}
    const status = err.response?.status

    // FastAPI HTTPException(detail=dict) 形式：{detail: {conflict, message, current, expected}}
    // 以及统一格式 body 直接携带这些字段的情况，都做提取
    const d = body.detail && typeof body.detail === 'object' && !Array.isArray(body.detail) ? body.detail : {}

    const e = new Error(body.message || d.message || d.msg || body.detail || err.message || '网络错误，请确认后端已启动')
    e.code = body.code ?? d.code
    e.status = status
    // 冲突标记与差异内容（撤销冲突场景：409 + conflict:true）
    if (body.conflict === true || d.conflict === true) e.conflict = true
    if (body.current != null) e.current = body.current
    else if (d.current != null) e.current = d.current
    if (body.expected != null) e.expected = body.expected
    else if (d.expected != null) e.expected = d.expected
    return Promise.reject(e)
  },
)

export default http
