// 目录接口（后端实现后生效；未实现时返回错误由调用方降级）
import http from './http'

/** 列出 path 下的子目录；path 缺省/空 → 返回可选根（Windows 盘符） */
export function listDirs(path = '') {
  return http.get('/api/fs/dirs', {
    params: path ? { path } : {},
  })
}

/** 按文件夹名解析绝对路径（原生文件夹选择器配套）：返回 { name, matches: [...] } */
export function resolveDir(name) {
  return http.get('/api/fs/resolve', { params: { name } })
}
