"""
Max's Credits计划表 v1.2 生成器
日期：2026-07-16
"""
from docx import Document
from docx.shared import Pt, RGBColor, Cm, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

OUT = "/workspace/max-credits-v12/Max's Credits计划表-V1.2_260716.docx"

# ============================================================
# 颜色定义（潮牌高饱和）
# ============================================================
COL_PRIMARY = "FF4D2E"      # 主色：镐红橙
COL_ACCENT = "FFD60A"       # 点缀：电黄
COL_DARK = "0A0A0A"         # 暗色背景
COL_LIGHT_BG = "FFF8E7"     # 米色背景
COL_TEXT = "1A1A1A"
COL_BORDER = "1A1A1A"
COL_SUCCESS = "06D6A0"      # 成功绿
COL_DANGER = "EF476F"       # 危险红

# ============================================================
# 工具函数
# ============================================================
def set_cell_bg(cell, color_hex):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), color_hex)
    tc_pr.append(shd)

def set_cell_border(cell, color="1A1A1A", size="12"):
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_borders = OxmlElement('w:tcBorders')
    for border_name in ['top', 'left', 'bottom', 'right']:
        border = OxmlElement(f'w:{border_name}')
        border.set(qn('w:val'), 'single')
        border.set(qn('w:sz'), size)
        border.set(qn('w:color'), color)
        tc_borders.append(border)
    tc_pr.append(tc_borders)

def add_run(para, text, size=10, bold=False, color=None, font_name="PingFang SC"):
    run = para.add_run(text)
    run.font.name = font_name
    run.font.size = Pt(size)
    run.bold = bold
    if color:
        run.font.color.rgb = RGBColor.from_string(color)
    rPr = run._element.get_or_add_rPr()
    rFonts = OxmlElement('w:rFonts')
    rFonts.set(qn('w:ascii'), font_name)
    rFonts.set(qn('w:eastAsia'), font_name)
    rPr.append(rFonts)
    return run

def set_para_bg(para, color_hex):
    pPr = para._p.get_or_add_pPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), color_hex)
    pPr.append(shd)

# ============================================================
# 数据定义
# ============================================================

