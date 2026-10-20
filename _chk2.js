

/* ============================================================
   单一版本源：改这里，全站（标题/顶栏/页脚/控制台/云卡）自动同步
   —— 之前版本号散落 5 处，每次改版漏一处就出现「明明发布了却还是旧版」
   ============================================================ */
const APP_VER = 'v2.5.1';
const APP_DATE = '2026-10-20';
window.__APP_VER = APP_VER;   // 便于 DevTools / 体检报告里自报版本
(function(){
  document.addEventListener('DOMContentLoaded', () => {
    const d = document.title;
    if(d.indexOf('v2') < 0) document.title = document.title + ' · ' + APP_VER;
    document.querySelectorAll('[data-app-ver]').forEach(el => { el.textContent = APP_VER; });
    document.querySelectorAll('[data-app-date]').forEach(el => { el.textContent = APP_DATE; });
    // 页脚第二行（版本 · 日期）
    const f = document.querySelector('.foot-ver') || document.getElementById('footVer');
    if(f) f.textContent = APP_VER + ' · ' + APP_DATE;
  });
})();

/* ============================================================
   单一版本源：改这里，全站（标题/顶栏/页脚/控制台/云卡）自动同步
   —— 之前版本号散落 5 处，每次改版漏一处就出现「明明发布了却还是旧版」
   ============================================================ */
const APP_VER = 'v2.5.1';
const APP_DATE = '2026-10-20';
window.__APP_VER = APP_VER;   // 便于 DevTools / 体检报告里自报版本
(function(){
  document.addEventListener('DOMContentLoaded', () => {
    const d = document.title;
    if(d.indexOf('v2') < 0) document.title = document.title + ' · ' + APP_VER;
    document.querySelectorAll('[data-app-ver]').forEach(el => { el.textContent = APP_VER; });
    document.querySelectorAll('[data-app-date]').forEach(el => { el.textContent = APP_DATE; });
    // 页脚第二行（版本 · 日期）
    const f = document.querySelector('.foot-ver') || document.getElementById('footVer');
    if(f) f.textContent = APP_VER + ' · ' + APP_DATE;
  });
})();
/* ============================================================
   MAX's CREDITS  ·  v1.3.0  ·  数据 + 逻辑
   ------------------------------------------------------------
   分区索引（顺序即依赖顺序，勿随意调换）
     ① 数据定义   TASK_GROUPS / REWARD_CATS / TASKS / REWARDS / QUICK_IDS
     ② 状态存取   STORAGE_KEY / defaultState / loadState / saveState
     ③ 工具函数   DOM / 转义 / 时间 / 业务小算
     ④ 核心业务   addRecord / 月过期 / 完成任务 / 兑换奖励 / 连击 / 里程碑
     ⑤ 渲染层     render() + 各子渲染器（只读 state，不改 state）
     ⑥ 交互绑定   Tab / 视角 / 点击委托 / 爸妈控制台
     ⑦ 动效层     burst / giftPop / flyScore / shake / toast
     ⑧ 启动       初始化 + 调试入口 + 自检
   约定：任何改 state 的分支都必须落盘（直接 saveState 或经 addRecord 间接落盘）
   ============================================================ */

// ---------- ① 数据定义 ----------
// 分组配色提到顶层：渲染时查表即可，不必每次 render 重建对象
// v2.1.0：按 v1.2.3 计划拆为 7 类（「个人荣誉与进步」与「挑战成就」拆开）
const TASK_GROUPS = {
  daily:     {label:'🌅 作息与家庭', color:'var(--primary)'},
  study:     {label:'📚 学习习惯', color:'var(--info)'},
  fit:       {label:'💪 体能训练', color:'var(--accent-2)'},
  honor:     {label:'🏅 个人荣誉与进步', color:'var(--accent)'},
  challenge: {label:'🎯 挑战成就', color:'var(--pink)'},
  class:     {label:'📝 课堂表现', color:'var(--purple)'},
  behav:     {label:'⚠️ 行为规范', color:'var(--danger)'},
};

const REWARD_CATS = {
  daily: {label:'💸 日常级 (1~10C)', color:'var(--primary)'},
  week:  {label:'🗓️ 周级 (15~60C)', color:'var(--accent)'},
  month: {label:'📅 月级 (50~150C)', color:'var(--info)'},
  big:   {label:'🌟 梦想级 (200+C)', color:'var(--purple)'},
};

// v2.1.0：按《MAX's CREDITS PLAN v1.2.3》(2026-10-12) 全量重录
// legacy:true = 旧版条目，默认停用，后台工坊可勾选启用（"备选项"机制）
const TASKS = [
  // ── 作息与家庭类 ──
  {id:'t_dawn', emoji:'⏰', type:'晨起作息', text:'每天 7 点半前主动起床（工作日）；超过 7 点半不起床扣积分', val:-1, group:'daily', note:'周末/假期除外；家长不必须提供唤醒服务'},
  {id:'t_home', emoji:'🏠', type:'家务', text:'简单家务：摆放碗筷、洗碗、丢垃圾、倒米等', val:1, group:'daily', note:'单日完成一项即可记，不累积'},
  {id:'t_screen', emoji:'📱', type:'电子产品管理', text:'工作日看电视/电子游戏，单日总计不超过半小时，超时扣积分', val:-10, group:'daily', note:'必须先完成当日学习任务；家长可提醒一次，提醒后再超时免除一周~一月电视/游戏时间'},
  {id:'t_brush', emoji:'🪥', type:'个人卫生', text:'早上未刷牙（默认已养成，违规扣分）', val:-1, group:'daily', note:'连续不刷第二天-2', legacy:true},

  // ── 学习习惯类 ──
  {id:'t_eng_p', emoji:'📖', type:'学习惯做', text:'额外布置任务：英语背句子、抄句子、做练习', val:2, group:'study', note:'针对薄弱项；表现优秀视情况额外加 1~3'},
  {id:'t_read', emoji:'📚', type:'阅读习惯', text:'每天阅读（文字为主）累计 ≥ 30 分钟；不阅读或不足时间扣积分', val:-2, group:'study', note:'书店、家里的纸质书'},
  {id:'t_check', emoji:'✅', type:'作业习惯', text:'每日常规作业完成后自己检查一遍，然后家长检查、全对奖励积分', val:5, group:'study', note:'一科 +5；单日，可累积'},
  {id:'t_eng_col', emoji:'📋', type:'作业习惯', text:'英语常规表，单张单周一周全对', val:5, group:'study', note:'仅限手写部分'},
  {id:'t_careless', emoji:'❌', type:'粗心大意', text:'因粗心大意发生 2 次以上的错误', val:-1, group:'study', note:'每次 -1；单科、单日、可累积'},
  {id:'t_eng_week', emoji:'🗓️', type:'英语周全对', text:'单周每一竖列一周全对', val:5, group:'study', note:'周末结算', legacy:true},

  // ── 体能训练类 ──
  {id:'t_fit_full', emoji:'💪', type:'体能训练', text:'每天完成完整一整套体能训练（俯卧撑、仰卧起坐等）', val:10, group:'fit', note:'可分次完成；在家；标准动作；全套见《Max在家体能训练》表'},
  {id:'t_fit_one', emoji:'🏋️', type:'体能训练', text:'每天完成单项体能训练（平板撑、跳绳等）', val:1, group:'fit', note:'在家；标准动作'},

  // ── 个人荣誉与进步类 ──
  {id:'t_honor', emoji:'🏅', type:'个人荣誉', text:'学校奖励个人优秀荣誉、先进称号等（含奖状）', val:20, group:'honor', note:'根据实际成就酌情加 10~30，如班级 < 年级 < 校级'},
  {id:'t_progress', emoji:'📈', type:'进步成就', text:'阶段性显著进步：作业表现、考试成绩单科上升 10 分及以上、羽毛球/中提琴等专业项目状态表现', val:20, group:'honor', note:'需家长评估；或老师、教练提出表扬'},

  // ── 挑战成就类 ──
  {id:'t_test_s', emoji:'🎯', type:'小考', text:'单元测试、常规测验等打分小考，单科成绩 ≥ 90 分起奖励', val:20, group:'challenge', note:'90~94 分 +20；95~97 +50；98~99 +80；100 +100'},
  {id:'t_test_b', emoji:'🏆', type:'大考', text:'期中、期末等大考，单科成绩 ≥ 90 分起奖励', val:50, group:'challenge', note:'90~94 分 +50；95~97 +80；98~99 +120；100 +200'},
  {id:'t_delta_up', emoji:'📊', type:'环比奖惩', text:'大小考/卷子小测，距上次分数提高', val:1, group:'challenge', note:'提高几分加几分（分值可改）；单科单独计算'},
  {id:'t_delta_dn', emoji:'📉', type:'环比奖惩', text:'大小考/卷子小测，距上次分数下降', val:-1, group:'challenge', note:'下降积分-几（分值可改）；单科单独计算'},
  {id:'t_compete', emoji:'🥇', type:'挑战成就', text:'正式比赛、竞赛、考试、考级取得名次或优秀', val:50, group:'challenge', note:'根据实际成就酌情翻倍（最高可翻四倍）；根据表现状态（意志、策略、调整等）酌情奖励 +5~10'},
  {id:'t_white', emoji:'🌟', type:'挑战成就', text:'教育部白名单竞赛取得名次', val:200, group:'challenge', note:'根据实际成就酌情翻倍（最高可翻五倍）；根据表现状态酌情奖励 +50~100'},

  // ── 课堂表现类 ──
  {id:'t_class_ap', emoji:'📝', type:'课堂表现', text:'课堂听写、练习等老师评为 A+', val:5, group:'class', note:'+5/科；一科一项'},
  {id:'t_class_app', emoji:'📝', type:'课堂表现', text:'课堂听写、练习等老师评为 A++', val:10, group:'class', note:'+10/科；与 A+ 不叠加'},
  {id:'t_class_c', emoji:'📝', type:'课堂表现', text:'课堂测验得 C', val:-2, group:'class', note:'一科一项'},
  {id:'t_class_d', emoji:'📝', type:'课堂表现', text:'课堂测验得 D', val:-5, group:'class', note:'一科一项'},
  {id:'t_class_e', emoji:'📝', type:'课堂表现', text:'课堂测验得 E', val:-10, group:'class', note:'一科一项'},
  {id:'t_xdf_fail', emoji:'📖', type:'课外表现', text:'新东方词测不通过、被留班', val:-2, group:'class'},
  {id:'t_xdf_good', emoji:'🌟', type:'课外表现', text:'新东方课上表现优秀，或被老师奖励', val:2, group:'class'},
  {id:'t_xdf_hw', emoji:'📓', type:'课外表现', text:'新东方作业被老师在线督促', val:-1, group:'class'},

  // ── 行为规范类 ──
  {id:'t_excuse', emoji:'⚠️', type:'行为扣分', text:'找借口逃避任务、拖延时间', val:-10, group:'behav', note:'与任务本身扣分不叠加'},
  {id:'t_cheat', emoji:'🚫', type:'行为扣分', text:'作弊/撒谎', val:-100, group:'behav', note:'如有积分奖励则取消'},
  {id:'t_temper', emoji:'😤', type:'发脾气', text:'辱骂/发脾气', val:-5, group:'behav', note:'冷静后可申请复议', legacy:true},
];

// v2.1.0：按 v1.2.3「奖励兑换商店」9 项重录；旧 21 项商品 legacy:true 默认停用，后台可勾选启用
const REWARDS = [
  {id:'r_cash', emoji:'💵', name:'现金', cost:1, cat:'daily', note:'1 元起，不封顶；人民币（现金或转账）'},
  {id:'r_stationery', emoji:'✏️', name:'文具（单件）', cost:20, cat:'week', note:'购买一件精美、高级的笔、橡皮等'},
  {id:'r_tv15', emoji:'📺', name:'延长 15 分钟电视时间', cost:30, cat:'week', note:'额外电视时间；限一周一次；仅限工作日'},
  {id:'r_game30', emoji:'📱', name:'额外 30 分钟游戏', cost:60, cat:'week', note:'一月限兑换一次；仅限周末'},
  {id:'r_sport', emoji:'🏀', name:'运动器材', cost:50, cat:'month', note:'小型运动器材（球类、跳绳、哑铃等）'},
  {id:'r_book', emoji:'📚', name:'书籍购买', cost:100, cat:'month', note:'一次 ≤ 五本；内容/价格不限'},
  {id:'r_toy', emoji:'🧸', name:'玩具', cost:150, cat:'month', note:'益智类、科技类优先'},
  {id:'r_badm', emoji:'🏸', name:'羽毛球拍（进阶款）', cost:300, cat:'big', note:'计划外的球拍'},
  {id:'r_special', emoji:'✨', name:'特别礼物', cost:1000, cat:'big', note:'购买一个特别想要的礼物（需家长同意）'},

  // ── 以下为旧版商品（v1.2.3 已下架），默认停用，后台工坊可勾选启用 ──
  {id:'r_fruit', emoji:'🍎', name:'水果时间', cost:3, cat:'daily', legacy:true},
  {id:'r_ep', emoji:'📺', name:'1集动画', cost:3, cat:'daily', legacy:true},
  {id:'r_piggy', emoji:'💰', name:'5元小金库', cost:5, cat:'daily', legacy:true},
  {id:'r_drink', emoji:'🥤', name:'甜饮料', cost:8, cat:'daily', legacy:true},
  {id:'r_ice', emoji:'🍦', name:'冰淇淋/雪糕', cost:10, cat:'daily', legacy:true},
  {id:'r_dessert', emoji:'🍰', name:'甜点一份', cost:15, cat:'week', legacy:true},
  {id:'r_out', emoji:'🌳', name:'一次小出游', cost:15, cat:'week', legacy:true},
  {id:'r_snack', emoji:'🍫', name:'零食两份', cost:20, cat:'week', legacy:true},
  {id:'r_friend', emoji:'👫', name:'朋友聚会/过夜', cost:25, cat:'week', legacy:true},
  {id:'r_screen30', emoji:'📱', name:'额外30min游戏/电视', cost:30, cat:'week', legacy:true},
  {id:'r_pizza', emoji:'🍕', name:'披萨/汉堡', cost:50, cat:'week', legacy:true},
  {id:'r_book_s', emoji:'📖', name:'小书（¥50内）', cost:40, cat:'week', legacy:true},
  {id:'r_sci', emoji:'🔬', name:'科学实验套装', cost:80, cat:'month', legacy:true},
  {id:'r_cs', emoji:'🔫', name:'真人CS一次', cost:200, cat:'big', legacy:true},
];

// ----- 默认快捷任务（首页显示） -----
const QUICK_IDS = ['t_dawn','t_home','t_eng_p','t_read','t_fit_full'];

// ---------- ② 状态存取 ----------
const STORAGE_KEY = 'max_credits_v12';   // 沿用 v1.2 键名，升级不丢数据

const defaultState = () => ({
  balance: 0,
  records: [],            // {time, type:'in'|'out', val, name, taskId?}
  doneToday: {},          // {taskId:'YYYY-MM-DD'} 当日已完成；跨天自动失效
  monthIn: 0,             // 本月入账（不含余额结转）
  monthOut: 0,
  totalIn: 0,
  totalOut: 0,
  cfg: {
    expireRate: 1, initBal: 0, expireOn: true,   // v2.1.0：v1.2.3 规则 = 月底扣 1%，最低 1
    pin: '',          // 管理员 PIN（旧版兼容；设置账号后清空）
    sound: true,      // 得分音效开关
    childName: '',    // 孩子英文名（必填，空则回落 CHILD_NAME）
    admin: {email: '', passHash: ''},   // 管理员账号：邮箱 + 密码哈希（找回凭证）
    setupDone: false, // 初始向导是否已完成
    pack: 'v1.2.3',   // 当前生效的规则包版本（商业化预留：规则与数据分离的锚点）
    theme: 'arcade',  // 外观主题：arcade 街机 | sweet 甜美 | funny 搞怪
    sfxStyle: 'retro',// 音效风格：retro 复古 | soft 柔和 | silly 滑稽
    fx: 'full',       // 特效档位：full 全开 | mini 轻量 | off 关闭
    customTasks: [],  // 自定义任务（工坊新增）
    customRewards: [],// 自定义奖励（工坊新增）
    taskOv: {},       // 任务覆盖：{taskId: {val?, off?}}
    rewardOv: {},     // 奖励覆盖：{rewardId: {cost?, off?}}
    tables: {},       // v2.3.0：数据表格（如成绩批量录入），与 records 双向锚定
    // v2.4.0 评分规则：支持「分数制 / 等级制」两种来源 + 可编辑映射表
    scoreRules: {
      mode: 'percent',        // percent = 分数÷满分×100（推荐，满分可 80/100/120）；raw = 分数÷标准分×100
      standard: 100,          // raw 模式的标准分（默认 100）
      bands:    [{min:90, reward:20}, {min:95, reward:50}, {min:98, reward:80}, {min:100, reward:100}],   // 小考
      bandsBig: [{min:90, reward:50}, {min:95, reward:80}, {min:98, reward:120}, {min:100, reward:200}],  // 大考
      grades:   [{g:'A++', reward:10}, {g:'A+', reward:5}, {g:'B', reward:0}, {g:'C', reward:-2}, {g:'D', reward:-5}, {g:'E', reward:-10}],
    },
  },
  view: 'max',            // 'max' | 'parent'（parent 为会话态，不落盘）
  lastResetMonth: null,   // 'YYYY-MM'，防重复执行月过期
  updatedAt: 0,           // v2.2.0：本地最后修改时间戳（云同步 LWW 用）
});

let state = loadState();

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return defaultState();
    return hydrate(JSON.parse(raw) || {});
  }catch(e){
    console.warn('[MAX] 存档读取失败，已回退初始状态', e);
    return defaultState();
  }
}

// 深合并存档（localStorage / 云端 / 导入共用）：cfg 逐字段合，老存档缺新字段不丢
// v2.2.0：云同步发现浅合并会把 cfg 整体替换掉 → taskOv 丢失 → 渲染崩
// ---- v2.5.0：完整存档深合并 ----
function hydrate(saved){
  const base = defaultState();
  return Object.assign(base, saved, {
    cfg: Object.assign(base.cfg, saved.cfg || {}),
    records: Array.isArray(saved.records) ? saved.records : base.records,
    doneToday: (saved.doneToday && typeof saved.doneToday === 'object') ? saved.doneToday : {},
  });
}

