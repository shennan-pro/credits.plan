# Max's Credits Plan · 工作文档（WORKDOC）

> 协作交接用。新人读本文件 + `changelog.md` 即可接手。
> 当前版本：v2.2.0（规则包 v1.2.3 + Supabase 云同步）｜主线：main(v2.1.0) → `_feature01_Supabase`(v2.2.0)

---

## 一、产品一句话

小学生好习惯积分系统：孩子做任务赚 Credits → 商店兑换奖励 → 月底未花的自动过期 10%（倒逼消费）。
双角色：孩子（MAX 视角，看数据/做任务/兑换）+ 家长（爸妈后台，调规则/看统计/管账号）。

---

## 二、技术形态

- **单文件**：`index.html`（HTML + CSS + JS 全内联，零依赖、零构建、双击即开）
- **存储**：localStorage，无后端
  - `max_credits_v12` —— 主存档（schema 见第五节）
  - `max_credits_accounts` —— 记住的家长邮箱列表（独立，导入/重置不丢）
  - `max_credits_cloud` —— 云同步凭证（URL/anon key/家庭码/开关，**不进导出**）
  - `max_credits_backup_<时间戳>` —— 拉取云端前的本地旧档备份
- **字体**：Baloo 2 ExtraBold（latin 子集 base64 内嵌，SIL OFL 1.1）；正文走系统字体
- **版本规则**：`vX.Y.Z_YYMMDD`；历史版本全保留在 `versions/`
- **调试**：地址栏加 `?selftest`（控制台自检）/ `?register`（重走向导）；控制台 `window.MAX`

---

## 三、页面结构（DOM 分区）

```
#app
├─ header.topbar          品牌 + nav.topnav（🏠首页 📋任务 🏪商店 📊记录）+ mini-balance + MAX/爸妈切换 + 版本标
├─ section.hero-row       桌面端：余额大卡 .balance + 今日推荐卡 并排；移动端：上下堆叠
├─ main.content
│  ├─ .view[data-view=home]     仪表盘：dashStats 四宫格 + 快捷任务/最近兑换 + 本周走势/任务TOP3
│  ├─ .view[data-view=tasks]    任务墙（6 分组，分类横幅 + 卡片列）
│  ├─ .view[data-view=shop]     奖励商店（4 梯度，网格卡片）
│  ├─ .view[data-view=records]  全部记录（多列瀑布）
│  └─ .view[data-view=admin]    爸妈后台：📊运营(总览/统计/快捷调整/数据管理) + 🎨定制工坊(任务&奖励/外观/账号)
├─ footer.bottombar       状态栏（LOCAL SYNC + 版本）
├─ .floats                浮按钮 ▲▼⚙（桌面右下角；移动端底部安全区上方）
├─ #wiz                   初始三步向导（孩子档案→家长账号→完成）
└─ #modal                 通用模态（showModal 统一出口）
```

---

## 四、JS 八区索引（script 顺序即依赖顺序）

| 区 | 内容 | 关键函数 |
|---|---|---|
| ① 数据定义 | TASK_GROUPS / REWARD_CATS / TASKS / REWARDS / QUICK_IDS | — |
| ② 状态存取 | defaultState / loadState / saveState / 邮箱记忆 | loadAccounts / rememberAccount / accountOptions |
| ③ 工具函数 | $ / esc / 日期 / 业务小算 | pendingExpire / isDoneToday / mergedTasks / mergedRewards |
| ④ 核心业务 | 完成任务 / 撤销 / 兑换 / 月过期 / 连击 / 里程碑 | completeTask / undoTask / redeemReward / checkMonthlyExpire |
| ⑤ 渲染层 | render() 总出口 + 各子渲染器（只读 state） | renderHomeCards / renderTaskWall / renderShop / renderAdmin* / renderWeekChartInto / renderRankList |
| ⑥ 交互绑定 | Tab / 视角 / 点击委托 / 后台按钮 / 滑动切页 / 向导 / 云同步 | showView / setViewMode / showModal / requestAdminAccess / cloudPush / cloudSyncNow |
| ⑦ 动效层 | 飞字 / 金币 / 粒子 / 礼盒 / toast / Web Audio 音效 | burst / flyScore / coinPop / sfx.* |
| ⑧ 启动 | 主题恢复 / 向导判断 / 吸顶余额 / 自检 | init 内联 / runSelfTest |

**改 state 的分支必须落盘**（saveState 或经 addRecord 间接落盘）。

---

## 五、数据 Schema（`max_credits_v12`）

```js
{
  balance, monthIn, monthOut, totalIn, totalOut,
  records: [{time, type:'in'|'out', val, name, taskId?}],   // 倒序，最新在前
  doneToday: {taskId: 'YYYY-MM-DD'},
  view: 'max'|'parent', lastResetMonth: 'YYYY-MM',
  updatedAt: 0,           // v2.2.0：本地最后修改时间戳（云同步 LWW 用）
  cfg: {
    expireRate, initBal, expireOn, pin(旧兼容), sound,
    childName, admin:{email, passHash}, setupDone,
    pack:'v1.2.3',   // 规则包版本（商业化锚点）
    theme:'arcade|sweet|funny', sfxStyle:'retro|soft|silly', fx:'full|mini|off',
    customTasks:[], customRewards:[], taskOv:{}, rewardOv:{}
  }
}
```

规则覆盖链：内置常量（v1.2.3 重录）→ `taskOv/rewardOv` 覆盖 → `customTasks/customRewards` 追加 → `mergedTasks()/mergedRewards()` 统一出口。
`legacy:true` 条目（旧版 3 任务 + 14 奖励）默认停用，后台工坊勾选启用 = 备选项机制。

### 生效规则（v1.2.3）

