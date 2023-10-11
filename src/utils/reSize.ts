/* 
自适应
根据跟字体进行响应式适配
*/
(function (doc: any, win: any) {
  const fn = () => {
    const docEl = doc.documentElement,
      clientWidth = docEl.clientWidth;
    if (!clientWidth) return;
    docEl.style.fontSize = 100 * (clientWidth / 1920) + 'px';
  };
  if (!doc.addEventListener) return;
  win.addEventListener('resize', fn);
  doc.addEventListener('DOMContentLoaded', fn);
})(document, window);