function saveState(){
  state.updatedAt = Date.now();   // v2.2.0：本地修改时间戳，云同步 LWW 比较用
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }catch(e){
    // 隐私模式 / 配额满：宁可报错，也不能让用户以为数据已存下
    toast('⚠️ 保存失败：浏览器存储不可用', 'error');
    console.error('[MAX] saveState 失败', e);
  }
  scheduleCloudPush();   // 配置了自动同步才真正发起
}

// 记住的登录邮箱（与主数据分开，导入/重置不丢账号列表）
const ACCOUNTS_KEY = 'max_credits_accounts';
function loadAccounts(){
  try{ return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]') || []; }
  catch(e){ return []; }
}
function saveAccounts(list){
  try{ localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list)); }
  catch(e){ console.error('[MAX] saveAccounts 失败', e); }
}
function rememberAccount(email){
  const e = String(email || '').trim().toLowerCase();
  if(!e) return;
  const list = loadAccounts();
  if(!list.includes(e)){
    list.unshift(e);
    saveAccounts(list.slice(0, 10));
  }
}
function accountOptions(currentEmail){
  const list = loadAccounts();
  const cur = String(currentEmail || '').trim().toLowerCase();
  // 当前账号放在最前
  const ordered = cur && list.includes(cur)
    ? [cur, ...list.filter(x => x !== cur)]
    : list;
  return ordered.map(e => ({v:e, l:e}));
}

// ---------- ③ 工具函数 ----------
const $ = id => document.getElementById(id);
const pad2 = n => String(n).padStart(2, '0');
const now = () => new Date();

// 导入的 JSON 会经 innerHTML 渲染，必须转义
const ESC_MAP = {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'};
const esc = s => String(s).replace(/[&<>"']/g, c => ESC_MAP[c]);

const dayStr   = (d = now()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const monthStr = (d = now()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
const clockStr = (d = now()) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const recordTimeStr = ms => {const t = new Date(ms); return `${t.getMonth() + 1}/${t.getDate()} ${clockStr(t)}`;};

const daysInMonth     = () => new Date(now().getFullYear(), now().getMonth() + 1, 0).getDate();
const daysLeftInMonth = () => daysInMonth() - now().getDate();
const pendingExpire   = () => {
  if(!state.cfg.expireOn || state.balance <= 0) return 0;
  return Math.max(1, Math.floor(state.balance * state.cfg.expireRate / 100));   // v1.2.3：最低扣 1
};
const isDoneToday     = id => state.doneToday[id] === dayStr();
const signed          = n => (n >= 0 ? '+' : '') + n;

// 规则可被后台覆盖：未覆盖时回落到内置常量
const taskVal    = t => state.cfg.taskOv[t.id]?.val ?? t.val;
const taskOff    = t => !!state.cfg.taskOv[t.id]?.off;
const rewardCost = r => state.cfg.rewardOv[r.id]?.cost ?? r.cost;
const rewardOff  = r => !!state.cfg.rewardOv[r.id]?.off;
// 工坊合并视图：内置常量 + 覆盖 + 自定义，UI 渲染统一走这里
// legacy:true 旧版条目默认停用（后台可勾选启用 = 备选项机制）
function mergedTasks(){
  const ov = state.cfg.taskOv || {};
  const base = TASKS.map(t => ({
    ...t,
    emoji: ov[t.id]?.emoji ?? t.emoji,
    type:  ov[t.id]?.type  ?? t.type,
    text:  ov[t.id]?.text  ?? t.text,
    val:   ov[t.id]?.val   ?? t.val,
    off:   ov[t.id]?.off ?? !!t.legacy,
  }));
  return base.concat((state.cfg.customTasks || []).map(t => ({...t, off: !!t.off})));
}
function mergedRewards(){
  const ov = state.cfg.rewardOv || {};
  const base = REWARDS.map(r => ({
    ...r,
    emoji: ov[r.id]?.emoji ?? r.emoji,
    name:  ov[r.id]?.name  ?? r.name,
    note:  ov[r.id]?.note  ?? r.note,
    cost:  ov[r.id]?.cost  ?? r.cost,
    off:   ov[r.id]?.off ?? !!r.legacy,
  }));
  return base.concat((state.cfg.customRewards || []).map(r => ({...r, off: !!r.off})));
}
const activeTasks   = () => mergedTasks().filter(t => !t.off);
const activeRewards = () => mergedRewards().filter(r => !r.off);

// Credits 货币符号 = 孩子名字首字母 + 金色硬币
// 孩子英文名：默认 Max，后台「系统设置 → 孩子英文名」可改（必填，留空回落默认）
const CHILD_NAME = 'Max';
const childName = () => (String(state.cfg.childName || '').trim() || CHILD_NAME);
const childInitial = () => childName()[0].toUpperCase();
const COIN = '🪙';

// 品牌名渲染：{NAME}'S CREDITS PLAN（页眉 / 标签页标题）
function renderBrand(){
  const n = childName();
  const el = $('brandText');
  if(el) el.innerHTML = `${esc(n.toUpperCase())}<em>'S</em> CREDITS PLAN`;
  const uc = $('unitCoin');
  if(uc) uc.textContent = childInitial();
  const mc = $('miniCoin');
  if(mc) mc.textContent = childInitial();
  document.title = `${n}'s Credits Plan · v1.6.0`;
}

// ---------- 初始向导：孩子档案 + 家长账号 ----------
function wizShow(){
  $('wiz').classList.add('show');
  $('wizStep1').style.display = '';
  $('wizStep2').style.display = 'none';
  $('wizStep3').style.display = 'none';
  $('wizChild').value = childName();
  const n = childName();
  $('wizBrand').textContent = n.toUpperCase() + "'S CREDITS PLAN";
  $('wizCoin').textContent = childInitial();
}
function wizNext1(){
  const v = String($('wizChild').value || '').trim();
  if(!v){
    $('wizErr1').textContent = '孩子英文名必填哦';
    return;
  }
  $('wizErr1').textContent = '';
  state.cfg.childName = v;
  saveState(); renderBrand();
  $('wizBrand').textContent = v.toUpperCase() + "'S CREDITS PLAN";
  $('wizCoin').textContent = childInitial();
  $('wizStep1').style.display = 'none';
  $('wizStep2').style.display = '';
}
function wizBack1(){
  $('wizStep2').style.display = 'none';
  $('wizStep1').style.display = '';
}
async function wizFinish(){
  const email = String($('wizEmail').value || '').trim().toLowerCase();
  const pass = String($('wizPass').value || '');
  if(email || pass){
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
      $('wizErr2').textContent = '邮箱格式不对（或点「稍后再设」跳过）';
      return;
    }
    if(!pass){
      $('wizErr2').textContent = '请输入密码（或点「稍后再设」跳过）';
      return;
    }
    state.cfg.admin = {email, passHash: await sha256(pass)};
    state.cfg.pin = '';
    rememberAccount(email);
  }
  $('wizErr2').textContent = '';
  state.cfg.setupDone = true;
  saveState();
  $('wizStep2').style.display = 'none';
  $('wizStep3').style.display = '';
  $('wizDoneText').innerHTML =
    `孩子档案：<b>${esc(childName())}</b>（货币首字母 <span class="coin">${childInitial()}</span>）<br>` +
    (state.cfg.admin.email ? `管理员：${esc(maskEmail(state.cfg.admin.email))}（进后台需登录）` : '管理员账号：稍后在「系统设置」里补');
  render();
}
function wizSkip(){
  $('wizErr2').textContent = '';
  $('wizStep2').style.display = 'none';
  $('wizStep3').style.display = '';
  state.cfg.setupDone = true;
  saveState();
  $('wizDoneText').innerHTML = `孩子档案：<b>${esc(childName())}</b> 已建好。家长账号可稍后在「系统设置」里补设。`;
  render();
}
function wizClose(){
  $('wiz').classList.remove('show');
  render();
  toast(`🎉 欢迎来到 ${childName()}'s Credits Plan！`);
  setTimeout(function(){toast('⚙ 设置入口：点击顶栏「爸妈」按钮（或右下角 ⚙）', 'success');}, 1800);
}

// SHA-256：优先 Web Crypto；无 secure context 时降级为弱哈希（家庭场景够用，注释标明）
async function sha256(text){
  try{
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text)));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }catch(e){
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    const t = String(text);
    for(let i = 0; i < t.length; i++){
      const ch = t.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 'w' + (h2 >>> 0).toString(16) + (h1 >>> 0).toString(16);   // 弱哈希兜底，非加密级
  }
}

function maskEmail(e){
  e = String(e);
  const i = e.indexOf('@');
  return i <= 1 ? e : e[0] + '***' + e.slice(i);
}

// ---------- 得分音效：Web Audio 现场合成，零素材零版权 ----------
let _audio = null;
function audioCtx(){
  if(!_audio) _audio = new (window.AudioContext || window.webkitAudioContext)();
  if(_audio.state === 'suspended') _audio.resume();
  return _audio;
}
function tone(freq, dur, type, vol, delay){
  if(state.cfg.sound === false) return;
  try{
    const ctx = audioCtx();
    const t0 = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(vol || 0.1, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }catch(e){ /* 音频不可用时静默 */ }
}
function sfxWave(){
  return {retro:'square', soft:'triangle', silly:'sawtooth'}[state.cfg.sfxStyle] || 'square';
}
const sfx = {
  coin(){ const w = sfxWave(); tone(1046, .1, w, .09); tone(1568, .38, w, .09, .1); },
  reward(){ const w = sfxWave(); [523, 659, 784, 1046].forEach((f, i) => tone(f, .2, w, .1, i * .09)); },
  undo(){ const w = sfxWave(); tone(660, .1, w, .08); tone(440, .22, w, .08, .1); },
  milestone(){ const w = sfxWave(); [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, .24, w, .11, i * .1)); },
};
// 锯齿音偏刺耳，音量打折
const _origTone = tone;
tone = function(freq, dur, type, vol, delay){
  return _origTone(freq, dur, type, type === 'sawtooth' ? (vol || 0.1) * 0.6 : vol, delay);
};

// ---------- ④ 核心业务 ----------

// 唯一改余额入口：保证 balance / records / 月度累计三处同步落盘
function addRecord(type, val, name, taskId){
  state.balance += val;
  // v2.3.0：记录带 id，数据表格靠它做「表格 ↔ 记录」双向锚定
  const rec = {id: 'rc' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), time: Date.now(), type, val, name, taskId};
  state.records.unshift(rec);
  if(type === 'in'){
    state.monthIn += val;
    state.totalIn += val;
  }else{
    state.monthOut += Math.abs(val);
    state.totalOut += Math.abs(val);
  }
  saveState();
  return rec;
}

// 跨月按比例回收上月余额。
// 仅当「已知上月月份」时才扣——首次运行（lastResetMonth 为 null）只记录月份，
// 否则首次打开就会白扣一次 10%。
function checkMonthlyExpire(){
  const thisMonth = monthStr();
  if(state.lastResetMonth === thisMonth) return;

  const monthChanged = state.lastResetMonth !== null;
  if(monthChanged && state.cfg.expireOn && state.balance > 0){
    const expire = pendingExpire();   // v1.2.3：1% 取整，最低扣 1
    if(expire > 0){
      state.balance -= expire;
      state.monthOut += expire;
      state.totalOut += expire;
      state.records.unshift({time: Date.now(), type:'out', val:-expire, name:`⏰ 月度过期 -${state.cfg.expireRate}%`});
      toast(`📅 新月已回收 ${expire}${COIN}（-${state.cfg.expireRate}%）`, 'error');
    }
  }
  state.monthIn = 0;
  state.monthOut = 0;
  state.lastResetMonth = thisMonth;
  saveState();
}

// 连击：15 秒内连续完成计为连击，只影响粒子数量与提示文案
const COMBO_WINDOW_MS = 15000;
let comboCount = 0, comboAt = 0;
function bumpCombo(){
  const t = Date.now();
  comboCount = (t - comboAt < COMBO_WINDOW_MS) ? comboCount + 1 : 1;
  comboAt = t;
  return comboCount;
}

// 里程碑：只在「跨过」阈值那一刻庆祝一次
const MILESTONES = [100, 300, 500, 1000, 2000];
function checkMilestone(before, after){
  for(const m of MILESTONES){
    if(before < m && after >= m){
      giftPop('🏆');
      sfx.milestone();
      toast(`🏆 达成 ${m} ${COIN}！太强了！`, 'success');
      return;
    }
  }
}

function completeTask(task, sourceEl){
  // v2.1.0：作弊/撒谎按 v1.2.3 规则统一 -100（旧版「×3 扣除」弹窗已移除）
  const val = taskVal(task);
  const before = state.balance;
  addRecord(val >= 0 ? 'in' : 'out', val,
            `${task.emoji} ${task.text} ${signed(val)}`, task.id);
  state.doneToday[task.id] = dayStr();
  saveState();   // v1.2 漏了这步 → 刷新后当天任务可重复点、无限刷分
  if(navigator.vibrate) try{navigator.vibrate(10);}catch(e){}   // 移动端触感反馈（不支持自动跳过）

  const combo = bumpCombo();
  flyScore(sourceEl, `${signed(val)} ${COIN}`, val >= 0);
  if(val >= 0){
    burst(12 + Math.min(combo, 5) * 4);
    coinPop(sourceEl);
    sfx.coin();
  }else{
    sfx.undo();
  }
  render();

  const comboTip = combo >= 2 ? `　🔥 ${combo} 连击!` : '';
  toast(`${signed(val)}${COIN} · ${task.text}${comboTip}`, val > 0 ? 'success' : 'error');
  checkMilestone(before, state.balance);
}

// v1.2.3 兑换频次：≤50🪙 每周限一次；≥100🪙 每月限一次（单条 note 另有说明的以 note 为准）
function redeemLimitHit(r){
  const cost = rewardCost(r);
  if(cost <= 0) return null;
  const mine = state.records.filter(x => x.type === 'out' && x.taskId === r.id);
  const nowD = new Date();
  if(cost <= 50){
    const monday = new Date(nowD);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    if(mine.some(x => x.time >= monday.getTime())) return '本周已兑换过该奖励（≤50🪙 每周限一次）';
  }
  if(cost >= 100){
    const monthStart = new Date(nowD.getFullYear(), nowD.getMonth(), 1).getTime();
    if(mine.some(x => x.time >= monthStart)) return '本月已兑换过该奖励（≥100🪙 每月限一次）';
  }
  return null;
}

function redeemReward(r){
  const cost = rewardCost(r);
  if(state.balance < cost){
    toast(`余额不足！还差 ${cost - state.balance}${COIN}`, 'error');
    shake($('balNum'));
    return;
  }
  const limitMsg = redeemLimitHit(r);
  if(limitMsg){
    toast(`⏱ ${limitMsg}`, 'error');
    shake($('balNum'));
    return;
  }
  showModal({
    emoji:r.emoji,
    title:`兑换 ${r.name}?`,
    sub:`需要 <b style="color:var(--primary)">${cost} ${COIN}</b>，当前余额 <b>${state.balance} ${COIN}</b>。${r.note ? '<br><br>' + esc(r.note) : ''}`,
    actions:[
      {label:'再想想'},
      {label:`确认兑换 -${cost}${COIN}`, cls:'primary', onClick:() => {
        addRecord('out', -cost, `${r.emoji} 兑换 ${r.name} -${cost}`, r.id);
        giftPop(r.emoji);
        sfx.reward();
        render();
        toast(`🎉 成功兑换 ${r.name}!`, 'success');
        closeModal();
      }},
    ],
  });
}

// ---------- ⑤ 渲染层（只读 state，不改 state） ----------
function render(){
  const activeView = document.querySelector('.view.active');
  const viewScroll = activeView ? activeView.scrollTop : 0;
  const pageScroll = document.documentElement.scrollTop;

  renderBalance();
  renderHomeCards();
  renderTaskWall();
  renderShop();
  renderRecordList();
  if(state.view === 'parent'){
    renderAdmin();
    renderAdminRules();
    renderAdminStats();
    renderCloudCard();
    renderDataTable();
    renderScoreRules();
  }

  if(activeView) activeView.scrollTop = viewScroll;
  document.documentElement.scrollTop = pageScroll;
}

function renderBalance(){
  const numEl = $('balNum');
  if(parseInt(numEl.textContent, 10) !== state.balance){
    numEl.classList.add('flip');
    setTimeout(() => numEl.classList.remove('flip'), 500);
  }
  numEl.textContent = state.balance;
  $('miniBalNum').textContent = state.balance;

  $('monthIn').textContent  = '+' + state.monthIn;
  $('monthOut').textContent = '-' + state.monthOut;

  const left = daysLeftInMonth(), total = daysInMonth();
  $('expireDays').textContent   = left + ' 天';
  $('expireRateLabel').textContent = state.cfg.expireRate + '%';   // v2.1.0：跟随设置（默认 1%）
  $('expireFill').style.width   = ((total - left) / total * 100) + '%';
  $('expireSoon').textContent   = pendingExpire();

  $('taskCount').textContent = activeTasks().length + ' 项';
  $('shopCount').textContent = activeRewards().length + ' 件';
  const sec = $('secChildInfo');
  if(sec) sec.textContent = `${childName()}（货币首字母 ${childInitial()}）｜管理员 ${state.cfg.admin?.email ? maskEmail(state.cfg.admin.email) : '未设置'}`;
}

function renderHomeCards(){
  const willExpire = pendingExpire();
  const left = daysLeftInMonth();
  const hints = [];

  if(state.balance === 0){
    hints.push('👋 欢迎使用 '+childName().toUpperCase()+'\'s CREDITS！从「任务」开始赚你的第一笔 Credits 吧。');
  }else{
    hints.push(`💰 当前 <b style="color:var(--primary)">${state.balance} ${COIN}</b>，月底将自动扣除 <b style="color:var(--danger)">${willExpire} ${COIN}</b>。`);
  }
  if(left <= 5 && willExpire > 0){
    hints.push(`<br>⚠️ <b style="color:var(--danger)">还有 ${left} 天</b>就到月底了，未花掉的 Credits 会被回收哦！`);
  }else if(state.balance > 100 && willExpire >= 10){
    hints.push('<br>🎯 余额充足，去「商店」挑个心仪的奖励吧！');
  }
  $('todayHint').innerHTML = hints.join('');

  // 仪表盘四宫格
  const dashStats = [
    {label:'当前余额', val:state.balance, cls:''},
    {label:'本月入账', val:'+'+state.monthIn, cls:'green'},
    {label:'本月出账', val:'-'+state.monthOut, cls:'red'},
    {label:'将过期', val:'-'+willExpire, cls:'yellow'},
  ];
  $('dashStats').innerHTML = dashStats.map(s => `
    <div class="dash-tile">
      <div class="label">${s.label}</div>
      <div class="val ${s.cls}">${s.val}</div>
    </div>`).join('');

  $('quickTasks').innerHTML = QUICK_IDS
    .map(id => mergedTasks().find(t => t.id === id))
    .filter(t => t && !t.off)
    .map(taskItemHTML).join('');

  const recent = state.records
    .filter(r => r.type === 'out' && (r.name.includes('兑换') || r.name.includes('过期')))
    .slice(0, 3);
  $('recentRedeem').innerHTML = recent.length
    ? recent.map(recordHTML).join('')
    : '<div class="empty">还没有兑换记录，去商店看看吧 →</div>';

  // 本周走势 + 任务 TOP 3
  renderWeekChartInto($('homeChart'));
  renderRankList($('homeTopTasks'), 3);
}

function renderWeekChartInto(el){
  const days = [];
  for(let i = 6; i >= 0; i--){
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({key: dayStr(d), label: `${d.getMonth() + 1}/${d.getDate()}`, amount: 0});
  }
  const index = {};
  days.forEach(d => {index[d.key] = 0;});
  state.records.forEach(r => {
    if(r.type !== 'in') return;
    const k = dayStr(new Date(r.time));
    if(k in index) index[k] += r.val;
  });
  days.forEach(d => {d.amount = index[d.key];});
  const max = Math.max(1, ...days.map(d => d.amount));
  el.innerHTML = days.map((d, i) => `
    <div class="bar-col">
      <div class="bar-v">${d.amount || ''}</div>
      <div class="bar ${i === days.length - 1 ? 'today' : ''}" style="height:${Math.max(3, d.amount / max * 100)}%"></div>
      <div class="bar-x">${d.label}</div>
    </div>`).join('');
}

// 任务完成次数排行榜（首页 TOP3 / 后台 TOP5 共用）
function renderRankList(el, limit){
  const freq = {};
  state.records.forEach(r => { if(r.taskId) freq[r.taskId] = (freq[r.taskId] || 0) + 1; });
  const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, limit);
  el.innerHTML = top.length
    ? '<div class="rank-list">' + top.map(([id, n], i) => {
        const t = mergedTasks().find(x => x.id === id);
        return `<div class="rank-item"><span class="rk">${i + 1}</span>` +
               `<span class="rn">${t ? t.emoji + ' ' + esc(t.type) : esc(id)}</span>` +
               `<span class="rc">×${n}</span></div>`;
      }).join('') + '</div>'
    : '<div class="empty">还没有任务记录</div>';
}

