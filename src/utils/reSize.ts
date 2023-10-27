// rem响应式方法
// /REM是根据根结点来计算各个子节点的值，所以根结点也要做响应式变化。
function setRemInit() {
  const baseWidth = 1920 // 设计图原始宽度
  const baseHeight = 1080 // 设计图原始高度
  const designRatio = baseWidth / baseHeight // 设计图原始宽高比例

  function setRem() {
    const currentWidth = document.documentElement.clientWidth // 视口当前宽度
    const currentHeight = document.documentElement.clientHeight // 视口当前高度
    const realRatio = currentWidth / currentHeight // 视口当前比例
    let remSize = 0 // 根节点的fontsize
    let scale = 0 // 字体缩放比例
    scale = currentWidth / baseWidth // 正常情下，以宽度(当前宽度/原始宽度算出缩放比例，给字体缩时用
    if (realRatio < designRatio) {
      // 如 当前宽高比>原始宽高比 说明高度较小 (这种情非常罕见)
      scale = currentHeight / baseHeight // 所以，此时以高度计算缩放比例
    }
    remSize = baseWidth / 96 // 按设计图宽度比计算， 设置根节点的fontsize
    remSize = remSize * scale // 计算窗口缩放后的根节点fontsize
    console.log('当前跟字体大小：1rem ===', remSize + 'px')
    document.documentElement.style.fontSize = remSize + 'px' // 把改变后的值给根节点
  }
  // 初始化
  setRem()
  // 改变窗口大小时重新设置 rem
  window.addEventListener('resize', setRem)
}

setRemInit()
