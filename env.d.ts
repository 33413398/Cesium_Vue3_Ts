// 环境变量类型
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_APP_ENV: string
  readonly VITE_BASE_URL: string
  readonly VITE_CESIUM_BASE_URL: string
  readonly VITE_TDT_KEY: string
  // 更多环境变量...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
