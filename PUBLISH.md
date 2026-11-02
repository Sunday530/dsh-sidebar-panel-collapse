# 把 dsh-sidebar-panel-collapse 发布到 DSH 插件市场

这份文件是操作清单，不是仓库内容（别提交 `submission/` 和 `PUBLISH.md` 到插件仓库，
或者按需保留，二者都不影响收录）。

收录以后，用户能在 插件 → 插件市场 → 发现 里搜到它；市场卡片会显示
`screenshots.json` 里声明的两张截图。

---

## 0. 前置条件（都已满足）

| 要求 | 状态 |
| --- | --- |
| `package.json` 声明 `dsh.bundle.patch` | ✅ `./cordis.patch.yml` |
| 仓库根有 `cordis.patch.yml` 且是 `- insert: [{id, name}]` | ✅ |
| 带前端 UI 时声明 `dsh.client` | ✅ `{ "platform": "web" }` |
| 真实可用代码、非占位 | ✅ 本地已跑通（29/29 断言 + 真机截图） |
| 仓库创建满 1 天 | ⏳ 新仓库要等 24h，CI 会自动检查 |
| 仓库加 `dsh-plugin` topic | ⬜ 建仓库后加 |
| 描述不带营销词、与代码一致 | ✅ |

`@deepseek-ai/*` 必须是 peerDependencies，且 peer 区间要显式包含预发布分支，
否则用户装的时候会 ERESOLVE。`package.json` 里已经写好：

```json
"peerDependencies": {
  "@deepseek-ai/cordis": ">=0.0.1-rc.1 <0.1.0 || >=0.1.0-rc.1 <0.2.0-0"
}
```

---

## 1. 建 GitHub 仓库（需要你自己登录，本机没有 git / gh）

本机 `git`、`gh` 都没装，npm 也未登录（`npm whoami` → `ENEEDAUTH`），所以这几步只能你自己做。

1. 在 GitHub 新建 **public** 仓库，名字 `dsh-sidebar-panel-collapse`。
2. 把 `D:\work\publish\dsh-sidebar-panel-collapse\` 里这些东西传上去：

```
package.json
cordis.patch.yml
lib/index.js
lib/client.js
assets/expanded.png
assets/collapsed.png
screenshots.json
README.md
LICENSE
```

3. 仓库 **Settings → Topics** 里加 `dsh-plugin`。
4. 把 `package.json` 与 `README.md` 里的 `OWNER` 换成你的 GitHub 用户名
   （`repository.url`、README 的 `dsh plugin add github:OWNER/...`）。
   `submission/` 里那个 yml 的 `url`、`name`、文件名也要一起换。

## 2. （可选）发布到 npm

收录**不要求**发 npm——直接 `dsh plugin add github:OWNER/repo` 也能装。
如果发，`package.json` 里的 `repository.url` 必须指回上面那个仓库（市场会自动识别映射；
在收录 yml 里手写 `npm:` 反而会被拒）。

```sh
cd D:\work\publish\dsh-sidebar-panel-collapse
npm adduser          # 首次
npm publish --access public
```

## 3. 提 PR 到 awesome-dsh-plugin

**一个 PR 只加一个文件**，放在 `data/plugins/<owner>__<repo>.yml`：

`submission/data/plugins/OWNER__dsh-sidebar-panel-collapse.yml`（把 OWNER 换掉后重命名）：

```yaml
url: https://github.com/OWNER/dsh-sidebar-panel-collapse
name: OWNER/dsh-sidebar-panel-collapse
category: ui
description:
  en: 'Adds a chevron toggle above the sidebar panel list that collapses the panel entry rows so the workspace list gets the vertical space.'
  zh: '在侧边栏面板列表上方增加一个下拉箭头开关，一键折叠面板入口，把竖直空间让给下面的工作区。'
```

要点：

- `url` 必须和仓库**完全一致**；`name` 是列表里的链接文字。
- 只有 `description.en` 必填，`zh` 可不写（维护者会补）。
- 描述里含 `: `（冒号+空格）必须整体加引号——上面已经加了。
- **不要改两个 README**（`README.md` 是仓库自己的，不是列表仓库的；列表仓库的
  README 是脚本从 `data/plugins/*.yml` 生成的）。
- 分类选 `ui` 即可（同类：`dsh-muv-table`、`DSH-better-sidebar` 都是 `ui`）。
  分类选得不贴切不会被拒，维护者会直接改。
- 一个 PR 最多 3 条。

PR 地址：https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/compare
（也等价于应用里插件市场右上角的「申请收录插件 ↗」）。

## 4. 评审会发生什么

CI 只校验**形式**（manifest、仓库年龄、格式、README 能否重新生成），通过不等于收录。
维护者会真的读仓库，看 6 件事：

1. 代码是否真的做了条目里写的事（描述里的数字、命令、API 都会被核对——夸大是最常被打回的原因）；
2. 分类是否合理（不会因此被拒）；
3. 是否为真实代码而非占位/空壳；
4. 是否已被现有条目覆盖（同功能时「谁更好」>「谁先来」；现有列表里**没有任何**
   panel-collapse 类插件，所以不冲突）；
5. 源码是否可疑（混淆、凭据外传、安装期异常行为）；
6. PR 是否动了不相干的条目。

被打上 `held: author` 标签表示等你修改：**同一个分支**推修复 + **只留一条**评论，
不要关掉重开。标签摘掉后 PR 自己回到队列。

## 5. 收录之后

- 市场目录 `https://awesome-dsh-plugin.com/plugins.json` 每天重建，条目出现后
  「发现」页才能搜到。
- 想换截图：直接推自己仓库的 `assets/` + `screenshots.json`，下一次夜间构建生效，
  不用再提 PR。
- 换图标：条目里加 `icon:`，必须是 **GitHub 托管的位图**（png/jpg/webp），
  SVG 和第三方图床会被拒。

---

## 附：本地已完成的收尾

- 本地包已改名为 `dsh-sidebar-panel-collapse@0.1.0`，profile `dsh.profile.bundles`
  27 条，最后一条就是它；市场 `GET /dsh-market/installed` 显示
  `activation.state = live`。
- 旧目录 `node_modules\dsh-panel-collapse\` 只剩一个 503 字节的空壳
  `lib\client.js`（把僵尸 bundle 图里的条目变成 no-op，避免出现两个折叠按钮）。
  **下次重启 DSH 后可以整个删掉**，同时把 `.dsh-market\state.json` 里可能残留的
  `disabled: ["dsh-panel-collapse"]` 清成 `[]`（现在已经是 `[]` 了）。
