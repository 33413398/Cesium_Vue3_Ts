import { defineConfig, loadEnv, splitVendorChunkPlugin, PluginOption } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { createHtmlPlugin } from 'vite-plugin-html'
import vue from '@vitejs/plugin-vue'
import { viteExternalsPlugin } from 'vite-plugin-externals'
import { insertHtml, h } from 'vite-plugin-insert-html'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import compress from 'vite-plugin-compression'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // 设置第三个参数为 '' 来加载所有环境变量，而不管是否有 `VITE_` 前缀。
  // command  = serve 开发   = build 生产
  const envDir = '' // 环境变量文件的文件夹，相对于项目的路径，也可以用 nodejs 函数拼接绝对路径
  const env = loadEnv(mode, envDir, '')
  const { VITE_CESIUM_BASE_URL } = env

  const cesiumBaseUrl = VITE_CESIUM_BASE_URL

  // 默认 base 是 '/'
  const base = '/'

  //这个配置 为了在html中使用 环境变量
  const getViteEnv = (mode: string, target: string) => {
    return loadEnv(mode, envDir)[target]
  }

  const plugins: PluginOption = [
    vue(),
    createHtmlPlugin({
      inject: {
        data: {
          //将环境变量 VITE_APP_TITLE 赋值给 title 方便 html页面使用 title 获取系统标题
          title: getViteEnv(mode, 'VITE_APP_TITLE')
        }
      }
    }),
    splitVendorChunkPlugin(),
    viteExternalsPlugin({
      cesium: 'Cesium' // 外部化 cesium 依赖，之后全局访问形式是 window['Cesium']
    }),
    insertHtml({
      head: [
        // 生产模式使用 CDN 或已部署的 CesiumJS 在线库链接，开发模式用拷贝的库文件，根据 VITE_CESIUM_BASE_URL 自动拼接
        h('script', {
          // 因为涉及前端路径访问，所以开发模式最好显式拼接 base 路径，适配不同 base 路径的情况
          src:
            command === 'build' ? `${cesiumBaseUrl}Cesium.js` : `${base}${cesiumBaseUrl}Cesium.js`
        })
      ]
    }),
    AutoImport({
      resolvers: [ElementPlusResolver()]
    }),
    Components({
      resolvers: [ElementPlusResolver()]
    })
  ]

  if (command === 'serve') {
    // 开发模式，复制 node_modules 下的 cesium 依赖
    const cesiumLibraryRoot = 'node_modules/cesium/Build/CesiumUnminified/'
    const cesiumLibraryCopyToRootPath = 'libs/cesium/' // 相对于打包后的路径
    const cesiumStaticSourceCopyOptions = ['Assets', 'ThirdParty', 'Workers', 'Widgets'].map(
      (dirName) => {
        return {
          src: `${cesiumLibraryRoot}${dirName}/*`, // 注意后面的 * 字符，文件夹全量复制
          dest: `${cesiumLibraryCopyToRootPath}${dirName}`
        }
      }
    )
    plugins.push(
      viteStaticCopy({
        targets: [
          // 主库文件，开发时选用非压缩版的 IIFE 格式主库文件
          {
            src: `${cesiumLibraryRoot}Cesium.js`,
            dest: cesiumLibraryCopyToRootPath
          },
          // 四大静态文件夹
          ...cesiumStaticSourceCopyOptions
        ]
      })
    )
  }

  // Gzip代码压缩
  plugins.push(
    compress({
      threshold: 10 * 1024 // 10KB 以下不压缩
    })
  )

  // 服务代理
  const server = {
    proxy: {
      '/api': {
        target: 'http://map.217dan.com/addons/cesiummapv', // 跨域目标主机，自行修改
        pathRewrite: { '^/api': '' },
        changeOrigin: true,
        rewrite: (p: any) => p.replace(/^\/api/, '')
      }
    }
  }
  return {
    base,
    envDir,
    mode,
    plugins,
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server
  }
})