# 任务项目 - 16条（去掉跳绳挑战+补齐便签）
TASKS = [
    # (类型emoji, 类型, 任务, 积分, 备注)
    ("⏰", "晨起作息", "每天8点半前主动起床（工作日+周末/假期）", "+1 C", "特殊情况除外；如已养成不赖床则自动默认"),
    ("🏠", "家庭参与", "饭前帮忙摆放碗筷，饭后主动收拾自己的餐具，帮忙洗碗，丢垃圾，倒米等家务", "+1 C", "单日完成一项即可记分，不累积"),
    ("🪥", "个人卫生", "饭后漱口（已养成默认项）", "—", "无需记分，已自动化"),
    ("🪥", "个人卫生", "早上未刷牙", "-1 C", "无故连续不刷第二天-2 C"),
    ("📱", "电子产品管理", "学习日看电视/游戏时间，单日总计不超过半小时，且在完成学习任务后进行", "超时-10 C", "· 家长可视情况提醒一次\n· 如提醒后再超时，则执行扣分，并免除一周的电视/游戏时间"),
    ("📚", "学习习惯", "英语背句子、抄句子、做练习", "+2 C", "· 额外布置，针对薄弱项\n· 表现优秀视情况额外加1~3 C"),
    ("📚", "学习习惯", "每天阅读（文字为主）累计>30 分钟", "+2 C", "家里的书；与学校老师奖励不冲突"),
    ("📚", "学习习惯", "作业完成后自己检查一遍，然后家长检查，确保全对", "+5 C（一科）", "单日，可累积"),
    ("📚", "学习习惯", "英语常规作业，单张常规表中每一列连续都正确", "+5 C", "仅限1~4列"),
    ("📚", "学习习惯", "英语常规：单周每一竖列一周全对", "+5 C", "新规则；周末结算"),
    ("📚", "学习习惯", "写作业、学习内容因自己粗心大意发生2次以上的错误", "每次-2 C", "单科、单日、可累积"),
    ("💪", "体能训练", "每天完成完整一套体能训练（俯卧撑、仰卧起坐等），可分次完成", "+10 C", "· 在家；标准动作\n· 全套体能训练见《Max在家体能训练》表"),
    ("💪", "体能训练", "每天完成单项体能训练（俯卧撑、仰卧起坐等）", "+1 C", "在家；标准动作"),
    ("🏅", "个人荣誉", "学校奖励个人优秀荣誉、先进称号等（含奖状）", "+20 C", "根据实际成就酌情加10~30 C，如班级、年级、校级"),
    ("📈", "进步成就", "阶段性显著进步，如作业表现、考试成绩单科上升10分及以上、羽毛球/中提琴等专业项目状态表现", "+10 C", "· 需家长评估\n· 或老师、教练主动提出表扬"),
    ("📊", "环比奖惩", "大小考/小测，距上次分数增减对应奖惩（如比上次提高2分奖励）", "+3 C / -3 C", "· 提高≥2分奖3 C，下降≥5分罚3 C\n· 仅看单科分数变动"),
    ("🎯", "挑战成就", "单元测试、常规测验等小考，单科成绩≥90分", "+20 C起", "· 考试成绩按百分比计算\n· 记分方式：\n  90~94分 +20 C\n  95~97分 +50 C\n  98~99分 +80 C\n  100分 +100 C"),
    ("🎯", "挑战成就", "期中、期末等大考，单科成绩≥90分", "+50 C起", "· 考试成绩按百分比计算\n· 记分方式：\n  90~94分 +50 C\n  95~97分 +80 C\n  98~99分 +120 C\n  100分 +200 C"),
    ("🎯", "挑战成就", "正式比赛、竞赛、考试、考级取得名次或优秀", "+50 C起", "· 根据实际成就酌情翻倍（最高可翻四倍）\n· 根据表现状态（意志、策略、调整等）酌情奖励+5~10 C"),
    ("🎯", "挑战成就", "教育部白名单竞赛取得名次", "+200 C起", "· 根据实际成就酌情翻倍（最高可翻五倍）\n· 根据表现状态酌情奖励+50~100 C"),
    ("📝", "课堂表现", "课堂听写、练习等老师评为 A+", "+5 C/科", "· 一科一项\n· 多项取最高，不累积"),
    ("📝", "课堂表现", "课堂听写、练习等老师评为 A++", "+10 C/科", "· 与A+不叠加，取最高"),
    ("📝", "课堂表现", "课堂测验得 C", "-1 C", "· 来自便签规则"),
    ("📝", "课堂表现", "课堂测验得 D", "-2 C", "· 来自便签规则"),
    ("📝", "课堂表现", "课堂测验得 E", "-10 C", "· 来自便签规则"),
    ("⚠️", "行为扣分", "找借口逃避任务", "-2 C", "新增；与任务本身扣分不叠加"),
    ("⚠️", "行为扣分", "辱骂/发脾气", "-5 C", "新增；冷静后可申请一次复议"),
    ("⚠️", "行为扣分", "作弊/撒谎", "当次积分×3扣除", "已有'取消'规则，加重"),
]

# 奖励兑换 - 保留大件+补齐小额，删自行车
REWARDS = [
    # 名称, 所需Credits, 备注
    ("💵 现金", "1 C", "1元人民币（现金或转账）"),
    ("🍎 水果时间", "3 C", "自选一种水果；当日"),
    ("📺 1集动画", "3 C", "额外1集动画时间"),
    ("💰 5元小金库", "5 C", "自由支配现金"),
    ("🥤 饮料（甜）", "8 C", "选择一瓶自己喜欢的饮料；计划外"),
    ("🍦 冰淇淋/雪糕", "10 C", "一个；计划外"),
    ("🌳 一次小出游", "15 C", "公园/小区散步/小探索"),
    ("🍰 甜点", "15 C", "一份甜点、点心；计划外"),
    ("📱 额外30分钟游戏/电视", "30 C", "一周限兑换一次；pad使用时长+30min"),
    ("🍕 披萨/汉堡", "50 C", "一周限兑换一次"),
    ("🍫 零食", "20 C", "自选零食两份；计划外"),
    ("✏️ 文具（单件）", "20 C", "购买一件精美、高级的笔、橡皮等"),
    ("👫 朋友聚会/过夜", "25 C", "约一个朋友来家或外出"),
    ("📖 小书", "40 C", "购买一本¥50以内的小书"),
    ("🏀 运动器材", "50 C", "一个小型运动器材（球类、跳绳、哑铃等）"),
    ("🔬 科学实验套装", "80 C", ""),
    ("📚 书籍购买", "100 C", "购买一本>¥200的书籍"),
    ("🧸 玩具", "120 C", "益智类、科技类优先"),
    ("🔫 真人CS一次", "200 C", ""),
    ("🏸 羽毛球拍（进阶款）", "300 C", "计划外的球拍"),
    ("✨ 特别礼物", "1000 C", "购买一个特别想要的礼物（需要家长同意）"),
]

