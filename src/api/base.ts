import { http } from '../utils/http'

// 获取撒点静态数据
export const getGeojson = (url: string) => {
  return http.request('get', url)
}
