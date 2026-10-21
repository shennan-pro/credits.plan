# Max's Credits Plan · 工作文档（WORKDOC）

> 协作交接用。新人读本文件 + `changelog.md` 即可接手。  
> 当前版本：**v2.5.0 已上线 main**（规则包 v1.2.3 + 数据表格批量录入 + 评分规则可自定义 + 云同步分行/表级权限）｜主线：main(v2.1.0) → `_feature01_Supabase`(v2.2.0)

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
  - `max_credits_cloud` —— 云同步凭证（URL/anon key/家庭码/访问密钥/开关，**不进导出**）
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

| 区      | 内容                                                      | 关键函数                                                                                                |
| ------ | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| ① 数据定义 | TASK_GROUPS / REWARD_CATS / TASKS / REWARDS / QUICK_IDS | —                                                                                                   |
| ② 状态存取 | defaultState / loadState / saveState / 邮箱记忆             | loadAccounts / rememberAccount / accountOptions                                                     |
| ③ 工具函数 | $ / esc / 日期 / 业务小算                                     | pendingExpire / isDoneToday / mergedTasks / mergedRewards                                           |
| ④ 核心业务 | 完成任务 / 撤销 / 兑换 / 月过期 / 连击 / 里程碑                         | completeTask / undoTask / redeemReward / checkMonthlyExpire                                         |
| ⑤ 渲染层  | render() 总出口 + 各子渲染器（只读 state）                          | renderHomeCards / renderTaskWall / renderShop / renderAdmin* / renderWeekChartInto / renderRankList |
| ⑥ 交互绑定 | Tab / 视角 / 点击委托 / 后台按钮 / 滑动切页 / 向导 / 云同步                | showView / setViewMode / showModal / requestAdminAccess / cloudPush / cloudSyncNow                  |
| ⑦ 动效层  | 飞字 / 金币 / 粒子 / 礼盒 / toast / Web Audio 音效                | burst / flyScore / coinPop / sfx.*                                                                  |
| ⑧ 启动   | 主题恢复 / 向导判断 / 吸顶余额 / 自检                                 | init 内联 / runSelfTest                                                                               |

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

### 云同步（v2.5.1 · Supabase · 分行 + 表级权限 · ADB PG 兼容）

> v2.2.0 起可用；**v2.5.1 是不提权版**（用户实例 = 阿里云 AnalyticDB for PostgreSQL，平台层禁用 SECURITY DEFINER）

| 项    | 设计                                                                                       |
| ---- | ---------------------------------------------------------------------------------------- |
| 接入方式 | 零 SDK：fetch 直连 Supabase REST **RPC 端点**（`/rest/v1/rpc/family_pull`、`family_push`），单文件保持零依赖 |
| URL 形态 | 官方 `.supabase.co` / 国内托管（如华为 OpenTrust `.supabase.opentrust.net`）/ 自建域名均支持；只校验 https + 主机名；自动补 https、剥 `/rest/v1`、trim |
| 数据模型 | 一张表 `family_state(family_code PK, secret_hash, state jsonb, updated_at)`，**一家一行整包存** |
| 身份   | **家庭码（地址）+ 访问密钥（钥匙）**双要素；孩子设备零门槛，无账号体系                                   |
| 凭证   | 传给云端的是 `md5(家庭码:密钥)`（浏览器用纯 JS MD5 算，已对拍 Node crypto 16 组）。**密钥明文从不上云、不落库**；库内 `secret_hash` 就是这个 md5 |
| 冲突   | 整包 **last-write-wins**（比较 `state.updatedAt` 本地时钟）；本地不旧于云端才推送                             |
| 拉取保护 | 拉取前自动把本地旧档写入 `max_credits_backup_<时间戳>`                                                  |
| 凭证存储 | 独立键 `max_credits_cloud`（url / anonKey / familyCode / **secret** / autoSync / lastSync），只存本机；**不进导出 JSON** |
| 入口   | 后台「云同步 · Supabase」卡：保存/复制建表SQL/测试连接/立即同步/**🩺 环境体检**/自动同步开关 + 🎲家庭码 + 🔑访问密钥 |
| 建表   | `supabase-setup.sql`（带注释）/ `supabase-setup.paste.sql`（**纯 ASCII 无注释，推荐粘贴**） |
| 错误翻译 |  BAD_SECRET / EMPTY_SECRET / EMPTY_CODE / 缺函数(PGRST202) / 缺表(PGRST205) / **ADB 禁用 DEFINER 专属提示** / 401·403 / 5xx |