# ============================================================
# 构建文档
# ============================================================
doc = Document()

# 页面设置
section = doc.sections[0]
section.top_margin = Cm(1.5)
section.bottom_margin = Cm(1.5)
section.left_margin = Cm(1.8)
section.right_margin = Cm(1.8)

# 默认字体
style = doc.styles['Normal']
style.font.name = 'PingFang SC'
style.font.size = Pt(10.5)
rPr = style.element.get_or_add_rPr()
rFonts = OxmlElement('w:rFonts')
rFonts.set(qn('w:ascii'), 'PingFang SC')
rFonts.set(qn('w:eastAsia'), 'PingFang SC')
rPr.append(rFonts)

# ============================================================
# 标题
# ============================================================
title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
set_para_bg(title, COL_DARK)
add_run(title, " ", size=4)
title2 = doc.add_paragraph()
title2.alignment = WD_ALIGN_PARAGRAPH.CENTER
add_run(title2, "🎮 MAX's CREDITS 计划 🎮", size=26, bold=True, color=COL_PRIMARY)
title3 = doc.add_paragraph()
title3.alignment = WD_ALIGN_PARAGRAPH.CENTER
add_run(title3, "健康体魄 + 科学探索 + 快乐成长", size=12, color="555555")
doc.add_paragraph()

# 版本徽章
ver = doc.add_paragraph()
ver.alignment = WD_ALIGN_PARAGRAPH.RIGHT
add_run(ver, "v1.2  ·  2026-07-16  ·  管理员：爸爸、妈妈", size=9, color="888888")
doc.add_paragraph()

# ============================================================
# 一、Credits 系统说明
# ============================================================
def add_section_heading(text, color=COL_PRIMARY):
    p = doc.add_paragraph()
    set_para_bg(p, COL_DARK)
    add_run(p, f"  {text}  ", size=14, bold=True, color="FFFFFF")

add_section_heading("一、CREDITS 系统说明")

p = doc.add_paragraph()
add_run(p, "▶  ", size=11, bold=True, color=COL_PRIMARY)
add_run(p, "获取方式：", size=11, bold=True)
add_run(p, "完成各类任务获得相应 Credits，可重复获得并累积。", size=11)

p = doc.add_paragraph()
add_run(p, "▶  ", size=11, bold=True, color=COL_PRIMARY)
add_run(p, "用途：", size=11, bold=True)
add_run(p, "可兑换各类奖励，包括物质（礼物、玩具、饮食、现金等）和娱乐（看电视、打游戏、出行等）。", size=11)

p = doc.add_paragraph()
add_run(p, "▶  ", size=11, bold=True, color=COL_PRIMARY)
add_run(p, "计量单位：", size=11, bold=True)
add_run(p, "统一使用 ", size=11)
add_run(p, "Credits (C)", size=11, bold=True, color=COL_PRIMARY)
add_run(p, "，避免与「分数」混淆。", size=11)

# 过期机制 - 重点突出
p = doc.add_paragraph()
set_para_bg(p, COL_ACCENT)
add_run(p, "  ⏰ 月度过期机制（重点）：", size=11, bold=True, color=COL_DARK)
add_run(p, "  每月最后一日 23:59 自动清零账户余额的 10%（向下取整，不足1C不扣）。", size=11, bold=True, color=COL_DARK)
add_run(p, "  不消费 = 流失！", size=11, bold=True, color=COL_DANGER)