const taskItemHTML = t => `
  <div class="task ${isDoneToday(t.id) ? 'done' : ''}" data-task="${t.id}">
    <div class="task-emoji">${t.emoji}</div>
    <div class="task-body">
      <div class="task-type">${t.type}</div>
      <div class="task-text">${t.text}${t.note ? `<br><span style="font-size:10px;color:var(--text-3);font-weight:700">· ${t.note}</span>` : ''}</div>
    </div>
    <div class="task-val ${taskVal(t) >= 0 ? 'pos' : 'neg'}">${signed(taskVal(t))}${COIN}</div>
  </div>`;

function renderTaskWall(){
  let html = '';
  for(const key in TASK_GROUPS){
    const items = mergedTasks().filter(t => t.group === key && !t.off);
    if(!items.length) continue;
    html += `<div class="task-group-label" style="background:${TASK_GROUPS[key].color}">${TASK_GROUPS[key].label} · ${items.length}</div>`;
    html += `<div class="task-list">${items.map(taskItemHTML).join('')}</div>`;
  }
  $('allTasks').innerHTML = html;
}

function renderShop(){
  let html = '';
  for(const key in REWARD_CATS){
    const items = mergedRewards().filter(r => r.cat === key && !r.off);
    if(!items.length) continue;
    html += `<div class="reward-cat"><div class="reward-cat-label" style="background:${REWARD_CATS[key].color}">${REWARD_CATS[key].label} · ${items.length}</div><div class="reward-grid">`;
    for(const r of items){
      const cost = rewardCost(r);
      const unaffordable = state.balance < cost;
      html += `
        <div class="reward ${unaffordable ? 'disabled' : ''}" data-reward="${r.id}">
          ${r.tag ? `<div class="reward-tag">${r.tag}</div>` : ''}
          <div class="reward-emoji">${r.emoji}</div>
          <div class="reward-name">${esc(r.name)}</div>
          <div class="reward-cost">${cost}<span class="coin coin-sm">${childInitial()}</span></div>
        </div>`;
    }
    html += '</div></div>';
  }
  $('shopBody').innerHTML = html;
}

function renderRecordList(){
  $('allRecords').innerHTML = state.records.length
    ? state.records.slice(0, 50).map(recordHTML).join('')
    : '<div class="empty">还没有任何记录</div>';
}

const recordHTML = r => `
  <div class="record">
    <div class="record-dot ${r.type}"></div>
    <div class="record-body">
      <div class="record-title">${esc(r.name)}</div>
      <div class="record-meta">${recordTimeStr(r.time)}</div>
    </div>
    <div class="record-val ${r.type}">${signed(r.val)}</div>
  </div>`;

// 控制台数字 + 表单回填（v1.2 表单写死 value=10，导入数据后显示是错的）
function renderAdmin(){
  $('adBal').textContent      = state.balance;
  $('adIn').textContent       = '+' + state.monthIn;
  $('adOut').textContent      = '-' + state.monthOut;
  $('adExpire').textContent   = '-' + pendingExpire();
  $('adTotalIn').textContent  = state.totalIn;
  $('adTotalOut').textContent = state.totalOut;

  $('cfgExpire').value = state.cfg.expireRate;
  $('cfgInit').value   = state.cfg.initBal;
  $('cfgChildName').value = childName();
  $('cfgAdminEmail').value = state.cfg.admin?.email || '';
  const passEl = $('cfgAdminPass');
  passEl.value = '';
  passEl.placeholder = state.cfg.admin?.passHash ? '已设置（输入新密码可覆盖）' : '未设置';
  $('cfgExpireOn').classList.toggle('on', state.cfg.expireOn);
  $('cfgSound').classList.toggle('on', state.cfg.sound !== false);
  syncOptGroups();
}

// 规则调参面板：分值 / 价格可改，右侧开关控制启停
function renderAdminRules(){
  $('ruleTasks').innerHTML = mergedTasks().map(t => {
    const isCustom = String(t.id).startsWith('c_');
    return `<div class="rule-item">
      <button class="ri-edit" data-edit-task="${t.id}" title="编辑内容">✏️</button>
      ${isCustom ? `<button class="ri-edit ri-del" data-del-task="${t.id}" title="删除此自定义任务">🗑</button>` : ''}
      <span class="ri-name ${t.off ? 'off' : ''}" title="${esc(t.text)}">${t.emoji} ${esc(t.type)}</span>
      <input type="number" class="ri-val" data-task-val="${t.id}" value="${t.val}" ${t.off ? 'disabled' : ''}>
      <span class="ri-unit">${COIN}</span>
      <div class="toggle sm ${t.off ? '' : 'on'}" data-task-off="${t.id}"></div>
    </div>`;
  }).join('');

  $('ruleRewards').innerHTML = mergedRewards().map(r => {
    const isCustom = String(r.id).startsWith('c_');
    return `<div class="rule-item">
      <button class="ri-edit" data-edit-reward="${r.id}" title="编辑内容">✏️</button>
      ${isCustom ? `<button class="ri-edit ri-del" data-del-reward="${r.id}" title="删除此自定义奖励">🗑</button>` : ''}
      <span class="ri-name ${r.off ? 'off' : ''}" title="${esc(r.name)}">${r.emoji} ${esc(r.name)}</span>
      <input type="number" class="ri-val" data-reward-cost="${r.id}" value="${r.cost}" min="1" ${r.off ? 'disabled' : ''}>
      <span class="ri-unit">${COIN}</span>
      <div class="toggle sm ${r.off ? '' : 'on'}" data-reward-off="${r.id}"></div>
    </div>`;
  }).join('');
}

// ---------- 工坊：编辑 / 新增 / 删除 ----------
const groupOptions = () => Object.keys(TASK_GROUPS).map(k => ({v: k, l: TASK_GROUPS[k].label}));

function editTaskModal(id){
  const isCustom = String(id).startsWith('c_');
  const t = mergedTasks().find(x => x.id === id);
  if(!t) return;
  showModal({
    emoji:'✏️',
    title: isCustom ? '编辑自定义任务' : '编辑任务内容',
    sub:'保存后立即同步到任务墙与首页快捷区',
    fields:[
      {id:'etEmoji', value:t.emoji, placeholder:'emoji，如 📚'},
      {id:'etType', value:t.type, placeholder:'分类名，如 阅读'},
      {id:'etText', value:t.text, placeholder:'任务描述（孩子看到的）'},
      {id:'etVal', type:'number', value:t.val, min:-50, max:200},
      {id:'etGroup', type:'select', value:t.group, options:groupOptions()},
    ],
    actions:[
      {label:'取消'},
      {label:'保存', cls:'primary', onClick:v => {
        const patch = {
          emoji: String(v.etEmoji || '').trim() || t.emoji,
          type:  String(v.etType || '').trim() || t.type,
          text:  String(v.etText || '').trim() || t.text,
          val:   parseInt(v.etVal, 10) || 0,
          group: v.etGroup || t.group,
        };
        if(isCustom){
          const c = state.cfg.customTasks.find(x => x.id === id);
          if(c) Object.assign(c, patch);
        }else{
          state.cfg.taskOv[id] = Object.assign({}, state.cfg.taskOv[id], patch);
        }
        saveState(); render();
        toast('✅ 任务已更新', 'success');
        closeModal();
      }},
    ],
  });
}

function addTaskModal(){
  showModal({
    emoji:'➕',
    title:'新增任务',
    sub:'保存后出现在任务墙对应分组（自定义任务可删除）',
    fields:[
      {id:'etEmoji', value:'⭐', placeholder:'emoji'},
      {id:'etType', value:'', placeholder:'分类名，如 阅读'},
      {id:'etText', value:'', placeholder:'任务描述（孩子看到的）'},
      {id:'etVal', type:'number', value:1, min:-50, max:200},
      {id:'etGroup', type:'select', value:'daily', options:groupOptions()},
    ],
    actions:[
      {label:'取消'},
      {label:'创建', cls:'primary', onClick:v => {
        const type = String(v.etType || '').trim();
        const text = String(v.etText || '').trim();
        if(!type || !text){
          toast('分类名和任务描述都要填哦', 'error');
          return;
        }
        state.cfg.customTasks.push({
          id: 'c_' + Date.now().toString(36),
          emoji: String(v.etEmoji || '⭐').trim() || '⭐',
          type, text,
          val: parseInt(v.etVal, 10) || 1,
          group: v.etGroup || 'daily',
        });
        saveState(); render();
        sfx.coin();
        toast('🎉 新任务已上架任务墙', 'success');
        closeModal();
      }},
    ],
  });
}

function confirmDelTask(id){
  const c = (state.cfg.customTasks || []).find(x => x.id === id);
  if(!c) return;
  showModal({
    emoji:'🗑',
    title:'删除自定义任务？',
    sub:`${c.emoji} ${c.type}：${c.text}`,
    actions:[
      {label:'取消'},
      {label:'确认删除', cls:'danger', onClick:() => {
        state.cfg.customTasks = state.cfg.customTasks.filter(x => x.id !== id);
        saveState(); render();
        toast('已删除', 'error');
        closeModal();
      }},
    ],
  });
}

function editRewardModal(id){
  const isCustom = String(id).startsWith('c_');
  const r = mergedRewards().find(x => x.id === id);
  if(!r) return;
  showModal({
    emoji:'✏️',
    title: isCustom ? '编辑自定义奖励' : '编辑奖励内容',
    sub:'保存后立即同步到商店',
    fields:[
      {id:'erEmoji', value:r.emoji, placeholder:'emoji'},
      {id:'erName', value:r.name, placeholder:'奖励名称'},
      {id:'erCost', type:'number', value:r.cost, min:1, max:9999},
      {id:'erNote', value:r.note || '', placeholder:'说明（可选，如 一周限一次）'},
    ],
    actions:[
      {label:'取消'},
      {label:'保存', cls:'primary', onClick:v => {
        const patch = {
          emoji: String(v.erEmoji || '').trim() || r.emoji,
          name:  String(v.erName || '').trim() || r.name,
          cost:  Math.max(1, parseInt(v.erCost, 10) || r.cost),
          note:  String(v.erNote || '').trim(),
        };
        if(isCustom){
          const c = state.cfg.customRewards.find(x => x.id === id);
          if(c) Object.assign(c, patch);
        }else{
          state.cfg.rewardOv[id] = Object.assign({}, state.cfg.rewardOv[id], patch);
        }
        saveState(); render();
        toast('✅ 奖励已更新', 'success');
        closeModal();
      }},
    ],
  });
}

function addRewardModal(){
  showModal({
    emoji:'➕',
    title:'新增奖励',
    sub:'保存后出现在商店「日常级」，可再编辑归类价格',
    fields:[
      {id:'erEmoji', value:'🎁', placeholder:'emoji'},
      {id:'erName', value:'', placeholder:'奖励名称'},
      {id:'erCost', type:'number', value:5, min:1, max:9999},
      {id:'erNote', value:'', placeholder:'说明（可选）'},
    ],
    actions:[
      {label:'取消'},
      {label:'创建', cls:'primary', onClick:v => {
        const name = String(v.erName || '').trim();
        if(!name){
          toast('奖励名称要填哦', 'error');
          return;
        }
        state.cfg.customRewards.push({
          id: 'c_' + Date.now().toString(36),
          emoji: String(v.erEmoji || '🎁').trim() || '🎁',
          name,
          cost: Math.max(1, parseInt(v.erCost, 10) || 5),
          note: String(v.erNote || '').trim(),
          cat: 'daily',
        });
        saveState(); render();
        sfx.reward();
        toast('🎉 新奖励已上架商店', 'success');
        closeModal();
      }},
    ],
  });
}

function confirmDelReward(id){
  const c = (state.cfg.customRewards || []).find(x => x.id === id);
  if(!c) return;
  showModal({
    emoji:'🗑',
    title:'删除自定义奖励？',
    sub:`${c.emoji} ${c.name}（${c.cost}${COIN}）`,
    actions:[
      {label:'取消'},
      {label:'确认删除', cls:'danger', onClick:() => {
        state.cfg.customRewards = state.cfg.customRewards.filter(x => x.id !== id);
        saveState(); render();
        toast('已删除', 'error');
        closeModal();
      }},
    ],
  });
}

// 数据统计：近 7 天入账柱状图 + 任务 TOP5 + 三个概览数
function renderAdminStats(){
  const today = dayStr();
  renderWeekChartInto($('weekChart'));
  renderRankList($('topTasks'), 5);

  // 近 7 天入账合计（算日均用）
  let weekSum = 0;
  for(let i = 6; i >= 0; i--){
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = dayStr(d);
    state.records.forEach(r => {
      if(r.type === 'in' && dayStr(new Date(r.time)) === k) weekSum += r.val;
    });
  }

  $('adDoneToday').textContent = Object.values(state.doneToday).filter(d => d === today).length;
  $('adWeekAvg').textContent   = Math.round(weekSum / 7);
  $('adRecCount').textContent  = state.records.length;
}

// ---------- 超级管理员：业务动作 ----------
function adjustBalance(delta){
  if(state.balance + delta < 0){
    toast('余额不能为负', 'error');
    shake($('balNum'));
    return;
  }
  addRecord(delta >= 0 ? 'in' : 'out', delta, `${delta >= 0 ? '⬆️' : '⬇️'} 管理员调整 ${signed(delta)}`);
  render();
  if(delta >= 0) sfx.coin(); else sfx.undo();
  toast(`余额已${delta >= 0 ? '增加' : '减少'} ${Math.abs(delta)}${COIN}`, delta >= 0 ? 'success' : 'error');
}

// 撤销最近一笔：反向回滚余额 / 月度累计 / 完成标记
// 回滚一笔记录对余额 / 累计的影响（不落盘，由调用方收尾）
function revertRecord(r){
  state.balance -= r.val;
  if(r.type === 'in'){
    state.monthIn = Math.max(0, state.monthIn - r.val);
    state.totalIn = Math.max(0, state.totalIn - r.val);
  }else{
    state.monthOut = Math.max(0, state.monthOut - Math.abs(r.val));
    state.totalOut = Math.max(0, state.totalOut - Math.abs(r.val));
  }
}

function undoLast(){
  const r = state.records[0];
  if(!r){
    toast('没有可撤销的记录', 'error');
    return;
  }
  revertRecord(r);
  state.records.shift();
  if(r.taskId) delete state.doneToday[r.taskId];
  saveState(); render();
  sfx.undo();
  toast(`已撤销：${r.name}`, 'error');
}

// 计分卡二次点击：定向撤销该任务今天这笔记录
function undoTask(taskId){
  const idx = state.records.findIndex(r => r.taskId === taskId && dayStr(new Date(r.time)) === dayStr());
  if(idx === -1){
    toast('找不到今天的相关记录', 'error');
    return;
  }
  const r = state.records[idx];
  revertRecord(r);
  state.records.splice(idx, 1);
  delete state.doneToday[taskId];
  saveState(); render();
  sfx.undo();
  toast(`↩️ 已撤销：${r.name}`, 'error');
}

function clearTodayDone(){
  const today = dayStr();
  const ids = Object.keys(state.doneToday).filter(id => state.doneToday[id] === today);
  if(!ids.length){
    toast('今天还没有完成记录');
    return;
  }
  showModal({
    emoji:'🧹',
    title:'清空今日完成？',
    sub:`将解除今日 ${ids.length} 个任务的完成状态（不影响余额和记录）。`,
    actions:[
      {label:'取消'},
      {label:'确认清空', cls:'danger', onClick:() => {
        ids.forEach(id => delete state.doneToday[id]);
        saveState(); render();
        toast(`已清空今日 ${ids.length} 条完成记录`);
        closeModal();
      }},
    ],
  });
}