#### v2.5.1 表级权限（关键改动：不提权也能校验）

| 层 | 做法 |
|---|---|
| 分行 | `family_code` 为主键 → 一个家庭一行，A 家读写不触碰 B 家的行 |
| 提权 | **完全不用 SECURITY DEFINER**（ADB PG 平台层禁止，报 `adbpg_enable_security_definer is disabled`）→ 普通函数（SECURITY INVOKER）以 anon 身份执行，RLS 照常生效 |
| 凭证通道 A | 会话变量 `app.family_code` / `app.family_auth` / `app.family_new` ← 函数用 `set_config(..., true)` 写入 |
| 凭证通道 B | 请求头 `x-family-code` / `x-family-auth` / `x-family-secret` ← 网关把头放进 `current_setting('request.headers')`；A 通道不生效时的备选 |
| 策略 | `using` = 家庭码相等 **且**（凭证一致 **或** 该行是历史空哈希行）；`with check` = 家庭码相等 **且** 新凭证一致 |
| 哈希 | **不放服务端算**：凭证在浏览器算成 md5，库里只做字符串比较 → 不依赖 pgcrypto / bcrypt / 任何扩展（也绕开 ADB 扩展可用性未知的问题） |
| 不可探测 | 密钥错与行不存在都返回同一个结果，外部无法区分 |
| 旧数据兼容 | `secret_hash = ''` 的历史行沿用 v2.2.x 语义（家庭码即凭证），首次推送即升级为正式 md5 |
| 双保险 | RLS 策略 + `revoke` 表权限；直连表不带凭证 → 读到 0 行、写入被拒 |

#### 平台差异对照（踩过的坑）

| 平台 | SECURITY DEFINER | request.headers | 备注 |
|---|---|---|---|
| 官方 Supabase | ✅ 支持 | ✅ | 原始方案可用 |
| 华为云 RDS Supabase | ✅ 支持 | ✅ | 原始方案可用 |
| **阿里云 ADB PG** | ❌ **平台层禁用** | ⚠️ 需实测 | 只能用 v2.5.1 不提权版 |

#### 诊断工具：🩺 环境体检

后台云同步卡新增「🩺 环境体检」按钮，**一次跑完 5 项探测并给判定**（把反复猜平台变成可测量）：

| 探测 | 期望 | 含义 |
|---|---|---|
| REST 根路径 | 401/200 | URL 对不对 |
| family_state 表 | 200 | 表建了没 |
| **直连读（不带凭证）** | **0 行** | **RLS 到底生效没有**（>0 行 = 别人能读全表） |
| RPC family_pull | 200 | 函数建了没 |
| 端到端 | 写入+读回 | 临时建行→读回→删除 |

| 关键函数 | cloudRpcUrl / cloudSecret / genCloudSecret / **cloudDoctor** / cloudPull / cloudPush / cloudSyncNow / scheduleCloudPush / testCloud / renderCloudCard / saveCloudFromInputs / **md5hex** |
| 存档合并 | `hydrate(saved)` 统一深合并（localStorage/云端/导入三条路径共用，浅合并曾把 cfg 整体替换导致渲染崩）                     |

---

## 五·六、等级映射（v2.5.4 · feature_level&score）

「设置 · 评分规则 · ③ 等级映射表」对齐 **堂听（听写）· 语文 / 英语** —— 属 **课堂表现类**，不是考试！

**v2.5.4 口径修正**：`A++=120分 / A+=110 / A=100 / B=90 / C=80 / D=70 / E=不及格` 是**等级代号**（折算分数），**不是 Credits**！真正入账的 Credits 对齐 v1.2.3 课堂表现任务 `t_class_*`：