p = doc.add_paragraph()
add_run(p, "  👉 设计目的：让「花Credits」和「赚Credits」一样有趣，避免只攒不花。", size=10, color="666666")

doc.add_paragraph()

# ============================================================
# 二、Credits 项目（任务墙）
# ============================================================
add_section_heading("二、CREDITS 任务墙")

p = doc.add_paragraph()
add_run(p, "  共 ", size=10)
add_run(p, str(len(TASKS)), size=10, bold=True, color=COL_PRIMARY)
add_run(p, " 项任务，含正向激励 / 负向惩罚 / 课堂表现 / 行为规范四大类。", size=10)

# 任务表格
t1 = doc.add_table(rows=1, cols=5)
t1.style = 'Table Grid'
t1.autofit = False

# 表头
headers = ["类型", "任务", "Credits", "细则 / 备注"]
widths = [Cm(2.5), Cm(7.5), Cm(2.2), Cm(5.5)]
for i, h in enumerate(headers):
    cell = t1.rows[0].cells[i]
    cell.width = widths[i]
    set_cell_bg(cell, COL_DARK)
    set_cell_border(cell, COL_DARK, "12")
    cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_run(p, h, size=11, bold=True, color="FFFFFF")

for i, task in enumerate(TASKS):
    row = t1.add_row()
    bg = "FFFFFF" if i % 2 == 0 else "FFF8E7"
    for j in range(4):
        cell = row.cells[j]
        cell.width = widths[j]
        set_cell_bg(cell, bg)
        set_cell_border(cell, "CCCCCC", "4")
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER

    # 类型
    p = row.cells[0].paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    emoji, type_name, content, credits, note = task
    add_run(p, emoji + " ", size=11)
    add_run(p, type_name, size=10, bold=True)

    # 任务
    p = row.cells[1].paragraphs[0]
    add_run(p, content, size=10)

    # Credits
    p = row.cells[2].paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    if credits.startswith("+"):
        add_run(p, credits, size=11, bold=True, color=COL_SUCCESS)
    elif credits.startswith("-"):
        add_run(p, credits, size=11, bold=True, color=COL_DANGER)
    elif "×" in credits:
        add_run(p, credits, size=10, bold=True, color=COL_DANGER)
    else:
        add_run(p, credits, size=10, color="888888")

    # 备注
    p = row.cells[3].paragraphs[0]
    add_run(p, note, size=9, color="555555")

doc.add_paragraph()

# ============================================================
# 三、奖励兑换
# ============================================================
add_section_heading("三、奖励兑换商店")

p = doc.add_paragraph()
add_run(p, "  共 ", size=10)
add_run(p, str(len(REWARDS)), size=10, bold=True, color=COL_PRIMARY)
add_run(p, " 项奖励，从 ", size=10)
add_run(p, "1C", size=10, bold=True, color=COL_ACCENT)
add_run(p, " 现金到 ", size=10)
add_run(p, "1000C", size=10, bold=True, color=COL_ACCENT)
add_run(p, " 特别礼物，梯度满足日常 / 周 / 月 / 季各种需求。", size=10)

# 奖励表格
t2 = doc.add_table(rows=1, cols=3)
t2.style = 'Table Grid'
headers = ["奖励", "所需 Credits", "说明"]
widths2 = [Cm(6), Cm(3.5), Cm(8)]
for i, h in enumerate(headers):
    cell = t2.rows[0].cells[i]
    cell.width = widths2[i]
    set_cell_bg(cell, COL_DARK)
    set_cell_border(cell, COL_DARK, "12")
    cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_run(p, h, size=11, bold=True, color="FFFFFF")

for i, reward in enumerate(REWARDS):
    row = t2.add_row()
    bg = "FFFFFF" if i % 2 == 0 else "FFF8E7"
    for j in range(3):
        cell = row.cells[j]
        cell.width = widths2[j]
        set_cell_bg(cell, bg)
        set_cell_border(cell, "CCCCCC", "4")
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER

    name, cost, note = reward

    p = row.cells[0].paragraphs[0]
    add_run(p, name, size=10, bold=True)

    p = row.cells[1].paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_run(p, cost, size=12, bold=True, color=COL_PRIMARY)

    p = row.cells[2].paragraphs[0]
    add_run(p, note, size=9, color="555555")