- 月度清除：最后一日扣 **1%**（取整，**最低扣 1**），配置项 `expireRate` 默认 1
- 兑换频次：**≤50🪙 每周限一次；≥100🪙 每月限一次**（`redeemLimitHit` 拦截；单条 note 另有说明的以 note 为准）
- 任务 7 类：作息与家庭 / 学习习惯 / 体能训练 / 个人荣誉与进步 / 挑战成就 / 课堂表现 / 行为规范
- 积分银行：余额不足禁购（不可透支）；家长后台 = 积分银行管理员

### 云同步（v2.2.0 · Supabase）

| 项 | 设计 |
|---|---|
| 接入方式 | 零 SDK：fetch 直连 Supabase REST（`/rest/v1/family_state`），单文件保持零依赖 |
| 数据模型 | 一张表 `family_state(family_code PK, state jsonb, updated_at)`，一家一行整包存 |
| 身份 | **家庭码配对**（6 位，A 生成 B 输入）；无账号体系，孩子设备零门槛 |
| 冲突 | 整包 **last-write-wins**（比较 `state.updatedAt` 本地时钟）；本地不旧于云端才推送 |
| 拉取保护 | 拉取前自动把本地旧档写入 `max_credits_backup_<时间戳>` |
| 凭证 | 独立键 `max_credits_cloud`，只存本机；**不进导出 JSON** |
| 入口 | 后台「云同步 · Supabase」卡：保存/测试连接/立即同步/自动同步开关 |
| 建表 | `supabase-setup.sql`（含 RLS：anon 可读写——家庭码即凭证） |
| 已知限制 | ① 家庭码 = 读写凭证，外传=数据外泄；② 设备时钟差过大时推送被跳过（防覆盖，fail-safe）；③ 整包 LWW 极端同刻双改会丢一笔——可接受，升级路径是记录级合并表 |
| 关键函数 | cloudPull / cloudPush / cloudSyncNow / scheduleCloudPush / testCloud / renderCloudCard |
| 存档合并 | `hydrate(saved)` 统一深合并（localStorage/云端/导入三条路径共用，浅合并曾把 cfg 整体替换导致渲染崩） |

---

## 六、组件清单（CSS）

| 组件 | 类名 | 备注 |
|---|---|---|
| 卡片 | .card / .card-head / .card-title(色点) / .card-body | 全站统一 |
| 统计砖 | .dash-tile / .admin-tile | v2.0 起共享同一组样式（双类名合并选择器） |
| 任务卡 | .task(.done) / task-emoji / task-val | 二次点击=撤销 |
| 奖励卡 | .reward(.disabled) / reward-grid | 网格随断点 2/3 列 |
| 记录条 | .record | 多列瀑布 |
| 导航 | .topnav > .tn-tab | 桌面胶囊；<420px 图标-only |
| 图表 | .chart > .bar-col > .bar | 纯 CSS 柱状图 |
| 排行 | .rank-list > .rank-item | TOP 榜 |
| 货币 | .coin(.lg/.sm) | M-Coin，字母=孩子首字母 |
| 动效 | .fly-score / .coin-pop / .particle / .toast | 冻结面，勿改 |

---

## 七、响应断点（v2.0 定稿）

| 视口 | 布局 |
|---|---|
| <768px | 单列；`#app` min-width:360px 防挤压；导航图标-only |
| 768–1023 | 单列，容器 720 居中 |
| 1024–1439 | 容器 1180；任务/商店/记录 2 列；hero 双栏 |
| ≥1440 | 容器 1380；任务/商店/记录 3 列；卡片 padding 24px |

---

## 八、后续待办（Backlog）

- [x] ~~云同步（多端）~~ v2.2.0 已交付 Supabase 版（家庭码 + 整包 LWW）
- [ ] 云同步加固：配对密钥 / 记录级合并（同刻双改丢一笔的根治）
- [ ] 商业化预研：多家庭隔离（familyId + 配对密钥）、规则包售卖、实物卡兑码核销
- [ ] PWA：manifest + 离线缓存 + 添加到主屏幕
- [ ] 过期机制阶梯化（<50C 免扣 / 50–200C 10% / >200C 20%）
- [ ] 现金奖励「5C 小金库」攒兑零花钱
- [ ] 交互流程图 SVG
- [ ] GitHub Pages 部署（需用户口令授权）

---

## 九、协作约定（摘自 AGENTS.md 精神）

- 改功能走 `fix/_refactor` 分支，验收后合 main；**远端上传必须用户口令**
- 冻结面：卡通视觉、动效、Baloo 2、localStorage 键名与 schema —— 动前先问
- 每版必更：版本号（title/tag/footer/console）+ changelog + README

### 已踩过的坑（动手前必读）

- **`#app` 是 flex 容器**：子元素光写 `margin:auto` 会 shrink-to-fit（宽度只剩内容宽），必须 `width:100% + max-width` 才能居中限宽（v2.0 实测顶栏塌到 882px 的教训）
- headless Chrome `--virtual-time-budget` 下 rAF/transition 不推进：验证布局用 DOM 探针（getBoundingClientRect + --dump-dom），别只信截图
- present_files / 静态预览管线可能往 HTML 注入 `data-page-node-id` 属性：二次编辑前先重新 Read 或 grep 确认
- 动效冻结面（飞字/金币/粒子/音效）改动后必须真机复验，headless 截图会漏动效问题
- **parent 视角是会话态不是持久态**（v2.1.0 修复）：落盘只写 `view:'max'`；任何「刷新/重开保持在后台」的需求都是安全倒退，别改回去
- 无家长账号时后台入口必须走 `noAdminGuide()` 引导创建，禁止直接 `setViewMode('parent')` 放行