| 等级 | 折算分数（代号） | Credits（入账） | 对应任务 |
|---|---|---|---|
| A++ | 120 | **+10** | `t_class_app` |
| A+  | 110 | **+5**  | `t_class_ap` |
| A   | 100 | 0 | — |
| B   | 90  | 0 | — |
| C   | 80  | **−2** | `t_class_c` |
| D   | 70  | **−5** | `t_class_d` |
| E   | 0（不及格） | **0（不记分）** | `t_class_e`（任务存在但不入账） |
| 缺考 | 0 | **0（不记分）** | — |

- **E（不及格）/ 缺考 = 不记分**：`isNoScoreGrade()` 拦截，`dtPost()` 直接 return，只留痕不入账
- **不再进考试阶梯**：`scoreReward()` 等级分支直接走 `gradeReward()` → `GRADE_TASK` → `taskVal()`，与 v1.2.3 任务包同源
- 映射表三列：等级 / 折算分数（代号）/ Credits（可为负）；「恢复默认」还原为上表
- 数据表格「类型/等级」下拉动态从 `GRADE_OPTIONS` + `cfg.scoreRules.grades` 取
- **迁移补丁**：`hydrate()` 一次性把老存档的 `scoreRules.grades` 对齐到上表（`_lvFix` 标记），之后用户改映射表不再被覆盖

## 五·七、起始分（v2.5.4 · 线下已领 Credits 结转）

线下纸质版计划已领过的 Credits 不能丢。设置 → **起始分（线下已领 Credits 结转）**：

- 存储：`cfg.initBal`（number，≥ 0）
- **余额 = 起始分 + 记录净和**（`recordsNet()`）；改起始分时 `rebalanceFromInit()` 重算，**不动任何历史记录**
- 月度过期 / 兑换 / 入账 / 撤销 都照常走 `state.balance ±= val`，不影响起始分本身
- 重置数据时沿用起始分作为新余额（`state = defaultState(); balance = initBal`）
- 典型用法：纸质版已领 1294 → 设置起始分 1294 → 当前余额从 1294 开始累加

## 五·五、数据表格（v2.3.0 · feature_SQL）

| 项 | 设计 |
|---|---|
| 入口 | 后台「🎨 定制工坊 → 📊 数据表格 · 批量录入」卡（`wide` 占满整行） |
| 存储 | `cfg.tables.exam.rows[]`，字段：`id, date, title, subject, type, score, full, reward, note, recId, locked` |
| 双向锚定 | `addRecord` 返回带 `id` 的记录；行内 `recId` 互指 → 入账即出现在记录页并计入余额；改行后状态「⟳ 需重记」 |
| 重记逻辑 | `dtPost()` 先 `revertRecord + splice` 旧记录再写新记录，**不重复加分**（撤销记录不动 doneToday） |
| 阶梯 | `EXAM_LADDER`：`s` 90/95/98/100→20/50/80/100；`b` →50/80/120/200；`normType()` 归一 中文「大考」/ b / big；非百分制按百分比换算 |
| 手改保护 | 编辑「积分」列 → `locked=true`，之后分数/满分/类型变化不再覆盖 |
| 导入 | `parseCsv()`（含引号/转义）+ `DT_MAP` 表头映射；Excel 走 `loadXlsxLib()` 懒加载 SheetJS CDN，失败降级回 CSV |
| 导出 | `dtToCsv()` + Blob 下载（带 BOM，Excel 不乱码） |
| 关键函数 | dtTable / examReward / normType / dtStatus / dtPost / renderDataTable / parseCsv / dtImportRows / dtToCsv |
| 已知限制 | 单表（成绩表）硬编码列；表格行不参与月过期/撤销联动以外的其他统计 |

## 六、组件清单（CSS）

