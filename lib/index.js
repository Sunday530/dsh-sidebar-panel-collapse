/**
 * dsh-sidebar-panel-collapse —— node 半侧（cordis plugin）。
 *
 * 折叠开关的全部逻辑都在浏览器半侧（lib/client.js，经 package.json 的
 * exports["./client"] 由 dsh.client roster 交给页面加载）。这个 node 半侧唯一的作用
 * 是让 cordis 认得该包：dshmarket 热挂载要求模块导出 function 或带 apply 的对象，
 * 纯 `export {}` 会被判成 "invalid plugin, expect function or object with an
 * \"apply\" method, received object"。纯 UI 插件不需要任何 node 逻辑。
 */
export const name = "panel-collapse";

export function apply() {}
