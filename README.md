# Max's CREDITS · v1.3.0

给小学生 Max 设计的**好习惯积分系统**：完成任务赚 Credits，商店兑换奖励，月底未花的 Credits 自动过期 10%（倒逼消费，也倒逼「赚」）。

## 打开即用

- **双击 `index.html`**，用任意现代浏览器打开（Chrome / Safari / Edge 均可）
- **无需服务器、无需联网、无需安装**
- 完整历史版本见 `versions/index-v1.2.0_260827.html`

## 双视角

| 视角 | 入口 | 能做的事 |
|---|---|---|
| MAX | 顶栏左侧 `MAX` | 看余额、完成任务、逛商店、看记录 |
| 爸妈 | 顶栏右侧 `爸妈` | 运营总览、改过期比例、发放奖励、导出 / 导入 / 重置数据 |

## 数据存哪

全部存在浏览器 **localStorage**，键名为 `max_credits_v12`。

- 同一台电脑、同一个浏览器打开，`index.html` 会自动读取上次的数据
- 换电脑 / 清浏览器缓存会丢失，建议定期在「爸妈控制台 → 导出数据」备份 JSON

## 迁移与备份

1. 爸妈控制台 → **导出数据**，得到 `max-credits-YYYY-MM-DD.json`
2. 新设备打开 `index.html` → 爸妈控制台 → **导入数据**，选择 JSON 即可恢复

## 自动化检查

浏览器地址栏改成 `file:///.../index.html?selftest`（末尾加 `?selftest`），打开后按 F12 看控制台，会输出 10 项核心规则自检结果。

开发者排查时也可在控制台输入：

```js
window.MAX.doTask('t_dawn')   // 完成起床任务
window.MAX.doReward('r_cash') // 兑换现金
window.MAX.reset()            // 重置全部数据
```

## 项目文件

```
├── index.html                          # 当前版本（v1.3.0）
├── versions/index-v1.2.0_260827.html   # v1.2 历史存档
├── Max's Credits计划表-V1.2_260716.docx # 打印公示版规则表
├── build_docx.py                       # 规则表生成脚本
└── changelog.md                        # 开发文档 + 版本日志
```

## 版本规则

- 格式：`vX.Y.Z_YYMMDD`
- `Z`：修 bug / 细节优化
- `Y`：新增功能且向下兼容
- `X`：重大架构或不兼容变更
- 当前：`v1.3.0_260831`

---
*最终解释权归爸妈所有 🍄*