| 组件  | 类名                                                | 备注                      |
| --- | ------------------------------------------------- | ----------------------- |
| 卡片  | .card / .card-head / .card-title(色点) / .card-body | 全站统一                    |
| 统计砖 | .dash-tile / .admin-tile                          | v2.0 起共享同一组样式（双类名合并选择器） |
| 任务卡 | .task(.done) / task-emoji / task-val              | 二次点击=撤销                 |
| 奖励卡 | .reward(.disabled) / reward-grid                  | 网格随断点 2/3 列             |
| 记录条 | .record                                           | 多列瀑布                    |
| 导航  | .topnav > .tn-tab                                 | 桌面胶囊；<420px 图标-only     |
| 图表  | .chart > .bar-col > .bar                          | 纯 CSS 柱状图               |
| 排行  | .rank-list > .rank-item                           | TOP 榜                   |
| 货币  | .coin(.lg/.sm)                                    | M-Coin，字母=孩子首字母         |
| 动效  | .fly-score / .coin-pop / .particle / .toast       | 冻结面，勿改                  |

---

## 七、响应断点（v2.0 定稿）

| 视口        | 布局                                      |
| --------- | --------------------------------------- |
| <768px    | 单列；`#app` min-width:360px 防挤压；导航图标-only |
| 768–1023  | 单列，容器 720 居中                            |
| 1024–1439 | 容器 1180；任务/商店/记录 2 列；hero 双栏            |
| ≥1440     | 容器 1380；任务/商店/记录 3 列；卡片 padding 24px    |

---

## 八、后续待办（Backlog）

- [x] ~~云同步（多端）~~ v2.2.0 已交付 Supabase 版（家庭码 + 整包 LWW）
- [x] ~~云同步加固：配对密钥~~ v2.5.0 已改为「家庭码 + 访问密钥」双要素，密钥 bcrypt 落云、表对 anon 直连全禁
- [ ] 云同步加固：记录级合并（同刻双改丢一笔的根治）/ 真正的账号体系（邮箱登录，免共享密钥）
- [ ] 商业化预研：多家庭隔离（familyId + 配对密钥）、规则包售卖、实物卡兑码核销
- [ ] PWA：manifest + 离线缓存 + 添加到主屏幕
- [ ] 过期机制阶梯化（<50C 免扣 / 50–200C 10% / >200C 20%）
- [ ] 现金奖励「5C 小金库」攒兑零花钱
- [ ] 交互流程图 SVG
- [ ] GitHub Pages 部署（需用户口令授权）

---

## 九、协作约定（摘自 AGENTS.md 精神）

- 改功能走 `fix/_refactor/_feature` 分支，验收后合 main；**远端上传必须用户口令**
- **2026-10-16 起：每次迭代收口后及时 push main**（用户授权长期有效，不用每次再问）；Pages 自动重建，多端即时可用
- 线上地址：https://shennan-pro.github.io/credits.plan/ （仓库 `shennan-pro/credits.plan`，public；显示名 "Kid's Credits Plan"）
- ⚠️ 对外 URL **不带孩子名**（曾用 max-credits-plan，已改；其他用户看到不会懵）
- ⚠️ 历史地址全部 404（改名不重定向 Pages）：`shennanjaysn-cmyk.github.io/max-credits-plan/`、`shennan-pro.github.io/max-credits-plan/`、`shennan-pro.github.io/kids-credits-plan/`
- 冻结面：卡通视觉、动效、Baloo 2、localStorage 键名与 schema —— 动前先问
- 每版必更：版本号（title/tag/footer/console）+ changelog + README

### 已踩过的坑（动手前必读）

- **`#app` 是 flex 容器**：子元素光写 `margin:auto` 会 shrink-to-fit（宽度只剩内容宽），必须 `width:100% + max-width` 才能居中限宽（v2.0 实测顶栏塌到 882px 的教训）
- headless Chrome `--virtual-time-budget` 下 rAF/transition 不推进：验证布局用 DOM 探针（getBoundingClientRect + --dump-dom），别只信截图
- present_files / 静态预览管线可能往 HTML 注入 `data-page-node-id` 属性：二次编辑前先重新 Read 或 grep 确认
- 动效冻结面（飞字/金币/粒子/音效）改动后必须真机复验，headless 截图会漏动效问题
- **parent 视角是会话态不是持久态**（v2.1.0 修复）：落盘只写 `view:'max'`；任何「刷新/重开保持在后台」的需求都是安全倒退，别改回去
- 无家长账号时后台入口必须走 `noAdminGuide()` 引导创建，禁止直接 `setViewMode('parent')` 放行