doc.add_paragraph()

# ============================================================
# 四、Credits 管理
# ============================================================
add_section_heading("四、CREDITS 管理规则")

rules = [
    ("🏦 积分银行", '采用 "积分银行" 概念，自制「积分货币」；积分兑换对应面值的货币，可凑整/找零，不可透支/赊欠。'),
    ("⏱ 兑换节奏", "每周可兑换一次 50 C 及以下的奖励；每月可兑换一次 100 C 及以上的奖励。"),
    ("🔔 及时记账", "满足奖励条件时，及时兑换对应分值的货币；扣分则及时归还至积分银行。"),
    ("🤝 互信基础", "以上内容基于互相信任，不做强制监督或核查；但如发现作弊则取消对应积分（×3加重）。"),
    ("📜 规则迭代", "每次规则调整修订，需全家一致通过后打印公示。"),
    ("⚠️ 反钻漏洞", "本规则预计半年迭代一次，小朋友都是钻漏洞的大师，欢迎家长主动发现并提议修订。"),
]

for label, text in rules:
    p = doc.add_paragraph()
    add_run(p, f"  {label}  ", size=11, bold=True, color=COL_PRIMARY)
    add_run(p, text, size=10)

doc.add_paragraph()

# ============================================================
# 五、版本记录
# ============================================================
add_section_heading("五、版本记录 (CHANGELOG)")

t3 = doc.add_table(rows=1, cols=4)
t3.style = 'Table Grid'
headers = ["版本", "日期", "类型", "说明"]
widths3 = [Cm(1.8), Cm(2.5), Cm(2), Cm(11.5)]
for i, h in enumerate(headers):
    cell = t3.rows[0].cells[i]
    cell.width = widths3[i]
    set_cell_bg(cell, COL_DARK)
    set_cell_border(cell, COL_DARK, "12")
    cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_run(p, h, size=10, bold=True, color="FFFFFF")

changelog = [
    ("v1.0", "2025-12-?", "首发", "建立基础积分体系，涵盖作息/家务/学习/体能/成就5大类"),
    ("v1.1", "2026-01-05", "迭代", "补充跳绳挑战、完善备注、明确兑换节奏"),
    ("v1.2", "2026-07-16", "重大迭代", "① 积分→Credits，避免与分数混淆；② 新增月度10%过期机制；③ 删除跳绳挑战（已废）、新自行车（不合适）；④ 新增课堂表现/环比奖惩/行为扣分；⑤ 奖励梯度补齐3C/5C/15C/25C/40C小额；⑥ 新增pad使用时长+30min；⑦ 全部任务加Emoji；⑧ 引入「反钻漏洞」半年迭代机制"),
]
for row_data in changelog:
    row = t3.add_row()
    for j, val in enumerate(row_data):
        cell = row.cells[j]
        cell.width = widths3[j]
        set_cell_bg(cell, "FFF8E7" if row_data[0] == "v1.2" else "FFFFFF")
        set_cell_border(cell, "CCCCCC", "4")
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER if j < 3 else WD_ALIGN_PARAGRAPH.LEFT
        bold = (row_data[0] == "v1.2")
        color = COL_PRIMARY if row_data[0] == "v1.2" else None
        add_run(p, val, size=9 if j == 3 else 10, bold=bold, color=color)

doc.add_paragraph()

# 底部声明
foot = doc.add_paragraph()
foot.alignment = WD_ALIGN_PARAGRAPH.CENTER
add_run(foot, "🎮  Credits 是挣来的，也是花出去的。  🎮", size=11, bold=True, color=COL_PRIMARY)

foot2 = doc.add_paragraph()
foot2.alignment = WD_ALIGN_PARAGRAPH.CENTER
add_run(foot2, "注：本规则最终解释权归爸妈所有嘻嘻", size=9, color="888888")

# 保存
doc.save(OUT)
print(f"✅ docx 生成完成: {OUT}")