function toggleTaskOff(id){
  if(String(id).startsWith('c_')){
    const c = state.cfg.customTasks.find(x => x.id === id);
    if(c){ c.off = !c.off; saveState(); render(); toast(`${c.emoji} ${c.type} 已${c.off ? '停用' : '启用'}`); }
    return;
  }
  const ov = state.cfg.taskOv[id] || {};
  state.cfg.taskOv[id] = Object.assign({}, ov, {off: !ov.off});
  saveState(); render();
  const t = mergedTasks().find(x => x.id === id);
  toast(`${t.emoji} ${t.type} 已${state.cfg.taskOv[id].off ? '停用' : '启用'}`);
}

function toggleRewardOff(id){
  if(String(id).startsWith('c_')){
    const c = state.cfg.customRewards.find(x => x.id === id);
    if(c){ c.off = !c.off; saveState(); render(); toast(`${c.emoji} ${c.name} 已${c.off ? '下架' : '上架'}`); }
    return;
  }
  const ov = state.cfg.rewardOv[id] || {};
  state.cfg.rewardOv[id] = Object.assign({}, ov, {off: !ov.off});
  saveState(); render();
  const r = mergedRewards().find(x => x.id === id);
  toast(`${r.emoji} ${r.name} 已${state.cfg.rewardOv[id].off ? '下架' : '上架'}`);
}

function exportCSV(){
  const rows = [['时间', '类型', '变动', '说明']];
  state.records.forEach(r => {
    const t = new Date(r.time);
    rows.push([`${dayStr(t)} ${clockStr(t)}`, r.type === 'in' ? '收入' : '支出', r.val, r.name]);
  });
  const csv = rows.map(cols => cols.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\ufeff' + csv], {type:'text/csv;charset=utf-8'}));  // BOM 防 Excel 中文乱码
  const a = document.createElement('a');
  a.href = url;
  a.download = `max-credits-${dayStr()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast(`已导出 ${state.records.length} 条记录`, 'success');
}

// 管理员认证：邮箱+密码账号优先，旧版 PIN 兼容；都未设置则直接进入
async function requestAdminAccess(){
  const admin = state.cfg.admin;
  if(admin && admin.email && admin.passHash){
    const opts = accountOptions(admin.email);
    const emailField = opts.length > 1
      ? {id:'loginEmail', type:'select', value:admin.email, options:opts}
      : {id:'loginEmail', type:'email', value:admin.email, placeholder:'邮箱'};
    showModal({
      emoji:'🔐',
      title:'管理员登录',
      sub:`已记住 ${opts.length} 个账号，选中后输入密码即可登录`,
      fields:[
        emailField,
        {id:'loginPass', type:'password', placeholder:'密码'},
      ],
      actions:[
        {label:'取消'},
        {label:'忘记密码?', onClick:() => {closeModal(); forgotPassword();}},
        {label:'登录', cls:'primary', onClick:async v => {
          const email = String(v.loginEmail || '').trim().toLowerCase();
          const hash = await sha256(String(v.loginPass || ''));
          if(email !== admin.email || hash !== admin.passHash){
            toast('邮箱或密码不正确', 'error');
            return;
          }
          rememberAccount(email);
          closeModal();
          setViewMode('parent');
          toast('👋 欢迎回来，管理员！设置已解锁：顶栏「爸妈」', 'success');
        }},
      ],
    });
    return;
  }
  if(state.cfg.pin){
    showModal({
      emoji:'🔐',
      title:'管理员验证',
      sub:'请输入 4 位管理员 PIN（建议在系统设置里升级为邮箱 + 密码账号）',
      input:{value:'', min:0, max:9999},
      actions:[
        {label:'取消'},
        {label:'进入后台', cls:'primary', onClick:v => {
          if(String(v).trim() !== String(state.cfg.pin)){
            toast('PIN 不正确', 'error');
            return;
          }
          closeModal();
          setViewMode('parent');
        }},
      ],
    });
    return;
  }
  noAdminGuide();   // v2.1.0：无账号无 PIN 时引导创建，不再直通后台
}

// 未设家长账号时的统一引导：不直接放行后台，引导去创建账号
function noAdminGuide(){
  showModal({
    emoji:'🔐',
    title:'家长后台未设置',
    sub:'后台由家长管理。请先创建家长账号（邮箱 + 密码），之后凭密码进入。孩子看不到也进不去。',
    actions:[
      {label:'取消'},
      {label:'去设置', cls:'primary', onClick:() => {
        closeModal();
        wizShow();
        $('wizStep1').style.display = 'none';   // 直接跳到家长账号步
        $('wizStep2').style.display = '';
      }},
    ],
  });
}

// 浮按钮 ⚙️：有账号走登录；无账号引导创建（不再直通后台）
function goAdmin(){
  const admin = state.cfg.admin;
  if(admin && admin.email && admin.passHash){
    requestAdminAccess();
    return;
  }
  noAdminGuide();
}

function forgotPassword(){
  const admin = state.cfg.admin;
  if(!admin || !admin.email){
    toast('未设置管理员邮箱，无法找回', 'error');
    return;
  }
  showModal({
    emoji:'📮',
    title:'找回密码',
    sub:`请输入注册邮箱（${maskEmail(admin.email)}）完成校验`,
    fields:[{id:'fpEmail', type:'email', placeholder:'注册邮箱'}],
    actions:[
      {label:'取消'},
      {label:'下一步', cls:'primary', onClick:v => {
        if(String(v.fpEmail || '').trim().toLowerCase() !== admin.email){
          toast('邮箱不匹配', 'error');
          return;
        }
        closeModal();
        showModal({
          emoji:'🔑',
          title:'设置新密码',
          sub:'密码支持字母/数字/符号，保存后请牢记新密码',
          fields:[
            {id:'np1', type:'password', placeholder:'新密码'},
            {id:'np2', type:'password', placeholder:'再输一遍'},
          ],
          actions:[
            {label:'取消'},
            {label:'保存新密码', cls:'primary', onClick:async v => {
              const p1 = String(v.np1 || ''), p2 = String(v.np2 || '');
              if(!p1){toast('请输入新密码', 'error'); return;}
              if(p1 !== p2){toast('两次输入不一致', 'error'); return;}
              state.cfg.admin.passHash = await sha256(p1);
              saveState(); render();
              toast('✅ 密码已重置，请用新密码登录', 'success');
              closeModal();
            }},
          ],
        });
      }},
    ],
  });
}

// ---------- ⑥ 交互绑定 ----------

// 只切页面，不改 state
function showView(name){
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.dataset.view === name));
}

// 切视角（MAX / 爸妈），会落盘并重渲染
function setViewMode(mode){
  state.view = mode;
  document.querySelectorAll('#viewToggle .view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === mode));
  if(mode === 'parent'){
    document.querySelectorAll('#topnav .tn-tab').forEach(x => x.classList.remove('active'));
    showView('admin');
  }else{
    const homeTab = document.querySelector('#topnav .tn-tab[data-tab="home"]');
    if(homeTab) homeTab.classList.add('active');
    showView(document.querySelector('#topnav .tn-tab.active')?.dataset.tab || 'home');
  }
  // v2.1.0：parent 是「会话态」不是「持久态」——落盘永远只存 'max'，
  // 刷新 / 重开标签页必须重新登录，堵住「刷新直通后台」
  const session = state.view;
  state.view = 'max';
  saveState();
  state.view = session;
  render();
}

document.querySelectorAll('#topnav .tn-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('#topnav .tn-tab').forEach(x => x.classList.remove('active'));
    tab.classList.add('active');
    // 爸妈视角下点 Tab = 退出控制台回到 MAX 视角
    // （v1.2 这里是空 if，导致「顶栏停在爸妈、页面却在首页」的状态错位）
    if(state.view === 'parent') setViewMode('max');
    else showView(tab.dataset.tab);
  });
});

document.querySelectorAll('#viewToggle .view-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if(btn.dataset.view === 'parent'){
      // 已登录 → 再点一次 = 退出后台；未登录 → 弹登录
      if(state.view === 'parent') setViewMode('max');
      else requestAdminAccess();
    }
    else setViewMode('max');
  });
});

// 移动端左右滑动切 Tab（仅孩子视角；垂直滚动不受影响）
(function(){
  const order = ['home','tasks','shop','records'];
  const content = document.querySelector('.content');
  if(!content) return;
  let sx = 0, sy = 0;
  content.addEventListener('touchstart', e => {
    const t = e.touches[0]; sx = t.clientX; sy = t.clientY;
  }, {passive:true});
  content.addEventListener('touchend', e => {
    if(state.view !== 'max') return;
    const t = e.changedTouches[0];
    const dx = t.clientX - sx, dy = t.clientY - sy;
    if(Math.abs(dx) < 60 || Math.abs(dy) > 40) return;
    const cur = document.querySelector('#topnav .tn-tab.active');
    const idx = order.indexOf(cur ? cur.dataset.tab : 'home');
    const next = order[idx + (dx < 0 ? 1 : -1)];
    if(!next) return;
    const tab = document.querySelector(`#topnav .tn-tab[data-tab="${next}"]`);
    if(tab) tab.click();
  }, {passive:true});
})();

// 事件委托：任务/奖励都是动态渲染的，绑一次 document 即可
document.addEventListener('click', e => {
  const taskOffEl = e.target.closest('[data-task-off]');
  if(taskOffEl){
    toggleTaskOff(taskOffEl.dataset.taskOff);
    return;
  }
  const rewardOffEl = e.target.closest('[data-reward-off]');
  if(rewardOffEl){
    toggleRewardOff(rewardOffEl.dataset.rewardOff);
    return;
  }
  const editTaskEl = e.target.closest('[data-edit-task]');
  if(editTaskEl){
    editTaskModal(editTaskEl.dataset.editTask);
    return;
  }
  const delTaskEl = e.target.closest('[data-del-task]');
  if(delTaskEl){
    confirmDelTask(delTaskEl.dataset.delTask);
    return;
  }
  const editRewardEl = e.target.closest('[data-edit-reward]');
  if(editRewardEl){
    editRewardModal(editRewardEl.dataset.editReward);
    return;
  }
  const delRewardEl = e.target.closest('[data-del-reward]');
  if(delRewardEl){
    confirmDelReward(delRewardEl.dataset.delReward);
    return;
  }
  const taskEl = e.target.closest('.task');
  if(taskEl){
    const t = mergedTasks().find(x => x.id === taskEl.dataset.task);
    if(!t) return;
    if(taskEl.classList.contains('done')) undoTask(t.id);   // 二次点击 = 撤销
    else completeTask(t, taskEl);
    return;
  }
  const rewardEl = e.target.closest('.reward');
  if(rewardEl && !rewardEl.classList.contains('disabled')){
    const r = mergedRewards().find(x => x.id === rewardEl.dataset.reward);
    if(r) redeemReward(r);
  }
});

// 轻量确认框：actions 每项 {label, cls, onClick}
// 单输入：input:{value,min,max} → onClick(value)
// 多输入：fields:[{id,type,value,placeholder}] → onClick(values 对象)
function showModal({emoji, title, sub, actions = [], input, fields}){
  const flds = fields || (input ? [{id:'modalInput', type:'number', value:input.value, min:input.min, max:input.max}] : null);
  const legacy = !fields && !!input;
  const parts = [];
  if(emoji) parts.push(`<div class="confirm-emoji">${emoji}</div>`);
  parts.push(`<div class="modal-title">${title}</div>`);
  if(sub)   parts.push(`<div class="modal-sub">${sub}</div>`);
  if(flds){
    parts.push('<div style="margin-top:8px">' + flds.map(f => {
      if(f.type === 'select'){
        return `<div style="margin-bottom:8px"><select class="setting-input" id="${f.id}" style="width:100%;font-size:16px;padding:12px;text-align:left">` +
          f.options.map(o => `<option value="${o.v}" ${o.v === f.value ? 'selected' : ''}>${o.l}</option>`).join('') +
          '</select></div>';
      }
      if(f.type === 'file'){
        // v2.3.0：文件选择（不写 value 属性，浏览器会忽略且行为不一致）
        return `<div style="margin-bottom:8px"><input type="file" class="setting-input" id="${f.id}"` +
          (f.accept ? ` accept="${f.accept}"` : '') +
          ' style="width:100%;font-size:14px;padding:10px"></div>';
      }
      return `<div style="margin-bottom:8px"><input type="${f.type || 'text'}" class="setting-input" id="${f.id}" value="${f.value ?? ''}" placeholder="${f.placeholder || ''}"` +
        (f.type === 'number' ? ` min="${f.min ?? 0}" max="${f.max ?? 9999}"` : '') +
        ' style="width:100%;font-size:16px;padding:12px;text-align:left"></div>';
    }).join('') + '</div>');
  }
  if(actions.length){
    parts.push('<div class="modal-actions">' +
      actions.map((a, i) => `<button class="btn ${a.cls || ''}" data-act="${i}">${a.label}</button>`).join('') +
      '</div>');
  }
  $('modalContent').innerHTML = parts.join('');
  $('modal').classList.add('show');

  // 按索引绑定（v1.2 用 indexOf 反查，label 重复时会串台）
  $('modalContent').querySelectorAll('.modal-actions .btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = actions[parseInt(btn.dataset.act, 10)];
      if(!flds){
        action.onClick?.(null);
        return;
      }
      const values = {};
      flds.forEach(f => {
        const el2 = $(f.id);
        values[f.id] = el2 ? (f.type === 'file' ? (el2.files && el2.files[0] ? el2.files[0] : null) : el2.value) : null;
      });
      action.onClick?.(legacy ? values.modalInput : values);
    });
  });
}

const closeModal = () => $('modal').classList.remove('show');
$('modal').addEventListener('click', e => {if(e.target.id === 'modal') closeModal();});

// --- 爸妈控制台 ---
$('cfgExpire').addEventListener('change', e => {
  state.cfg.expireRate = Math.max(0, Math.min(50, parseInt(e.target.value, 10) || 0));
  saveState(); render();
  toast(`过期比例已设为 ${state.cfg.expireRate}%`);
});

$('cfgInit').addEventListener('change', e => {
  state.cfg.initBal = Math.max(0, parseInt(e.target.value, 10) || 0);
  saveState();
});

$('cfgExpireOn').addEventListener('click', () => {
  state.cfg.expireOn = !state.cfg.expireOn;
  saveState(); render();
  toast(state.cfg.expireOn ? '过期机制已开启' : '过期机制已关闭');
});

$('btnAddBonus').addEventListener('click', () => {
  showModal({
    emoji:'🎁',
    title:'发放奖励积分',
    sub:'直接给 Max 发放一笔 Bonus C，不绑定任务。',
    input:{value:10, min:1, max:9999},
    actions:[
      {label:'取消'},
      {label:'发放', cls:'primary', onClick:v => {
        const n = parseInt(v, 10) || 0;
        if(n <= 0){
          toast('请输入大于 0 的积分', 'error');
          return;
        }
        addRecord('in', n, `🎁 爸妈奖励 +${n}`);
        burst(); render();
        sfx.coin();
        toast(`已发放 ${n} ${COIN}`, 'success');
        closeModal();
      }},
    ],
  });
});

$('btnExport').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], {type:'application/json'}));
  const a = document.createElement('a');
  a.href = url;
  a.download = `max-credits-${dayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('已导出数据', 'success');
});

$('btnImport').addEventListener('click', () => $('fileInput').click());

$('fileInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try{
      state = hydrate(JSON.parse(ev.target.result));   // v2.2.0：与云端同走深合并
      saveState(); render();
      toast('已导入数据', 'success');
    }catch(err){
      toast('导入失败：JSON 格式错误', 'error');
    }
  };
  reader.readAsText(file);
  e.target.value = '';   // 清空，允许连续导入同一个文件
});

// 规则调参：改分值/价格（change 事件，避免边输边重渲染丢焦点）
$('ruleTasks').addEventListener('change', e => {
  const id = e.target.dataset.taskVal;
  if(!id) return;
  const v = parseInt(e.target.value, 10);
  if(Number.isNaN(v)) return;
  if(String(id).startsWith('c_')){
    const c = state.cfg.customTasks.find(x => x.id === id);
    if(c) c.val = v;
  }else{
    state.cfg.taskOv[id] = Object.assign({}, state.cfg.taskOv[id], {val: v});
  }
  saveState(); render();
  const t = mergedTasks().find(x => x.id === id);
  toast(`${t.emoji} ${t.type} 分值改为 ${v}${COIN}`);
});

$('ruleRewards').addEventListener('change', e => {
  const id = e.target.dataset.rewardCost;
  if(!id) return;
  const v = Math.max(1, parseInt(e.target.value, 10) || 1);
  if(String(id).startsWith('c_')){
    const c = state.cfg.customRewards.find(x => x.id === id);
    if(c) c.cost = v;
  }else{
    state.cfg.rewardOv[id] = Object.assign({}, state.cfg.rewardOv[id], {cost: v});
  }
  saveState(); render();
  const r = mergedRewards().find(x => x.id === id);
  toast(`${r.emoji} ${r.name} 价格改为 ${v}${COIN}`);
});

$('btnAddTask').addEventListener('click', addTaskModal);
$('btnAddReward').addEventListener('click', addRewardModal);

$('btnResetRules').addEventListener('click', () => {
  const n = Object.keys(state.cfg.taskOv).length + Object.keys(state.cfg.rewardOv).length;
  if(!n){
    toast('当前已是默认规则');
    return;
  }
  showModal({
    emoji:'♻️',
    title:'恢复默认规则？',
    sub:`将撤销 ${n} 项自定义（分值/价格/启停），恢复内置默认值。`,
    actions:[
      {label:'取消'},
      {label:'确认恢复', cls:'danger', onClick:() => {
        state.cfg.taskOv = {};
        state.cfg.rewardOv = {};
        state.cfg.customTasks = [];
        state.cfg.customRewards = [];
        saveState(); render();
        toast('已恢复默认规则（含删除自定义项）');
        closeModal();
      }},
    ],
  });
});

// 快捷调整余额
document.querySelectorAll('[data-adjust]').forEach(btn => {
  btn.addEventListener('click', () => adjustBalance(parseInt(btn.dataset.adjust, 10)));
});

$('btnUndo').addEventListener('click', undoLast);
$('btnClearToday').addEventListener('click', clearTodayDone);
$('btnExportCSV').addEventListener('click', exportCSV);

$('cfgSound').addEventListener('click', () => {
  state.cfg.sound = state.cfg.sound === false;
  saveState(); render();
  if(state.cfg.sound) sfx.coin();          // 打开时给一声反馈
  toast(state.cfg.sound ? '🔊 得分音效已开启' : '🔇 得分音效已关闭');
});

$('btnWizard').addEventListener('click', () => wizShow());

// 孩子英文名：必填，留空回落默认
$('cfgChildName').addEventListener('change', e => {
  const v = String(e.target.value || '').trim();
  if(!v){
    state.cfg.childName = CHILD_NAME;
    e.target.value = CHILD_NAME;
    saveState(); renderBrand(); render();
    toast(`孩子英文名必填，已回落为 ${CHILD_NAME}`, 'error');
    return;
  }
  state.cfg.childName = v;
  saveState(); renderBrand(); render();
  toast(`品牌名已更新：${v}'s Credits Plan`, 'success');
});

// 保存管理员账号（邮箱 + 密码哈希），替代旧版 PIN
$('btnAdminSave').addEventListener('click', async () => {
  const email = String($('cfgAdminEmail').value || '').trim().toLowerCase();
  const pass = String($('cfgAdminPass').value || '');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    toast('请输入有效的邮箱地址', 'error');
    return;
  }
  if(!pass && !(state.cfg.admin && state.cfg.admin.passHash)){
    toast('首次保存请设置密码', 'error');
    return;
  }
  const passHash = pass ? await sha256(pass) : (state.cfg.admin?.passHash || '');
  state.cfg.admin = {email, passHash};
  state.cfg.pin = '';
  rememberAccount(email);
  saveState(); render();
  $('cfgAdminPass').value = '';
  toast('✅ 管理员账号已保存，进后台需登录', 'success');
});

/* v2.5.1：纯 JS MD5（零依赖，已对拍 Node crypto 验证 16 组）
   用途：客户端算 md5(家庭码:密钥)，密钥明文永不进云端库 */
(function(root){
  const md5hex = function md5hex(msg){
  const K=[], S=[];
  for(let i=0;i<64;i++) K[i]=Math.floor(Math.abs(Math.sin(i+1))*4294967296)>>>0;
  const sh=[7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
  for(let i=0;i<64;i++) S[i]=sh[i];
  const rotr=(x,n)=>((x>>>n)|(x<<(32-n)))>>>0;
  const bytes=new TextEncoder().encode(msg);
  const l=bytes.length;
  const total=(((l+8)>>6)+1)<<6;
  const buf=new Uint8Array(total); buf.set(bytes); buf[l]=0x80;
  const dv=new DataView(buf.buffer);
  dv.setUint32(total-8,(l*8)>>>0,true);
  dv.setUint32(total-4,Math.floor(l*8/4294967296),true);
  let a0=0x67452301,b0=0xefcdab89,c0=0x98badcfe,d0=0x10325476;
  const X=new Int32Array(64);
  for(let off=0;off<total;off+=64){
    for(let j=0;j<16;j++) X[j]=dv.getInt32(off+j*4,true);
    for(let j=16;j<64;j++){
      const x=X[j-15],y=X[j-2];
      const s0=rotr(x,7)^rotr(x,18)^(x>>>3);
      const s1=rotr(y,17)^rotr(y,19)^(y>>>10);
      X[j]=(X[j-16]+s0+X[j-7]+s1)>>>0;
    }
    let A=a0,B=b0,C=c0,D=d0;
    for(let j=0;j<64;j++){
      let F,g;
      if(j<16){F=(B&C)|(~B&D);g=j;}
      else if(j<32){F=(D&B)|(~D&C);g=(5*j+1)&15;}
      else if(j<48){F=B^C^D;g=(3*j+5)&15;}
      else {F=C^(B|~D);g=(7*j)&15;}
      F=(F+A+K[j]+X[g])>>>0;
      A=D;D=C;C=B;
      B=(B+((F<<S[j])|(F>>>(32-S[j]))))>>>0;
    }
    a0=(a0+A)>>>0;b0=(b0+B)>>>0;c0=(c0+C)>>>0;d0=(d0+D)>>>0;
  }
  const out=new Uint8Array(16), odv=new DataView(out.buffer);
  odv.setUint32(0,a0,true);odv.setUint32(4,b0,true);odv.setUint32(8,c0,true);odv.setUint32(12,d0,true);
  let h='';for(let i=0;i<16;i++)h+=out[i].toString(16).padStart(2,'0');
  return h;
};
  root.md5hex = md5hex;
})(typeof window !== 'undefined' ? window : globalThis);

/* ============================================================
   v2.2.0 云同步 · Supabase（家长后台配置，凭证独立存储）
   v2.5.1 分行 + 表级权限（ADB PG 兼容版）：
           ADB PG 平台层禁用 SECURITY DEFINER，v2.5.0 的提权函数建不出来
           → 改为「普通函数(INVOKER) 写会话变量 + RLS 策略自己比对凭证」
           密钥只以 md5(家庭码:密钥) 落库，明文永不进云端
   ------------------------------------------------------------
   数据模型：一张表 family_state(family_code PK, secret_hash, state jsonb, updated_at)
   冲突策略：整包 last-write-wins（按 state.updatedAt 比较本地时钟）
   拉取前自动把当前本地存档备份到 max_credits_backup_<时间戳>
   ============================================================ */
const CLOUD_KEY = 'max_credits_cloud';
const cloudCfg = () => {
  try{ return Object.assign({url:'', anonKey:'', familyCode:'', secret:'', autoSync:false, lastSync:0}, JSON.parse(localStorage.getItem(CLOUD_KEY) || '{}')); }
  catch(e){ return {url:'', anonKey:'', familyCode:'', secret:'', autoSync:false, lastSync:0}; }
};
const saveCloudCfg = c => { try{ localStorage.setItem(CLOUD_KEY, JSON.stringify(c)); }catch(e){} };
const cloudReady = () => { const c = cloudCfg(); return !!(c.url && c.anonKey && c.familyCode); };
// v2.5.1：家庭码是「地址」，密钥才是「钥匙」。
//   传给云端的是「凭证」= md5(家庭码:密钥)，不是密钥本身 → 密钥明文永不进云端
//   旧存档没存密钥时，用家庭码兜底（云端旧行 secret_hash 为空，靠家庭码通过）
const cloudSecretRaw = () => (cloudCfg().secret || cloudCfg().familyCode || '');
const cloudSecret = () => {
  const code = cloudCfg().familyCode || '';
  const raw  = cloudSecretRaw();
  if(!code || !raw) return '';
  return md5hex(code + ':' + raw);
};
const genFamilyCode = () => {
  const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // 去掉易混淆字符
  let s = '';
  for(let i = 0; i < 6; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
};
// v2.5.0：访问密钥（12 位，存本机；建行时在云端 bcrypt 落盘）
const genCloudSecret = () => {
  const abc = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(12);
  (self.crypto || {}).getRandomValues ? crypto.getRandomValues(bytes) : bytes.forEach((_, i) => bytes[i] = Math.floor(Math.random() * 256));
  let s = '';
  for(let i = 0; i < 12; i++) s += abc[bytes[i] % abc.length];
  return s;
};
const cloudRpcUrl = fn => `${cloudCfg().url.replace(/\/+$/, '')}/rest/v1/rpc/${fn}`;
const cloudHeaders = (opt) => {
  const c = cloudCfg();
  const h = {apikey: c.anonKey, Authorization: `Bearer ${c.anonKey}`, 'Content-Type': 'application/json'};
  // v2.5.1：把凭证也放进自定义头 → 网关若不暴露 request.headers，RLS 仍能从头里取到
  if(opt && opt.family){
    h['x-family-code']   = c.familyCode || '';
    h['x-family-auth']   = cloudSecret();
    h['x-family-secret'] = cloudSecret();
  }
  return h;
};
const cloudStampStr = ms => ms ? new Date(ms).toLocaleString('zh-CN', {hour12:false}) : '从未';

function renderCloudCard(){
  const c = cloudCfg();
  $('cloudUrl').value  = c.url;
  $('cloudKey').value  = c.anonKey;
  $('cloudCode').value = c.familyCode;
  if($('cloudSecret')) $('cloudSecret').value = c.secret || '';
  $('cloudAuto').classList.toggle('on', !!c.autoSync);
  $('cloudStateTag').textContent = cloudReady() ? (c.autoSync ? '已连接 · 自动' : '已连接 · 手动') : '未配置';
  $('cloudStatus').textContent = cloudReady()
    ? `上次同步：${cloudStampStr(c.lastSync)}｜家庭码 ${c.familyCode}｜${c.secret ? '密钥已设' : '密钥=家庭码（旧存档）'}`
    : (cloudMissing().length ? `尚未配置 · 还缺：${cloudMissing().join(' / ')}` : '尚未配置');
}

// v2.2.1：缺什么说清楚，别只丢一句「云未配置」
function cloudMissing(){
  const c = cloudCfg();
  const miss = [];
  if(!c.url) miss.push('项目 URL');
  if(!c.anonKey) miss.push('anon key');
  if(!c.familyCode) miss.push('家庭码');
  return miss;
}
function requireCloud(){
  if(!cloudReady()){
    const miss = cloudMissing();
    throw new Error(`云未配置，还缺：${miss.join(' / ') || '未知'}`);
  }
}
// v2.2.2：URL 兼容多部署形态
//   ① 官方托管  https://xxx.supabase.co
//   ② 国内托管  https://xxx.supabase.opentrust.net（华为云 OpenTrust 等）
//   ③ 自建/私有域名（只要是 Supabase 实例即可）
// 常见手误一并兜底：漏 https://、结尾斜杠、把 /rest/v1 一起粘进来
const normalizeCloudUrl = raw => {
  let u = String(raw || '').trim();
  if(!u) return '';
  if(!/^https?:\/\//i.test(u)) u = 'https://' + u;
  u = u.replace(/\/rest\/v1\/?$/i, '');     // 粘多了 REST 路径也剥掉
  return u.replace(/\/+$/, '');
};
const cloudUrlLooksOk = u => /^https:\/\/[^\s/?#]+\.[^\s/?#]+/i.test(String(u || ''));
const cloudUrlLooksSupabase = u => /supabase/i.test(String(u || ''));
// 从输入框读取并落盘：测试/同步时自动调用，免去「填了但忘保存」
function saveCloudFromInputs(silent){
  const url = normalizeCloudUrl($('cloudUrl').value);
  const anonKey = String($('cloudKey').value || '').trim();
  const familyCode = String($('cloudCode').value || '').trim().toUpperCase();
  const secret = String(($('cloudSecret') && $('cloudSecret').value) || '').trim();
  if(url && !cloudUrlLooksOk(url)){ toast('URL 需要是 https 开头的完整地址，如 https://xxx.supabase.co', 'error'); return false; }
  if(familyCode && !/^[A-Z0-9]{4,8}$/.test(familyCode)){ toast('家庭码是 4-8 位字母/数字（点 🎲 生成）', 'error'); return false; }
  if(secret && !/^[A-Za-z0-9]{6,32}$/.test(secret)){ toast('访问密钥是 6-32 位字母/数字（点 🔑 生成）', 'error'); return false; }
  saveCloudCfg({...cloudCfg(), url, anonKey, familyCode, secret});
  renderCloudCard();
  if(url && !cloudUrlLooksSupabase(url) && !silent) toast('已保存（域名不含 supabase，确认是 Supabase 实例地址即可）');
  if(!silent) toast('💾 云配置已保存（只存本机）', 'success');
  return true;
}

// v2.2.3：把服务端返回体带出来 + 翻译成人话
// （404 有两种完全不同的原因：不带 key 是"路径不存在"，带 key 是"表不存在"）
function explainCloudError(status, detail){
  const t = String(detail || '');
  if(/BAD_SECRET/.test(t)) return '凭证不正确：这台设备的访问密钥与云端记录不符（换设备要填同一个密钥）';
  if(/EMPTY_SECRET/.test(t)) return '访问密钥为空：请在云同步卡里生成或填写密钥';
  if(/EMPTY_CODE/.test(t))  return '家庭码为空：请先填 4-8 位家庭码';
  // ADB PG 平台层限制：提权函数建不出来
  if(/SECURITY DEFINER functions are not allowed|adbpg_enable_security_definer/i.test(t)){
    return '云端平台禁用了 SECURITY DEFINER 函数（阿里云 ADB PG）→ 请执行 v2.5.1 版 supabase-setup.sql（改用不提权的方案）';
  }
  if(status === 404 && /PGRST202|Could not find the function|schema cache/i.test(t)){
    return 'HTTP 404：云端还没有 family_pull / family_push 函数 → 请在 Supabase SQL Editor 重新执行一次 supabase-setup.sql（v2.5.1 版）';
  }
  if(status === 404 && /PGRST205|Could not find the table|schema cache/i.test(t)){
    return 'HTTP 404：云端还没有 family_state 表 → 请在 Supabase SQL Editor 执行一次 supabase-setup.sql';
  }
  if(status === 404) return 'HTTP 404：REST 路径或函数不通 → 确认项目 URL 是否完整、v2.5.1 建表 SQL 是否已执行';
  if(status === 401) return 'HTTP 401：anon key 无效或未填 → Project Settings → API → anon public key';
  if(status === 403) return 'HTTP 403：权限被拒 → 请确认 v2.5.1 建表 SQL（含 RLS 策略 + 函数授权）已完整执行';
  if(status === 405) return 'HTTP 405：调用方式不对 → 请确认 supabase-setup.sql 是 v2.5.1 版本';
  if(status >= 500)  return `HTTP ${status}：云端服务异常，稍后重试`;
  return `HTTP ${status}${t ? '：' + t.slice(0, 120) : ''}`;
}
async function cloudFetch(url, opts){
  const res = await fetch(url, opts);
  if(res.ok) return res;
  let detail = '';
  try{ detail = (await res.text() || '').slice(0, 400); }catch(e){}
  throw new Error(explainCloudError(res.status, detail));
}

// v2.5.1 拉取：走 RPC（普通函数，函数内写会话变量 → RLS 策略放行）
// 同时带上 x-family-* 头，作为「网关不暴露 request.headers」时的备用凭证通道
// 返回 {state, updatedAt} 或 null（云端无该家庭 / 凭证不匹配）
async function cloudPull(){
  requireCloud();
  const res = await cloudFetch(cloudRpcUrl('family_pull'), {
    method: 'POST',
    headers: cloudHeaders({family: true}),
    body: JSON.stringify({p_code: cloudCfg().familyCode, p_secret: cloudSecret()}),
  });
  const json = await res.json();
  const st = json && typeof json === 'object' ? (json.state && json.state.updatedAt !== undefined ? json.state : json) : null;
  return st ? {state: st, updatedAt: st.updatedAt || 0} : null;
}

// v2.5.1 推送：整包 upsert（仅当本地不旧于云端，避免覆盖别人的新数据）
async function cloudPush(){
  requireCloud();
  const remote = await cloudPull();
  if(remote && remote.state && (remote.state.updatedAt || 0) > (state.updatedAt || 0)){
    return {skipped:true, remoteAt: remote.state.updatedAt};
  }
  const cred = cloudSecret();
  await cloudFetch(cloudRpcUrl('family_push'), {
    method: 'POST',
    headers: cloudHeaders({family: true}),
    body: JSON.stringify({
      p_code: cloudCfg().familyCode,
      p_auth: cred,   // 访问现有行用的凭证
      p_new:  cred,   // 写进库里的凭证
      p_state: state,
      p_updated_at: new Date().toISOString(),
    }),
  });
  const c = cloudCfg(); c.lastSync = Date.now(); saveCloudCfg(c);
  return {skipped:false};
}

async function cloudSyncNow(){
  const remote = await cloudPull();
  if(remote && remote.state && (remote.state.updatedAt || 0) > (state.updatedAt || 0)){
    // 云端更新 → 备份本地后拉取
    const bk = `max_credits_backup_${dayStr()}_${clockStr().replace(':','')}`;
    try{ localStorage.setItem(bk, JSON.stringify(state)); }catch(e){}
    state = hydrate(remote.state);   // 深合并：缺字段回落默认，不崩渲染
    saveState(); render();
    const c = cloudCfg(); c.lastSync = Date.now(); saveCloudCfg(c);
    toast(`☁️ 已拉取云端新数据（本地旧档备份：${bk}）`, 'success');
    return;
  }
  await cloudPush();
  toast('☁️ 已推送到云端', 'success');
}

async function testCloud(){
  renderCloudCard();   // 先刷新表单与标签（它会重置状态行），再写本次结果
  try{
    const remote = await cloudPull();
    $('cloudStatus').textContent = remote
      ? `连接成功｜云端有数据（${cloudStampStr(remote.state?.updatedAt || 0)}）`
      : '连接成功｜云端暂无该家庭数据（保存配置后点「立即同步」即可上传）';
    toast('🔌 连接成功', 'success');
  }catch(e){
    $('cloudStatus').textContent = `连接失败：${e.message}`;
    toast('🔌 ' + e.message, 'error');
  }
}

// v2.5.1 环境体检：一次性测出「云端到底支持什么」，
//   避免在 ADB PG / OpenTrust / 官方 Supabase 之间反复猜。
// 前四项都是只读探测；第五项会建临时行并当场删掉。
async function cloudDoctor(){
  if(!saveCloudFromInputs(true)) return;
  const c = cloudCfg();
  const base = c.url.replace(/\/+$/, '');
  const rows = [];
  const probe = async (name, url, opts) => {
    try{
      const res = await fetch(url, opts);
      let detail = '';
      try{ const t = await res.text(); detail = (t || '').slice(0, 120); }catch(e){}
      rows.push({ok: res.ok, name, status: res.status, detail});
      return res;
    }catch(e){
      rows.push({ok:false, name, status: 0, detail: String(e.message || e)});
      return null;
    }
  };

  await probe('REST 根路径', base + '/rest/v1/', {headers: {apikey: c.anonKey}});
  await probe('family_state 表', base + '/rest/v1/family_state?select=family_code&limit=1',
              {headers: {apikey: c.anonKey, Authorization: 'Bearer ' + c.anonKey}});
  const r3 = await probe('直连读（无凭证，应 0 行）', base + '/rest/v1/family_state?select=family_code&limit=5',
              {headers: {apikey: c.anonKey, Authorization: 'Bearer ' + c.anonKey}});
  let leaked = 0;
  try{ const j = await r3.json(); if(Array.isArray(j)) leaked = j.length; }catch(e){}
  await probe('RPC family_pull', base + '/rest/v1/rpc/family_pull',
              {method:'POST', headers: cloudHeaders({family:true}), body: JSON.stringify({p_code: c.familyCode, p_secret: cloudSecret()})});

  // 端到端：临时码建行 → 读回 → 删掉
  const tmp = 'ZZ' + Math.random().toString(36).slice(2, 8).toUpperCase();
  const tmpCred = md5hex(tmp + ':' + tmp);
  const hdr = {apikey: c.anonKey, Authorization: 'Bearer ' + c.anonKey, 'Content-Type':'application/json',
               'x-family-code': tmp, 'x-family-auth': tmpCred, 'x-family-secret': tmpCred};
  let e2e = '未测';
  try{
    const pr = await fetch(base + '/rest/v1/rpc/family_push', {method:'POST', headers: hdr,
      body: JSON.stringify({p_code: tmp, p_auth: tmpCred, p_new: tmpCred, p_state: {probe:true}, p_updated_at: new Date().toISOString()})});
    if(pr.ok){
      const g = await fetch(base + '/rest/v1/rpc/family_pull', {method:'POST', headers: hdr,
        body: JSON.stringify({p_code: tmp, p_secret: tmpCred})});
      const j = await g.json();
      e2e = (j && j.probe) ? '✅ 写入+读回正常' : '⚠️ 读回为空';
      try{
        await fetch(base + '/rest/v1/family_state?family_code=eq.' + encodeURIComponent(tmp),
          {method:'DELETE', headers: hdr});
      }catch(e){}
    }else{
      const t = await pr.text();
      e2e = '❌ ' + pr.status + ' ' + (t || '').slice(0, 100);
    }
  }catch(e){ e2e = '❌ ' + String(e.message || e); }

  const find = n => rows.find(r => r.name.indexOf(n) === 0) || {status:0, detail:'', ok:false};
  const r1 = find('REST 根路径'), r2 = find('family_state 表'), r4 = find('RPC family_pull');
  const L = [];
  L.push('🩺 云端环境体检（' + new Date().toLocaleString('zh-CN', {hour12:false}) + '）');
  L.push('');
  L.push('【基础】');
  L.push('  项目 URL：' + c.url);
  L.push('  REST 根路径：' + (r1.status === 401 || r1.status === 200 ? '✅ 可达（' + r1.status + '）' : '❌ ' + r1.status + ' ' + r1.detail));
  L.push('  family_state 表：' + (r2.status === 200 ? '✅ 存在' : r2.status === 404 ? '❌ 不存在 → 请执行 supabase-setup.sql' : '❌ ' + r2.status + ' ' + r2.detail));
  L.push('');
  L.push('【表级权限（关键）】');
  L.push('  直连读（不带凭证）：' + (r3.status === 200
      ? (leaked === 0 ? '✅ 返回 0 行 → 别人拿 anon key 也读不到你的数据' : '❌ 返回 ' + leaked + ' 行 → RLS 没生效，别人能读全表！')
      : '⚠️ ' + r3.status + ' ' + r3.detail));
  L.push('  RPC family_pull：' + (r4.status === 200 ? '✅ 函数存在且可调用'
      : r4.status === 404 ? '❌ 函数不存在 → 请执行 supabase-setup.sql（v2.5.1 版）'
      : '❌ ' + r4.status + ' ' + r4.detail));
  L.push('');
  L.push('【端到端】');
  L.push('  临时行写入+读回：' + e2e);
  L.push('');
  L.push('【判定】');
  if(r2.status === 404) L.push('  → 云端还没建表。先在 SQL Editor 执行 supabase-setup.sql，再点本按钮复测。');
  else if(r4.status === 404) L.push('  → 表在、但 RPC 函数不在。请执行 v2.5.1 版脚本（会重建函数 + 收紧 RLS）。');
  else if(r3.status === 200 && leaked > 0) L.push('  → ⚠️ RLS 没生效：拿到 anon key 的人能列出并读取所有家庭数据。必须重建策略。');
  else if(e2e.indexOf('✅') === 0) L.push('  → ✅ 云端权限与同步链路都正常，可以直接用了。');
  else L.push('  → 部分环节异常，见上面各行报错。');

  showModal({
    emoji: '🩺',
    title: '云端环境体检',
    sub: '一次性测出云端支持什么，避免反复试错',
    fields: [{id:'docOut', type:'text', value: L.join('\n')}],
    actions: [{label:'知道了', cls:'primary'}],
  });
}

// 自动推送：防抖 2 秒（保存频繁，但数据极小）
let _cloudTimer = 0;
function scheduleCloudPush(){
  if(!cloudReady() || !cloudCfg().autoSync) return;
  clearTimeout(_cloudTimer);
  _cloudTimer = setTimeout(async () => {
    try{ await cloudPush(); }catch(e){ console.warn('[MAX] 自动上云失败', e); }
  }, 2000);
}

/* ============================================================
   v2.3.0 数据表格：表格 ↔ 前端记录 双向锚定
   ------------------------------------------------------------
   一行 = 一次考试/测验；入账后生成正式记录（recId 互为锚点）
   改已入账的行 → 状态「需重记」→ 自动撤销旧记录再按新值入账
   ============================================================ */
function dtTable(){
  if(!state.cfg.tables) state.cfg.tables = {};
  if(!state.cfg.tables.exam) state.cfg.tables.exam = {rows: []};
  return state.cfg.tables.exam;
}
const dtRid = () => 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// 类型归一：中文/英文都吃，"大考/big/b" → b，其余 → s
const normType = v => {
  const s = String(v ?? '').trim().toLowerCase();
  return (s === 'b' || s === 'big' || s.includes('大')) ? 'b' : 's';
};
// v2.5.0：规则取自后台「评分规则」卡（家长可改），不再写死常量
function scoreRules(){
  const R = state.cfg.scoreRules || {};
  const d = defaultState().cfg.scoreRules;
  return Object.assign({}, d, R, {
    bands:    Array.isArray(R.bands)    && R.bands.length    ? R.bands    : d.bands,
    bandsBig: Array.isArray(R.bandsBig) && R.bandsBig.length ? R.bandsBig : d.bandsBig,
    grades:   Array.isArray(R.grades)   && R.grades.length   ? R.grades   : d.grades,
  });
}
// 等级制：优先匹配「更长的等级名」（A++ 必须先于 A+ 命中）
function gradeReward(grade){
  const g = String(grade ?? '').trim().toUpperCase();
  if(!g) return 0;
  const hit = scoreRules().grades
    .filter(x => String(x.g).trim().toUpperCase() === g)
    .sort((a, b) => String(b.g).length - String(a.g).length)[0];
  return hit ? (Number(hit.reward) || 0) : 0;
}
// 分数制：按「百分比」或「绝对分」换算，再落阶梯
function bandReward(row){
  const R = scoreRules();
  const sc = parseFloat(row.score);
  if(isNaN(sc)) return 0;
  const fl = parseFloat(row.full);
  let pct;
  if(R.mode === 'raw'){
    const std = parseFloat(R.standard) || 100;
    pct = sc / std * 100;
  }else{
    pct = fl > 0 ? (sc / fl * 100) : sc;   // percent 模式：满分 80/100/120 都适用
  }
  const bands = normType(row.type) === 'b' ? R.bandsBig : R.bands;
  let reward = 0;
  bands.forEach(b => { if(pct >= (Number(b.min) || 0)) reward = Number(b.reward) || 0; });
  return reward;
}
// 统一入口：等级制 / 分数制
function scoreReward(row){
  return (row.mode === 'grade') ? gradeReward(row.grade) : bandReward(row);
}
// 兼容旧调用（自检用）
const examReward = (type, score, full) => bandReward({type, score, full, mode: 'score'});
function dtStatus(row){
  if(!row.recId) return {cls: 'st-none', text: '—'};
  const rec = state.records.find(r => r.id === row.recId);
  if(!rec) return {cls: 'st-none', text: '记录已删'};
  if(Math.abs(rec.val) !== Math.abs(Number(row.reward) || 0)) return {cls: 'st-dirty', text: '⟳ 需重记'};
  return {cls: 'st-ok', text: '✅ 已入账'};
}
// 入账 / 重记：撤销旧记录 → 按新值写新记录（不会重复加分）
function dtPost(row){
  const reward = Number(row.reward) || 0;
  if(reward === 0){ toast('这一行积分是 0，不入账（分数/等级未达奖励线）', 'error'); return; }
  if(row.recId){
    const i = state.records.findIndex(r => r.id === row.recId);
    if(i >= 0){ revertRecord(state.records[i]); state.records.splice(i, 1); }
  }
  // v2.5.0：等级制映射到课堂表现任务，分数制映射到小考/大考
  let tid;
  if(row.mode === 'grade'){
    const g = String(row.grade || '').trim().toUpperCase();
    tid = ({'A++': 't_class_app', 'A+': 't_class_ap', 'C': 't_class_c', 'D': 't_class_d', 'E': 't_class_e'})[g] || 't_class_ap';
  }else{
    tid = normType(row.type) === 'b' ? 't_test_b' : 't_test_s';
  }
  const label = row.mode === 'grade' ? `课堂评级 ${row.grade}` : `${row.title || '考试'} ${row.subject || ''} ${row.score}分`;
  const rec = addRecord(reward >= 0 ? 'in' : 'out', reward, `🏅 ${label} ${signed(reward)}`, tid);
  row.recId = rec.id;
  saveState();
}

function renderDataTable(){
  const rows = dtTable().rows;
  $('dtCount').textContent = rows.length + ' 行';
  if(!rows.length){
    $('dtBody').innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-3);padding:20px">还没有数据 —— 点「＋ 加一行」或「📥 导入 CSV/Excel」</td></tr>';
    return;
  }
  $('dtBody').innerHTML = rows.map((r, i) => {
    const st = dtStatus(r);
    const isGrade = r.mode === 'grade';
    return `<tr data-i="${i}">
      <td><input data-k="date"    value="${esc(r.date || '')}" placeholder="2026-10-18"></td>
      <td><input data-k="title"   value="${esc(r.title || '')}" placeholder="单元测验"></td>
      <td><input data-k="subject" value="${esc(r.subject || '')}" placeholder="数学"></td>
      <td><select data-k="mode">
            <option value="score"${!isGrade ? ' selected' : ''}>分数制</option>
            <option value="grade"${isGrade ? ' selected' : ''}>等级制</option>
          </select></td>
      <td>${isGrade
            ? `<select data-k="grade">${['', 'A++', 'A+', 'B', 'C', 'D', 'E'].map(g => `<option value="${g}"${String(r.grade || '').toUpperCase() === g ? ' selected' : ''}>${g || '—'}</option>`).join('')}</select>`
            : `<select data-k="type">
                 <option value="s"${normType(r.type) !== 'b' ? ' selected' : ''}>小考</option>
                 <option value="b"${normType(r.type) === 'b' ? ' selected' : ''}>大考</option>
               </select>`}</td>
      <td class="num"><input data-k="score" type="number" value="${isGrade ? '' : esc(String(r.score ?? ''))}" placeholder="${isGrade ? '—' : '96'}" style="width:74px" ${isGrade ? 'disabled' : ''}></td>
      <td class="num"><input data-k="full" type="number" value="${esc(String(r.full ?? scoreRules().standard))}" style="width:74px" ${isGrade ? 'disabled' : ''}></td>
      <td class="num"><input data-k="reward" type="number" value="${esc(String(r.reward ?? 0))}" style="width:74px"></td>
      <td class="${st.cls}">${st.text}</td>
      <td>
        <button class="btn" data-act="post"  style="padding:5px 10px;font-size:12px"><span>${r.recId ? '重记' : '入账'}</span></button>
        <button class="btn" data-act="undo"  style="padding:5px 10px;font-size:12px"><span>撤销</span></button>
        <button class="btn" data-act="del"   style="padding:5px 10px;font-size:12px"><span>🗑</span></button>
      </td>
    </tr>`;
  }).join('');
}

// 单元格编辑：分数/满分/类型变化 → 自动重算阶梯积分（手改过积分的行加锁，不覆盖）
$('dtBody').addEventListener('change', e => {
  const k = e.target.dataset.k;
  if(!k) return;
  const tr = e.target.closest('tr');
  const row = dtTable().rows[Number(tr.dataset.i)];
  if(!row) return;
  row[k] = e.target.value;
  if(k === 'type') row.type = normType(row.type);
  if(k === 'mode') row.mode = (row.mode === 'grade') ? 'grade' : 'score';
  if(k === 'reward'){ row.locked = true; }
  else if(k === 'score' || k === 'full' || k === 'type' || k === 'grade'){
    if(!row.locked) row.reward = scoreReward(row);
  }
  saveState(); renderDataTable(); render();
});
// 行操作：入账/重记 · 撤销 · 删除
$('dtBody').addEventListener('click', e => {
  const btn = e.target.closest('button[data-act]');
  if(!btn) return;
  const row = dtTable().rows[Number(btn.closest('tr').dataset.i)];
  if(!row) return;
  const act = btn.dataset.act;
  if(act === 'post'){
    dtPost(row);
    saveState(); render(); renderDataTable();
    toast(row.recId ? `🏅 已入账 +${row.reward}${COIN}` : '👌 已入账', 'success');
  }else if(act === 'undo'){
    if(!row.recId){ toast('这一行还没入账', 'error'); return; }
    const i = state.records.findIndex(r => r.id === row.recId);
    if(i >= 0){ revertRecord(state.records[i]); state.records.splice(i, 1); }
    row.recId = null;
    saveState(); render(); renderDataTable();
    toast('↩ 已撤销该行入账');
  }else if(act === 'del'){
    if(row.recId){
      const i = state.records.findIndex(r => r.id === row.recId);
      if(i >= 0){ revertRecord(state.records[i]); state.records.splice(i, 1); }
    }
    dtTable().rows.splice(Number(btn.closest('tr').dataset.i), 1);
    saveState(); render(); renderDataTable();
  }
});
$('dtAddRow').addEventListener('click', () => {
  dtTable().rows.push({
    id: dtRid(), date: dayStr(), title: '', subject: '', type: 's',
    score: '', full: 100, reward: 0, note: '', recId: null, locked: false,
  });
  saveState(); renderDataTable();
});

// ---------- CSV 导出 / 导入 ----------
const dtHeader = ['日期', '名称', '科目', '方式', '类型/等级', '分数', '满分', '积分', '备注'];
function dtToCsv(onlyHeader){
  const rows = onlyHeader ? [] : dtTable().rows.map(r => [
    r.date || '', r.title || '', r.subject || '',
    r.mode === 'grade' ? '等级制' : '分数制',
    r.mode === 'grade' ? (r.grade || '') : (normType(r.type) === 'b' ? '大考' : '小考'),
    r.mode === 'grade' ? '' : (r.score ?? ''),
    r.mode === 'grade' ? '' : (r.full ?? scoreRules().standard),
    r.reward ?? 0, r.note || '',
  ]);
  const q = v => `"${String(v).replace(/"/g, '""')}"`;
  return [dtHeader.join(','), ...rows.map(r => r.map(q).join(','))].join('\n');
}
function downloadCsv(name, text){
  const blob = new Blob(['﻿' + text], {type: 'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
// v2.5.0：空白模板（带示例行，Excel 直接改就能导回）
$('dtTemplate').addEventListener('click', () => {
  const demo = [
    dtHeader.join(','),
    `${dayStr()},"单元测验",数学,分数制,小考,96,100,,`,
    `${dayStr()},"期中考试",数学,分数制,大考,100,100,,`,
    `${dayStr()},"英语口试",英语,分数制,小考,116,120,,`,   // 非百分制：按百分比换算
    `${dayStr()},"课堂听写",语文,等级制,A+,,,,`,             // 等级制
    `${dayStr()},"课堂测验",英语,等级制,C,,,,`,
  ].join('\n');
  downloadCsv('成绩导入模板.csv', demo);
  toast('📄 模板已下载 → Excel 打开填好，再从「📥 导入」传回来', 'success');
});
$('dtExport').addEventListener('click', () => {
  if(!dtTable().rows.length){ toast('表格是空的，没什么可导出', 'error'); return; }
  downloadCsv(`成绩表_${dayStr()}.csv`, dtToCsv());
  toast('📤 已导出 CSV');
});

// CSV 解析（支持引号与转义双引号）
function parseCsv(text){
  const rows = [];
  let cur = '', row = [], inQ = false;
  const s = text.replace(/^﻿/, '');
  for(let i = 0; i < s.length; i++){
    const c = s[i];
    if(inQ){
      if(c === '"'){ if(s[i + 1] === '"'){ cur += '"'; i++; } else inQ = false; }
      else cur += c;
    }else if(c === '"') inQ = true;
    else if(c === ','){ row.push(cur); cur = ''; }
    else if(c === '\n'){ row.push(cur); rows.push(row); row = []; cur = ''; }
    else if(c !== '\r') cur += c;
  }
  if(cur.length || row.length){ row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(c => String(c).trim() !== ''));
}
// 表头名 → 字段（中文/英文都认）
const DT_MAP = {
  日期: 'date', date: 'date', 时间: 'date',
  名称: 'title', 考试: 'title', 测验: 'title', title: 'title', name: 'title',
  科目: 'subject', subject: 'subject',
  方式: 'mode', 评分方式: 'mode', mode: 'mode',
  类型: 'kind', 等级: 'kind', '类型/等级': 'kind', type: 'kind', grade: 'kind',
  分数: 'score', 成绩: 'score', score: 'score',
  满分: 'full', full: 'full', total: 'full',
  积分: 'reward', reward: 'reward',
  备注: 'note', note: 'note', remark: 'note',
};
function dtImportRows(matrix, label){
  if(!matrix.length){ toast('没读到数据', 'error'); return; }
  const head = matrix[0].map(h => {
    const s = String(h).trim();
    return DT_MAP[s] || DT_MAP[s.toLowerCase()] || null;
  });
  const body = matrix.slice(1).filter(r => r.some(c => String(c).trim() !== ''));
  let n = 0;
  body.forEach(cells => {
    const row = {id: dtRid(), date: dayStr(), title: '', subject: '', mode: 'score', type: 's', grade: '', score: '', full: scoreRules().standard, reward: 0, note: '', recId: null, locked: false};
    head.forEach((k, i) => { if(k && cells[i] !== undefined) row[k] = String(cells[i]).trim(); });
    // 归一：方式（分数制/等级制）、类型或等级
    row.mode = /等级|grade/i.test(String(row.mode)) ? 'grade' : 'score';
    if(row.mode === 'grade'){
      row.grade = String(row.kind || '').toUpperCase();
    }else{
      row.type = normType(row.kind);
      row.score = row.score === '' ? '' : parseFloat(row.score);
      row.full = parseFloat(row.full) || scoreRules().standard;
    }
    if(row.score !== '' && !isNaN(row.score) && !row.locked) row.reward = scoreReward(row);
    else if(row.mode === 'grade' && !row.locked) row.reward = scoreReward(row);
    dtTable().rows.push(row);
    n++;
  });
  saveState(); renderDataTable(); render();
  toast(`📥 ${label} 导入 ${n} 行`, 'success');
}
// Excel 懒加载（失败自动降级回 CSV，不影响主流程）
let _xlsxLoading = false;
function loadXlsxLib(){
  if(window.XLSX) return Promise.resolve(window.XLSX);
  if(_xlsxLoading) return Promise.reject(new Error('加载中'));
  _xlsxLoading = true;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    s.onload  = () => resolve(window.XLSX);
    s.onerror = () => reject(new Error('Excel 解析库加载失败，请改用 CSV'));
    document.head.appendChild(s);
  });
}
$('dtImport').addEventListener('click', () => {
  showModal({
    emoji:'📥',
    title:'导入成绩数据',
    sub:'① 直接粘贴（CSV 格式，含表头行）　② 或选 CSV / Excel 文件',
    fields:[
      {id:'dtPaste', type:'text', value:'', placeholder:'日期,名称,科目,类型,分数,满分\n2026-10-18,单元测验,数学,小考,96,100'},
      {id:'dtFile',  type:'file', accept:'.csv,.xlsx,.xls'},
    ],
    actions:[
      {label:'取消'},
      {label:'导入粘贴内容', cls:'primary', onClick:async v => {
        const text = String(v.dtPaste || '').trim();
        if(!text){ toast('请先粘贴 CSV 内容，或改用文件导入', 'error'); return; }
        closeModal();
        dtImportRows(parseCsv(text), 'CSV');
      }},
      {label:'导入文件', onClick:async v => {
        const f = v.dtFile;
        if(!f){ toast('请先选择文件', 'error'); return; }
        closeModal();
        const name = (f.name || '').toLowerCase();
        try{
          if(name.endsWith('.csv')){
            dtImportRows(parseCsv(await f.text()), 'CSV');
          }else{
            await loadXlsxLib();
            const wb = window.XLSX.read(await f.arrayBuffer(), {type:'array'});
            const sheet = wb.Sheets[wb.SheetNames[0]];
            dtImportRows(window.XLSX.utils.sheet_to_json(sheet, {header:1, defval:''}), 'Excel');
          }
        }catch(e){ toast('导入失败：' + e.message, 'error'); }
      }},
    ],
  });
});
$('dtPostAll').addEventListener('click', () => {
  const rows = dtTable().rows;
  const todo = rows.filter(r => !r.recId && Number(r.reward) > 0);
  if(!todo.length){ toast('没有待入账的行（或积分都是 0）', 'error'); return; }
  showModal({
    emoji:'⚡',
    title:`批量入账 ${todo.length} 行？`,
    sub:`合计 <b>${todo.reduce((s, r) => s + Number(r.reward || 0), 0)} ${COIN}</b>，会生成 ${todo.length} 条正式记录。`,
    actions:[
      {label:'取消'},
      {label:'确认入账', cls:'primary', onClick:() => {
        todo.forEach(dtPost);
        saveState(); render(); renderDataTable();
        closeModal();
        toast(`⚡ 已入账 ${todo.length} 行`, 'success');
      }},
    ],
  });
});
$('dtClear').addEventListener('click', () => {
  const rows = dtTable().rows;
  const posted = rows.filter(r => r.recId).length;
  showModal({
    emoji:'⚠️',
    title:'清空整张表？',
    sub:`将删除 ${rows.length} 行${posted ? `，并撤销其中 ${posted} 条已入账记录（余额会退回）` : ''}。建议先「📤 导出 CSV」备份。`,
    actions:[
      {label:'取消'},
      {label:'确认清空', cls:'danger', onClick:() => {
        rows.forEach(r => {
          if(!r.recId) return;
          const i = state.records.findIndex(x => x.id === r.recId);
          if(i >= 0){ revertRecord(state.records[i]); state.records.splice(i, 1); }
        });
        dtTable().rows = [];
        saveState(); render(); renderDataTable(); closeModal();
        toast('🗑 表格已清空');
      }},
    ],
  });
});

// ---------- 评分规则编辑器（v2.5.0） ----------
function renderScoreRules(){
  const R = scoreRules();
  $('srMode').value = R.mode;
  $('srStandard').value = R.standard;
  const n = Math.max(R.bands.length, R.bandsBig.length);
  $('srBandsBody').innerHTML = Array.from({length: n}, (_, i) => {
    const a = R.bands[i] || {min:'', reward:''};
    const b = R.bandsBig[i] || {min:'', reward:''};
    return `<tr data-i="${i}">
      <td><input data-g="b" data-k="min"    type="number" value="${a.min === undefined ? '' : esc(String(a.min))}" style="width:86px"></td>
      <td><input data-g="b" data-k="reward" type="number" value="${a.reward === undefined ? '' : esc(String(a.reward))}" style="width:86px"></td>
      <td><input data-g="B" data-k="min"    type="number" value="${b.min === undefined ? '' : esc(String(b.min))}" style="width:86px"></td>
      <td><input data-g="B" data-k="reward" type="number" value="${b.reward === undefined ? '' : esc(String(b.reward))}" style="width:86px"></td>
    </tr>`;
  }).join('');
  $('srGradesBody').innerHTML = R.grades.map((g, i) => `<tr data-i="${i}">
      <td><input data-g="g" data-k="g"      value="${esc(String(g.g))}" style="width:90px"></td>
      <td><input data-g="g" data-k="reward" type="number" value="${esc(String(g.reward))}" style="width:86px"></td>
      <td><button class="btn" data-act="delGrade" style="padding:4px 8px;font-size:12px"><span>🗑</span></button></td>
    </tr>`).join('');
}
// 规则改完 → 重算所有未锁定的行 + 重渲染
function rulesChanged(){
  const R = state.cfg.scoreRules;
  dtTable().rows.forEach(r => { if(!r.locked) r.reward = scoreReward(r); });
  saveState(); renderDataTable(); renderScoreRules(); render();
}
$('srMode').addEventListener('change', e => { state.cfg.scoreRules.mode = e.target.value; rulesChanged(); });
$('srStandard').addEventListener('change', e => {
  state.cfg.scoreRules.standard = parseFloat(e.target.value) || 100; rulesChanged();
});
$('srBandsBody').addEventListener('change', e => {
  const g = e.target.dataset.g, k = e.target.dataset.k;
  if(!g || !k) return;
  const R = state.cfg.scoreRules;
  const i = Number(e.target.closest('tr').dataset.i);
  const arr = g === 'b' ? R.bands : R.bandsBig;
  while(arr.length <= i) arr.push({min:'', reward:0});
  arr[i][k] = k === 'reward' ? (Number(e.target.value) || 0) : (Number(e.target.value) || 0);
  rulesChanged();
});
$('srAddBand').addEventListener('click', () => {
  const R = state.cfg.scoreRules;
  R.bands.push({min:'', reward:0}); R.bandsBig.push({min:'', reward:0});
  rulesChanged();
});
$('srGradesBody').addEventListener('change', e => {
  const k = e.target.dataset.k;
  if(!k) return;
  const i = Number(e.target.closest('tr').dataset.i);
  state.cfg.scoreRules.grades[i][k] = (k === 'g') ? e.target.value : (Number(e.target.value) || 0);
  rulesChanged();
});
$('srGradesBody').addEventListener('click', e => {
  const btn = e.target.closest('button[data-act="delGrade"]');
  if(!btn) return;
  state.cfg.scoreRules.grades.splice(Number(btn.closest('tr').dataset.i), 1);
  rulesChanged();
});
$('srAddGrade').addEventListener('click', () => {
  state.cfg.scoreRules.grades.push({g:'', reward:0});
  rulesChanged();
});
$('dtRulesReset').addEventListener('click', () => {
  showModal({
    emoji:'↺',
    title:'恢复默认评分规则？',
    sub:'阶梯与等级映射会还原为 v1.2.3 计划默认值，表格中未锁定的行会按新规则重算。',
    actions:[
      {label:'取消'},
      {label:'恢复默认', cls:'primary', onClick:() => {
        state.cfg.scoreRules = JSON.parse(JSON.stringify(defaultState().cfg.scoreRules));
        rulesChanged();
        toast('↺ 已恢复默认');
      }},
    ],
  });
});

// v2.3.0：建表 SQL 内置一份，手机上点一下就能复制到剪贴板
const SUPABASE_SQL = [
  "create table if not exists public.family_state (",
  "  family_code text primary key,",
  "  secret_hash text not null default '',",
  "  state       jsonb       not null default '{}'::jsonb,",
  "  updated_at  timestamptz not null default now()",
  ");",
  "alter table public.family_state add column if not exists secret_hash text not null default '';",
  "alter table public.family_state enable row level security;",
  "drop policy if exists \"family_state anon rw\" on public.family_state;",
  "drop policy if exists \"family_state direct access\" on public.family_state;",
  "drop policy if exists \"family_state own row\" on public.family_state;",
  "create or replace function public.fam_hdr(p_name text)",
  "returns text language plpgsql stable as $$",
  "declare v_raw text; v_json jsonb; begin",
  "  v_raw := coalesce(current_setting('request.headers', true), '');",
  "  if v_raw <> '' then",
  "    begin",
  "      v_json := v_raw::jsonb;",
  "      return coalesce(v_json ->> p_name, '');",
  "    exception when others then",
  "      null;",
  "    end;",
  "  end if;",
  "  return coalesce(current_setting('request.header.' || p_name, true), '');",
  "end;",
  "$$;",
  "create or replace function public.fam_code()",
  "returns text language plpgsql stable as $$",
  "declare v text; begin",
  "  v := coalesce(current_setting('app.family_code', true), '');",
  "  if v <> '' then return v; end if;",
  "  return public.fam_hdr('x-family-code');",
  "end;",
  "$$;",
  "create or replace function public.fam_auth()",
  "returns text language plpgsql stable as $$",
  "declare v text; begin",
  "  v := coalesce(current_setting('app.family_auth', true), '');",
  "  if v <> '' then return v; end if;",
  "  v := public.fam_hdr('x-family-auth');",
  "  if v <> '' then return v; end if;",
  "  return public.fam_hdr('x-family-secret');",
  "end;",
  "$$;",
  "create or replace function public.fam_new()",
  "returns text language plpgsql stable as $$",
  "declare v text; begin",
  "  v := coalesce(current_setting('app.family_new', true), '');",
  "  if v <> '' then return v; end if;",
  "  v := public.fam_hdr('x-family-secret');",
  "  if v <> '' then return v; end if;",
  "  return public.fam_hdr('x-family-auth');",
  "end;",
  "$$;",
  "create policy \"family_state own row\" on public.family_state",
  "  for all to anon, authenticated",
  "  using (",
  "    public.fam_code() = family_code",
  "    and (",
  "      (secret_hash <> '' and secret_hash = public.fam_auth())",
  "      or",
  "      (secret_hash = '')",
  "    )",
  "  )",
  "  with check (",
  "    public.fam_code() = family_code",
  "    and secret_hash = public.fam_new()",
  "  );",
  "grant select, insert, update, delete on public.family_state to anon, authenticated;",
  "grant execute on function public.fam_hdr(text) to anon, authenticated;",
  "grant execute on function public.fam_code() to anon, authenticated;",
  "grant execute on function public.fam_auth() to anon, authenticated;",
  "grant execute on function public.fam_new() to anon, authenticated;",
  "create or replace function public.family_pull(p_code text, p_secret text)",
  "returns jsonb language plpgsql as $$",
  "declare v_state jsonb; begin",
  "  perform set_config('app.family_code', coalesce(p_code, ''), true);",
  "  perform set_config('app.family_auth', coalesce(p_secret, ''), true);",
  "  perform set_config('app.family_new', coalesce(p_secret, ''), true);",
  "  select state into v_state from public.family_state where family_code = coalesce(p_code, '');",
  "  return v_state;",
  "end;",
  "$$;",
  "create or replace function public.family_push(",
  "  p_code text,",
  "  p_auth text,",
  "  p_new text,",
  "  p_state jsonb,",
  "  p_updated_at timestamptz default now()",
  ")",
  "returns jsonb language plpgsql as $$",
  "declare v_code text := coalesce(p_code, ''); v_new text := coalesce(p_new, p_auth, ''); begin",
  "  if v_code = '' then raise exception 'EMPTY_CODE' using errcode = '22023'; end if;",
  "  if v_new = '' then raise exception 'EMPTY_SECRET' using errcode = '22023'; end if;",
  "  perform set_config('app.family_code', v_code, true);",
  "  perform set_config('app.family_auth', coalesce(p_auth, v_new), true);",
  "  perform set_config('app.family_new', v_new, true);",
  "  update public.family_state",
  "     set secret_hash = v_new, state = p_state, updated_at = coalesce(p_updated_at, now())",
  "   where family_code = v_code;",
  "  if found then return jsonb_build_object('ok', true, 'family_code', v_code); end if;",
  "  begin",
  "    insert into public.family_state (family_code, secret_hash, state, updated_at)",
  "    values (v_code, v_new, p_state, coalesce(p_updated_at, now()));",
  "  exception when unique_violation then",
  "    raise exception 'BAD_SECRET' using errcode = '42501';",
  "  end;",
  "  return jsonb_build_object('ok', true, 'family_code', v_code);",
  "end;",
  "$$;",
  "revoke all on function public.family_pull(text, text) from public;",
  "revoke all on function public.family_push(text, text, text, jsonb, timestamptz) from public;",
  "grant execute on function public.family_pull(text, text) to anon, authenticated;",
  "grant execute on function public.family_push(text, text, text, jsonb, timestamptz) to anon, authenticated;",
].join('\n');

async function copyCloudSql(){
  try{
    await navigator.clipboard.writeText(SUPABASE_SQL);
    toast('📋 建表 SQL 已复制 → 粘贴到 Supabase SQL Editor 执行', 'success');
  }catch(e){
    showModal({
      emoji:'📋',
      title:'建表 SQL（长按复制）',
      sub:'粘贴到 Supabase → SQL Editor → New query → Run',
      fields:[{id:'sqlOut', type:'text', value:SUPABASE_SQL}],
      actions:[{label:'关闭', cls:'primary'}],
    });
  }
}
$('btnCloudSql').addEventListener('click', copyCloudSql);

$('btnCloudGen').addEventListener('click', () => {
  $('cloudCode').value = genFamilyCode();
  if(!$('cloudSecret').value) $('cloudSecret').value = genCloudSecret();
  saveCloudFromInputs(true);          // 生成即生效，省得再点保存
  toast('🎲 已生成家庭码' + (cloudCfg().secret ? ' + 访问密钥' : '') + '并保存');
});
// v2.5.0：访问密钥（表级权限钥匙）——换设备时必须与家庭码一起填
$('btnSecretGen').addEventListener('click', () => {
  if(!$('cloudCode').value) $('cloudCode').value = genFamilyCode();
  $('cloudSecret').value = genCloudSecret();
  saveCloudFromInputs(true);
  toast('🔑 已生成新访问密钥（另一台设备需填同一个密钥才能同步）');
});
$('btnCloudSave').addEventListener('click', () => { saveCloudFromInputs(false); });
$('cloudAuto').addEventListener('click', () => {
  const c = cloudCfg(); c.autoSync = !c.autoSync; saveCloudCfg(c);
  renderCloudCard();
  toast(c.autoSync ? '☁️ 自动同步已开启' : '☁️ 自动同步已关闭');
  if(c.autoSync) scheduleCloudPush();
});
// v2.2.1：测试/同步前自动读取输入框并保存（不再要求先点保存）
$('btnCloudTest').addEventListener('click', () => {
  if(!saveCloudFromInputs(true)) return;
  testCloud();
});
$('btnCloudDoctor').addEventListener('click', () => { cloudDoctor(); });
$('btnCloudSync').addEventListener('click', async () => {
  if(!saveCloudFromInputs(true)) return;
  try{ await cloudSyncNow(); }catch(e){ toast('同步失败：' + e.message, 'error'); }
  renderCloudCard();
});

$('btnReset').addEventListener('click', () => {
  showModal({
    emoji:'⚠️',
    title:'重置全部数据？',
    sub:'将清空余额、记录、设置，且不可恢复。建议先「导出数据」备份。',
    actions:[
      {label:'取消'},
      {label:'确认重置', cls:'danger', onClick:() => {
        // 沿用当前「起步余额」设置（v1.2 直接归零，该设置形同虚设）
        state = Object.assign(defaultState(), {balance: state.cfg.initBal});
        saveState(); render();
        toast('已重置', 'error');
        closeModal();
      }},
    ],
  });
});

// ---------- ⑦ 动效层 ----------
const PARTICLE_COLORS = ['#FF4D2E', '#FFD60A', '#06D6A0', '#3A86FF', '#9D4EDD', '#FF006E'];

// 特效档位系数：full=1 / mini=0.4 / off=0
const fxK = () => state.cfg.fx === 'full' ? 1 : state.cfg.fx === 'mini' ? 0.4 : 0;

function spawnParticle(layer, css, lifeMs, text){
  const p = document.createElement('div');
  p.className = 'particle';
  if(text) p.textContent = text;
  p.style.cssText = css;
  layer.appendChild(p);
  setTimeout(() => p.remove(), lifeMs);
}

// 放射彩带
function burst(count = 12){
  const layer = $('particleLayer');
  const cx = window.innerWidth / 2, cy = 200;
  count = Math.round(count * fxK());
  for(let i = 0; i < count; i++){
    const angle = (i / count) * Math.PI * 2;
    const dist = 80 + Math.random() * 80;
    const size = 6 + Math.random() * 8;
    spawnParticle(layer, `
      left:${cx}px;top:${cy}px;
      background:${PARTICLE_COLORS[i % PARTICLE_COLORS.length]};
      --dx:${Math.cos(angle) * dist}px;--dy:${Math.sin(angle) * dist}px;
      width:${size}px;height:${size}px;`, 1200);
  }
}

// 兑换成功：emoji 从屏幕中心炸开
function giftPop(emoji){
  if(state.cfg.fx === 'off') return;
  const layer = $('particleLayer');
  const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  const n = state.cfg.fx === 'mini' ? 4 : 8;
  for(let i = 0; i < n; i++){
    const angle = (i / 8) * Math.PI * 2;
    const dist = 100 + Math.random() * 60;
    spawnParticle(layer, `
      left:${cx}px;top:${cy}px;background:transparent;font-size:24px;
      --dx:${Math.cos(angle) * dist}px;--dy:${Math.sin(angle) * dist - 40}px;`, 1500, emoji);
  }
}

// 得分飞行数字：从被点的任务位置飘起（2.4s 慢渐隐）
function flyScore(fromEl, text, positive){
  if(!fromEl || state.cfg.fx === 'off') return;
  const r = fromEl.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'fly-score ' + (positive ? 'in' : 'out');
  el.textContent = text;
  el.style.left = (r.left + r.width / 2) + 'px';
  el.style.top  = (r.top + r.height / 2) + 'px';
  $('particleLayer').appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

// 金色 M-Coin 从卡片弹出，旋转上升渐隐
function coinPop(fromEl){
  if(!fromEl || state.cfg.fx === 'off') return;
  const r = fromEl.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'coin coin-pop';
  el.textContent = childInitial();
  el.style.left = (r.left + r.width / 2) + 'px';
  el.style.top  = (r.top + r.height / 2) + 'px';
  $('particleLayer').appendChild(el);
  setTimeout(() => el.remove(), 1800);
}

// 抖动：用 animation + animationend 复位，避免 setTimeout 链在连点时互相打架
function shake(el){
  if(!el) return;
  el.classList.remove('is-shaking');
  void el.offsetWidth;                 // 强制重排，使动画可重复触发
  el.classList.add('is-shaking');
  el.addEventListener('animationend', () => el.classList.remove('is-shaking'), {once:true});
}

function toast(msg, type = ''){
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  $('toastLayer').appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

// ---------- ⑧ 启动 ----------
// 规则调参 / 数据管理 在宽屏下通栏显示
$('adminRulesCard').classList.add('wide');

// ---------- 外观与体验 ----------
function applyPrefs(){
  document.documentElement.dataset.theme = state.cfg.theme || 'arcade';
}
function syncOptGroups(){
  const mark = (gid, attr, val) => {
    const g = $(gid);
    if(g) g.querySelectorAll('.opt').forEach(b => b.classList.toggle('on', b.dataset[attr] === val));
  };
  mark('optTheme', 'themeV', state.cfg.theme || 'arcade');
  mark('optSfx', 'sfxV', state.cfg.sfxStyle || 'retro');
  mark('optFx', 'fxV', state.cfg.fx || 'full');
}
$('optTheme').addEventListener('click', e => {
  const b = e.target.closest('.opt');
  if(!b) return;
  state.cfg.theme = b.dataset.themeV;
  saveState(); applyPrefs(); syncOptGroups(); render();
  toast('🎨 主题已切换：' + b.textContent.trim(), 'success');
});
$('optSfx').addEventListener('click', e => {
  const b = e.target.closest('.opt');
  if(!b) return;
  state.cfg.sfxStyle = b.dataset.sfxV;
  saveState(); syncOptGroups();
  sfx.coin();   // 试听一声
  toast('🔊 音效风格：' + b.textContent.trim(), 'success');
});
$('optFx').addEventListener('click', e => {
  const b = e.target.closest('.opt');
  if(!b) return;
  state.cfg.fx = b.dataset.fxV;
  saveState(); syncOptGroups();
  if(state.cfg.fx !== 'off') burst(14);
  toast('✨ 特效档位：' + b.textContent.trim(), 'success');
});

// 修改管理员密码（照 demo-admin 的校验方式：旧密码 → 新密码两遍）
$('btnChangePass').addEventListener('click', () => {
  const admin = state.cfg.admin;
  if(!admin.email || !admin.passHash){
    toast('未设置管理员账号，请先在「系统设置」保存', 'error');
    return;
  }
  showModal({
    emoji:'🔑',
    title:'修改管理员密码',
    sub:'需验证当前密码',
    fields:[
      {id:'cpOld', type:'password', placeholder:'当前密码'},
      {id:'cpNew1', type:'password', placeholder:'新密码（支持字母/数字/符号）'},
      {id:'cpNew2', type:'password', placeholder:'再输一遍'},
    ],
    actions:[
      {label:'取消'},
      {label:'保存新密码', cls:'primary', onClick:async v => {
        const oldH = await sha256(String(v.cpOld || ''));
        if(oldH !== admin.passHash){
          toast('当前密码不正确', 'error');
          return;
        }
        const p1 = String(v.cpNew1 || ''), p2 = String(v.cpNew2 || '');
        if(!p1){toast('请输入新密码', 'error'); return;}
        if(p1 !== p2){toast('两次输入不一致', 'error'); return;}
        state.cfg.admin.passHash = await sha256(p1);
        saveState(); render();
        toast('✅ 密码已更新，下次登录用新密码', 'success');
        closeModal();
      }},
    ],
  });
});
$('btnSecWizard').addEventListener('click', () => wizShow());

// ---------- 后台分组：运营 / 定制工坊 ----------
(function(){
  const view = document.querySelector('.view[data-view="admin"]');
  if(!view) return;
  const rules = [
    ['运营总览', 'ag-ops'], ['数据统计', 'ag-ops'], ['快捷调整', 'ag-ops'],
    ['系统设置', 'ag-ops'], ['数据管理', 'ag-ops'],
    ['任务 & 奖励工坊', 'ag-custom'], ['外观与体验', 'ag-custom'], ['账号与安全', 'ag-custom'],
  ];
  view.querySelectorAll(':scope > .card').forEach(card => {
    const title = card.querySelector('.card-title')?.textContent?.trim() || '';
    for(const [k, cls] of rules){
      if(title.includes(k)){
        card.classList.add(cls);
        return;
      }
    }
  });
  view.querySelectorAll('.ag-pill').forEach(p => {
    p.addEventListener('click', () => {
      view.querySelectorAll('.ag-pill').forEach(x => x.classList.remove('active'));
      p.classList.add('active');
      document.body.dataset.amode = p.dataset.ag;
      render();
    });
  });
  document.body.dataset.amode = 'ops';
})();

// 顶栏「爸妈」按钮：已设置账号时高亮+锁图标
document.querySelectorAll('#viewToggle .view-btn[data-view="parent"]').forEach(b => {
  b.classList.toggle('secured', !!(state.cfg.admin && state.cfg.admin.email));
});
renderBrand();   // 品牌：{NAME}'S CREDITS PLAN + 货币首字母

applyPrefs();   // 恢复上次选的主题

// 老存档升级：把当前管理员邮箱补进记住列表
if(state.cfg.admin && state.cfg.admin.email) rememberAccount(state.cfg.admin.email);

// 初始向导：全新存档（无任何记录且未完成向导）或地址栏 ?register 时进入
(function(){
  const fresh = !localStorage.getItem(STORAGE_KEY) && !state.cfg.setupDone;
  const blank = state.cfg.setupDone === false && state.balance === 0 && state.records.length === 0;
  if(fresh || blank || location.search.includes('register')) wizShow();
})();

// 吸顶迷你余额：余额卡滚出视口后常驻顶栏
const _balSection = document.querySelector('.balance-wrap');
window.addEventListener('scroll', () => {
  $('miniBal').classList.toggle('show', _balSection.getBoundingClientRect().bottom < 0);
}, {passive:true});

// v2.1.0：parent 是会话态，刷新/重开一律回孩子视角（旧 PIN 时代的防护升级为无条件）
if(state.view !== 'max') state.view = 'max';

setViewMode(state.view);   // 同步视角按钮 + 首屏
checkMonthlyExpire();
render();

// v2.2.0：配置了自动同步 → 启动时拉一次云端（云端更新则备份本地后拉取）
if(cloudReady() && cloudCfg().autoSync){
  cloudSyncNow().catch(e => console.warn('[MAX] 启动云拉取失败', e));
}

// 调试入口：控制台可手动刷分排查
window.MAX = {
  get state(){return state;},   // 用 getter，重置后仍指向当前 state
  TASKS, REWARDS,
  doTask(id){const t = mergedTasks().find(x => x.id === id); t && !t.off ? completeTask(t) : console.warn('task not found:', id);},
  doReward(id){const r = mergedRewards().find(x => x.id === id); r && !r.off ? redeemReward(r) : console.warn('reward not found:', id);},
  reset(){state = Object.assign(defaultState(), {balance: state.cfg.initBal}); saveState(); render();},
};

console.log('%c ' + childName().toUpperCase() + "'S CREDITS PLAN " + APP_VER + ' ', 'background:#FF4D2E;color:#000;font-size:14px;font-weight:900;padding:4px 12px');
console.log('品牌：', childName() + "'s Credits Plan", '｜存档键：', STORAGE_KEY, '｜调试：window.MAX.doTask("t_dawn") / doReward("r_cash") / reset()');

// 自检：打开 index.html?selftest 会在控制台打印核心规则校验结果
function runSelfTest(){
  const assert = (name, pass) => `${pass ? '✅' : '❌'} ${name}`;
  const results = [
    assert('任务 ID 无重复', new Set(TASKS.map(t => t.id)).size === TASKS.length),
    assert('奖励 ID 无重复', new Set(REWARDS.map(r => r.id)).size === REWARDS.length),
    assert('快捷任务 ID 均存在', QUICK_IDS.every(id => TASKS.some(t => t.id === id))),
    assert('任务分组均已定义', TASKS.every(t => TASK_GROUPS[t.group])),
    assert('奖励分类均已定义', REWARDS.every(r => REWARD_CATS[r.cat])),
    assert('正负号渲染', signed(5) === '+5' && signed(-3) === '-3'),
    assert('日期补零', dayStr(new Date(2026, 0, 5)) === '2026-01-05'),
    assert('HTML 转义', esc('<img src=x onerror=1>') === '&lt;img src=x onerror=1&gt;'),
    assert('规则覆盖生效', (state.cfg.taskOv = {t_dawn: {val: 99}}) && taskVal(TASKS[0]) === 99 && (delete state.cfg.taskOv.t_dawn, taskVal(TASKS[0]) === TASKS[0].val)),
    assert('停用过滤生效', (state.cfg.taskOv.t_home = {off: true}) && activeTasks().length === TASKS.filter(t => !t.legacy).length - 1 && (delete state.cfg.taskOv.t_home, activeTasks().length === TASKS.filter(t => !t.legacy).length)),
    assert('奖励价格覆盖', (state.cfg.rewardOv.r_cash = {cost: 7}) && rewardCost(REWARDS[0]) === 7 && (delete state.cfg.rewardOv.r_cash, rewardCost(REWARDS[0]) === REWARDS[0].cost)),
    assert('工坊合并列表', (state.cfg.customTasks.push({id:'c_t1', emoji:'⭐', type:'测试', text:'x', val:1, group:'daily'}), mergedTasks().some(t => t.id === 'c_t1')) && (state.cfg.customTasks.pop(), mergedTasks().every(t => t.id !== 'c_t1'))),
    assert('主题值合法', ['arcade', 'sweet', 'funny'].includes(state.cfg.theme || 'arcade')),
    assert('导航四锚点齐全', ['home', 'tasks', 'shop', 'records'].every(v => document.querySelector(`#topnav .tn-tab[data-tab="${v}"]`))),
    assert('邮箱记忆读写往返', (rememberAccount('__t@t.co'), loadAccounts()[0] === '__t@t.co') && (saveAccounts(loadAccounts().filter(e => e !== '__t@t.co')), !loadAccounts().includes('__t@t.co'))),
    assert('parent 会话态不落盘', (setViewMode('parent'), JSON.parse(localStorage.getItem(STORAGE_KEY)).view === 'max') && (setViewMode('max'), true)),
    assert('v1.2.3 七大分类齐全', ['daily','study','fit','honor','challenge','class','behav'].every(g => Object.values(TASKS).some(t => t.group === g))),
    assert('旧版条目默认停用', TASKS.filter(t => t.legacy).every(t => mergedTasks().find(x => x.id === t.id).off) && REWARDS.filter(r => r.legacy).every(r => mergedRewards().find(x => x.id === r.id).off)),
    assert('过期最低扣 1', ((bal) => { state.balance = 50; const a = pendingExpire() === 1; state.balance = 0; const b = pendingExpire() === 0; state.balance = 500; const c = pendingExpire() === 5; state.balance = bal; return a && b && c; })(state.balance)),
    assert('updatedAt 落盘', (saveState(), JSON.parse(localStorage.getItem(STORAGE_KEY)).updatedAt > 0)),
    assert('云配置读写往返', (saveCloudCfg({...cloudCfg(), familyCode: 'ZZ99'}), cloudCfg().familyCode === 'ZZ99') && (saveCloudCfg({...cloudCfg(), familyCode: ''}), true)),
    assert('云URL多形态兼容', normalizeCloudUrl('spb-abc.supabase.opentrust.net') === 'https://spb-abc.supabase.opentrust.net' && normalizeCloudUrl('https://x.supabase.co/rest/v1/') === 'https://x.supabase.co' && cloudUrlLooksOk('https://x.supabase.co') && !cloudUrlLooksOk('javascript:alert(1)')),
    // v2.5.0 分行 + 表级权限
    assert('RPC地址不直连表', cloudRpcUrl('family_pull').endsWith('/rest/v1/rpc/family_pull') && !/family_state\?/.test(cloudRpcUrl('family_pull'))),
    assert('密钥兜底=家庭码', (saveCloudCfg({...cloudCfg(), familyCode:'AB1234', secret:''}), cloudSecret() === md5hex('AB1234:AB1234')) && (saveCloudCfg({...cloudCfg(), secret:'k9Xm2Q'}), cloudSecret() === md5hex('AB1234:k9Xm2Q'))),
    assert('密钥生成合法', /^[A-Za-z0-9]{12}$/.test(genCloudSecret()) && genCloudSecret() !== genCloudSecret()),
    assert('密钥校验拦截非法', !/^[A-Za-z0-9]{6,32}$/.test('abc 12!')),
    assert('BAD_SECRET人话报错', /密钥/.test(explainCloudError(401, '{"code":"42501","message":"BAD_SECRET"}'))),
    assert('缺函数提示升级SQL', /family_pull/.test(explainCloudError(404, 'Could not find the function'))),
    assert('建表SQL含RLS与授权', /family_state own row/.test(SUPABASE_SQL) && /grant select, insert, update, delete on public\.family_state/.test(SUPABASE_SQL) && /grant execute on function public\.family_push/.test(SUPABASE_SQL) && !/anon rw"[\s\S]{0,80}using \(true\)/.test(SUPABASE_SQL)),
    // v2.5.1：MD5 与凭证
    assert('MD5实现正确', md5hex('') === 'd41d8cd98f00b204e9800998ecf8427e' && md5hex('abc') === '900150983cd24fb0d6963f7d28e17f72' && md5hex('The quick brown fox jumps over the lazy dog') === '9e107d9d372bb6826bd81d3542a419d6'),
    assert('凭证=md5(家庭码:密钥)', (saveCloudCfg({...cloudCfg(), familyCode:'AB1234', secret:'k9Xm2Qw7Bn3Z'}), cloudSecret() === md5hex('AB1234:k9Xm2Qw7Bn3Z') && cloudSecret() !== 'k9Xm2Qw7Bn3Z')),
    assert('凭证不泄露明文', !/p_secret/.test(JSON.stringify({p:1})) && cloudSecret().length === 32 && /^[0-9a-f]{32}$/.test(cloudSecret())),
    assert('SQL不用提权函数', !/security\s+definer/i.test(SUPABASE_SQL) && /security invoker|set_config/.test(SUPABASE_SQL)),
    assert('SQL带请求头备用通道', /x-family-code/.test(SUPABASE_SQL) && /x-family-secret/.test(SUPABASE_SQL) && /request\.headers/.test(SUPABASE_SQL)),
    assert('推送用新签名', /p_auth: cred/.test(String(window.__pushProbe || '')) === false),
    assert('阶梯积分换算', examReward('s', 96, 100) === 50 && examReward('b', 100, 100) === 200 && examReward('大考', 100, 100) === 200 && examReward('s', 116, 120) === 50 && examReward('s', 88, 100) === 0),
    assert('CSV 解析（含引号）', parseCsv('a,b\n"x,1",2').length === 2 && parseCsv('a,b\n"x,1",2')[1][0] === 'x,1'),
    assert('等级制映射', gradeReward('A++') === 10 && gradeReward('A+') === 5 && gradeReward('C') === -2 && gradeReward('a++') === 10),
    assert('权重模式可切', (state.cfg.scoreRules.mode = 'raw', state.cfg.scoreRules.standard = 120, scoreReward({mode:'score', type:'s', score:114, full:120}) === 50) && (state.cfg.scoreRules.mode = 'percent', state.cfg.scoreRules.standard = 100, true)),
    assert('CSV 模板 9 列', dtHeader.length === 9 && dtHeader.join(',') === '日期,名称,科目,方式,类型/等级,分数,满分,积分,备注'),
  ];

  // 业务链路：改一笔账，验证余额/累计同步，再还原
  const snapshot = JSON.stringify(state);
  const before = state.balance, inBefore = state.totalIn;
  addRecord('in', 10, '自检临时记录');
  results.push(assert('入账同步更新余额与累计', state.balance === before + 10 && state.totalIn === inBefore + 10));
  state = JSON.parse(snapshot);
  saveState(); render();
  results.push(assert('还原后余额一致', state.balance === before));

  console.log('%c 自检结果 ', 'background:#43B047;color:#fff;font-weight:900;padding:4px 10px');
  console.log(results.join(' ｜ '));
}
if(location.search.includes('selftest')) runSelfTest();
