# 开发任务：金属计算器（复刻 + 增强）

> 把本文件整份交给编码 Agent（Codex）。**本提示词是自包含的**：所有需要的数据、公式、接口契约、验收标准都已写在下面，你不需要看任何截图或外部资料即可完成开发。
>
> 视觉参考（可选，不必读）：`/Users/mac/Downloads/逆向/` 下有 27 张竞品截图。**不要依赖它们**，下面已把可提取信息全部结构化。

---

## 0. 一句话目标

在本仓库的原生微信小程序 `@jiujiu/ledger-mp` 中新增一个**「金属计算器」分包**，复刻竞品「超级金属计算器」的全部能力（6 大材料类 × 65 个材质组合的理论重量与参考价格计算），并在其上做出竞品没有的增强（历史、报价单、导出、与下料/订单成本联动），配套后端价格配置接口与 admin-pc 维护页。

---

## 1. 仓库与硬性约定（违反即返工）

**仓库**：`/Users/mac/Projects/Xujiache-shangcheng-5.12`（pnpm monorepo）。
**开工前必读**：根 `AGENTS.md`、`docs/门窗利账/DESIGN_门窗利账.md`、`packages/ledger-mp/README.md`。

| 约定 | 要求 |
| --- | --- |
| 小程序技术栈 | **原生微信小程序 + TypeScript**。`packages/ledger-mp` **不得**依赖 `@jiujiu/shared`，不得引入 uni-app / 任何 UI 框架 / 任何 npm 运行时依赖 |
| 分支 | 在当前分支或 `feat/ledger-mp` 上工作，**不要合并 main**，不要 rebase 他人提交 |
| 统一响应壳 | 后端一律 `{ code:0, data, message, msg, traceId, timestamp }`，HTTP 恒 200（第三方回调除外）。**沿用现有拦截器，不要手写返回结构** |
| 限流 | `ThrottlerModule` **只有 default 单桶**。端点级覆盖一律 `@Throttle({ default: { limit: N, ttl: 60_000 } })`。**绝不注册第二个桶** |
| 金额口径 | 服务端权威。本模块吨价以**元/吨**、金额以**元（整数分存储见 §5.3）**；**禁止 `toLocaleString`**（真机不一致，已有教训），千分位用 `utils/format.ts` 的正则实现 |
| Prisma | `prisma/migrations/` 被 .gitignore。**本任务不新增表**（见 §6.2），如确需新增必须同步产出 `deploy/*.sql` 幂等脚本并在文档登记 |
| 密钥 | 一律 `.env`，不提交 git |
| 敏感/隐私 | 小程序 `__usePrivacyCheck__` 已有，新增页面不得引入新的个人信息采集 |
| 文档 | 产物放 `docs/金属计算器/`（6A：ALIGNMENT / DESIGN / TASK / ACCEPTANCE），完成后回填 |

**禁止事项**：不得改动 `/api/v1/u/*`、`/m/*`、`/p/*`（平台域除本任务新增页外）任何现有接口；不得改商城四端；不得删除或重命名现有文件；不得为了让测试通过而降低或删除现有断言。

---

## 2. 产品定义

**是什么**：给门窗厂/钢构/机加工从业者用的**金属材料理论重量与参考价格速算器**。
**核心价值**：选材料 → 填尺寸 → 立刻得到「理论重量 / 总重量 / 参考总价」，一键复制发客户。
**与现有产品的关系**：`门窗利账` 已有「优化下料 / 三角 / 圆弧 / 玻璃 K 值 / 报价明细 / 订单成本」，**唯独缺"材料算价"这一环**。本模块补上它，形成闭环：

```
材料算价（本模块） → 优化下料排版 → 报价明细 → 订单成本 → 利润报表
```

**变现**：竞品靠 banner 广告。**我们不投广告**，采用现有会员制（§6.4）。

---

## 3. 页面与交互规格

### 3.1 路由与包结构

```
packages/ledger-mp/miniprogram/subpackages/metal/
├── index/index.{ts,wxml,wxss,json}          # 金属计算器首页（6 类入口）
├── calc/index.{ts,wxml,wxss,json}           # 通用计算页（6 类共用，配置驱动）
├── quote/index.{ts,wxml,wxss,json}          # P2 多行报价单
├── history/index.{ts,wxml,wxss,json}        # P1 历史记录
└── data/materials.ts                        # 材质/密度/公式/字段配置（单一数据源）
```

- 在 `miniprogram/app.json` 的 `subPackages` 增加 `{ "root": "subpackages/metal", "pages": [...] }`。
- 在 `preloadRule` 为 `pages/home/index` 追加 `subpackages/metal`（与 workbook 并列，`network: "wifi"`）。
- 首页入口：在 `pages/home/index` 现有工具宫格**新增一张卡片**「金属计算器」，`navigateTo('/subpackages/metal/index/index')`。

> ⚠️ **必做联动改动**：新增分包页面会让两个硬编码断言失败，必须同步改为**从 `app.json` 动态推导**：
> - `packages/ledger-mp/scripts/verify-routes.mjs:10,33`（现在硬编码主包 `36` 与 shim `12`）
> - `scripts/verify-page-transitions.cjs:397`（现在硬编码 `routes.length === 54`，而实际已是 60 —— 这个断言**当前就是红的**，顺手修掉）
> 改为断言「注册路由数 === 实际文件数」与「无重复」，不要写死数字。

### 3.2 首页（`subpackages/metal/index/index`）

- 自定义导航（复用现有 `lz-header`），标题「金属计算器」。
- 6 张大卡片，2 列 3 行，每张：线性图标 + 名称：

| id | 名称 | 副标题（一行说明） |
| --- | --- | --- |
| `plate` | 板材类 | 钢板 · 铜板 · 铝板，按张计算 |
| `section` | 型材类 | 角钢 · 槽钢 · 工字钢 · H型钢 · C型钢 |
| `squareTube` | 方管类 | 方矩管，按米计算 |
| `flatBar` | 扁排类 | 扁钢 · 铜排 · 铝排 |
| `roundTube` | 圆管类 | 圆管 · 焊管，按米计算 |
| `roundBar` | 圆棒类 | 圆钢 · 铜棒 · 铝棒 |

- 底部：版本号 + 「意见反馈」入口（复用现有 `pages/feedback/index`）。

### 3.3 通用计算页骨架（6 类**完全同构**，配置驱动）

```
① 自定义导航： < 返回   金属计算器-{类名}        [微信胶囊]
② 一级材料 tab（5 个，横向可滑，选中＝品牌色实底）
③ 二级牌号 tab（2–5 个，选中＝浅色实底）
④ 价格条（浅底卡片，两栏）
   ┌────────────────────────┬──────────────────────────────────┐
   │ 填写实际吨价  [输入框] ×│ 最近参考:3306元/吨   ← 数值用强调色 │
   │                        │ 更新时间：2026-09-29 10:21        │
   │                        │ 或：说明：根据今日基准价+加工费暂估 │
   └────────────────────────┴──────────────────────────────────┘
   · 「×」清空后回落到服务端参考价
   · 手动填写后，价格条右侧改为「已用实际吨价」
⑤ 尺寸录入卡（白卡，2 列，每输入框右侧带单位）
⑥ 密度行： 密度(可修改) [7.85 ×] g/cm³   ｜ 线重：3.770 kg/m
   · 板材类**不显示线重**；其余 5 类显示
   · 密度输入框右侧有「×」可恢复该牌号默认密度
⑦ 报价设置（默认折叠，标题「报价设置（展开增加报价系数/加工费）」）
   展开后两列： 报价系数 [1.00]   加工费 [0.00 元]
⑧ 结果卡（3 行，每行右侧一个「复制」按钮）
   理论重量：3.770 kg/m        复制
   总重量：  3.770 kg / 共1米   复制
   参考总价：13.97 元           复制
⑨ 主按钮： [ 复制完整结果 ]（通栏）
⑩ 免责提示（次要色小字）：
   提示：理论重量和价格仅供参考，实际以过磅和供货商报价为准
⑪ 【增强】操作行： [加入报价单] [查看历史] [保存为常用]
```

**交互细则**：
- 所有输入即时计算（无需「计算」按钮），`input` 事件节流 200ms 落数据。
- 数值输入用 `type="digit"`；空值/非法值不报错，结果显示 `0.000` / `0.00`。
- 单位切换一律不做（竞品也没有），避免引入换算歧义。
- 数字格式：重量保留 **3 位小数**，金额保留 **2 位小数**，吨价整数带千分位。
- 切换材料 tab / 牌号 tab 时：**保留已输入的尺寸**，仅重置密度为该牌号默认值（若用户手动改过密度则保留并提示一次）。
- `复制完整结果` 的文本格式固定为：

```
【{类名} - {牌号}】
规格：{尺寸描述}
理论重量：3.770 kg/m
总重量：3.770 kg（共 1 米）
参考总价：13.97 元（吨价 3706 元/吨）
报价系数：1.00　加工费：0.00 元
——————
重量与价格仅供参考，实际以过磅和供货商报价为准
```

### 3.4 各类的输入字段与结果单位

| 类 | 输入字段（顺序即展示顺序） | 尺寸描述文案 | 结果单位 |
| --- | --- | --- | --- |
| 板材类 | 长度 mm、宽度 mm、厚度 mm、数量 **张**（整数，默认 1） | `1200×2400×5mm × 3张` | 理论重量 `kg/张`，总重量 `kg / 共N张` |
| 型材类 | **型号**（文本，如 `50*5`）、实际厚度 mm、长度 m（默认 1） | `角钢 50*5，实厚5mm，长10m` | `kg/m`，`kg / 共N米` |
| 方管类 | 外长 mm、外宽 mm、壁厚 mm、长度 m（默认 1） | `80×40×2.0mm，长6m` | `kg/m`，`kg / 共N米` |
| 扁排类 | 宽度 mm、厚度 mm、长度 m（默认 1） | `40×5mm，长6m` | `kg/m`，`kg / 共N米` |
| 圆管类 | 外径 mm、壁厚 mm、长度 m（默认 1） | `Φ32×1.5mm，长6m` | `kg/m`，`kg / 共N米` |
| 圆棒类 | 直径 mm、长度 m（默认 1） | `Φ20mm，长6m` | `kg/m`，`kg / 共N米` |

---

## 4. 数据规格（**本任务的核心，必须逐字对齐**）

### 4.1 材质全表（6 类 × 65 组合）

字段含义：`id` / `label` / 默认密度 `ρ`(g/cm³) / 参考吨价(元/吨，**种子默认值，生产以后台配置为准**) / `priceMode`（`live`=有采集时间戳，可对接外部行情；`estimate`=估算，展示「根据今日基准价+加工费暂估」）。

#### 板材类 `plate`（按张）
| 一级 | 二级牌号 | id | ρ | 参考吨价 | priceMode |
| --- | --- | --- | --- | --- | --- |
| 碳钢 | 热轧板 | `plate.carbon.hot` | 7.85 | 3306 | live |
| 碳钢 | 冷轧板 | `plate.carbon.cold` | 7.85 | 3306 | live |
| 碳钢 | 中厚板 | `plate.carbon.medium` | 7.85 | 3306 | live |
| 不锈钢 | 201不锈钢 | `plate.ss.201` | 7.93 | 12765 | live |
| 不锈钢 | 304不锈钢 | `plate.ss.304` | 7.93 | 12765 | live |
| 不锈钢 | 316不锈钢 | `plate.ss.316` | 7.98 | 12765 | live |
| 紫铜 | T2紫铜板 | `plate.cu.t2` | 8.93 | 114730 | estimate |
| 黄铜 | H62黄铜板 | `plate.brass.h62` | 8.50 | 71963 | estimate |
| 黄铜 | H59黄铜板 | `plate.brass.h59` | 8.50 | 71963 | estimate |
| 镀锌板 | 热镀锌板 | `plate.gi.hot` | 7.85 | 4168 | live |
| 镀锌板 | 镀铝锌板 | `plate.gi.alzn` | 7.85 | 4168 | live |
| 镀锌板 | 电镀锌板 | `plate.gi.electro` | 7.85 | 4168 | live |

#### 型材类 `section`（按米，**有型号规格表**）
| 一级 | 二级牌号 | id | ρ | 参考吨价 | priceMode |
| --- | --- | --- | --- | --- | --- |
| 碳钢型材 | 角钢 | `section.carbon.angle` | 7.85 | 3706 | estimate |
| 碳钢型材 | 槽钢 | `section.carbon.channel` | 7.85 | 3706 | estimate |
| 碳钢型材 | 工字钢 | `section.carbon.ibeam` | 7.85 | 3706 | estimate |
| 碳钢型材 | H型钢 | `section.carbon.hbeam` | 7.85 | 3706 | estimate |
| 碳钢型材 | C型钢 | `section.carbon.cpurlin` | 7.85 | 3706 | estimate |
| 不锈钢型材 | 304不锈钢型材 | `section.ss.304` | 7.93 | 15265 | estimate |
| 不锈钢型材 | 316L不锈钢型材 | `section.ss.316l` | 7.98 | 15265 | estimate |
| 铝型材 | 6063铝型材 | `section.al.6063` | 2.70 | 27610 | estimate |
| 铝型材 | 6061铝型材 | `section.al.6061` | 2.70 | 27610 | estimate |

#### 方管类 `squareTube`（按米）
| 一级 | 二级牌号 | id | ρ | 参考吨价 | priceMode |
| --- | --- | --- | --- | --- | --- |
| 碳钢 | Q235B黑方管 | `square.carbon.q235b` | 7.85 | 4306 | estimate |
| 碳钢 | 热镀锌方管 | `square.carbon.hotgi` | 7.85 | 4306 | estimate |
| 碳钢 | 冷镀锌方管 | `square.carbon.coldgi` | 7.85 | 4306 | estimate |
| 不锈钢 | 201不锈钢方管 | `square.ss.201` | 7.93 | 10159 | estimate |
| 不锈钢 | 304不锈钢方管 | `square.ss.304` | 7.93 | 10159 | estimate |
| 不锈钢 | 316L不锈钢方管 | `square.ss.316l` | 7.98 | 10159 | estimate |
| 紫铜 | T2紫铜方管 | `square.cu.t2` | 8.93 | 114730 | estimate |
| 紫铜 | TP2紫铜方管 | `square.cu.tp2` | 8.93 | 114730 | estimate |
| 黄铜 | H62黄铜方管 | `square.brass.h62` | 8.50 | 73463 | estimate |
| 黄铜 | H59黄铜方管 | `square.brass.h59` | 8.50 | 73463 | estimate |
| 铝材 | 6063铝方管 | `square.al.6063` | 2.70 | 27610 | estimate |
| 铝材 | 6061铝方管 | `square.al.6061` | 2.70 | 27610 | estimate |

#### 扁排类 `flatBar`（按米）
| 一级 | 二级牌号 | id | ρ | 参考吨价 | priceMode |
| --- | --- | --- | --- | --- | --- |
| 扁铁 | 热轧 | `flat.iron.hot` | 7.85 | 3606 | estimate |
| 扁铁 | 冷轧 | `flat.iron.cold` | 7.85 | 3606 | estimate |
| 扁铁 | 热镀锌 | `flat.iron.hotgi` | 7.85 | 3606 | estimate |
| 扁铁 | 冷镀锌 | `flat.iron.coldgi` | 7.85 | 3606 | estimate |
| 扁铁 | 304不锈钢 | `flat.iron.304` | 7.93 | 3606 | estimate |
| 铜排 | T2紫铜排 | `flat.cu.t2` | 8.93 | 114730 | estimate |
| 铜排 | H62黄铜排 | `flat.brass.h62` | 8.50 | 73463 | estimate |
| 铝排 | A00铝排 | `flat.al.a00` | 2.70 | 25610 | estimate |
| 铝排 | 6063铝排 | `flat.al.6063` | 2.70 | 25610 | estimate |
| 铝排 | 6061铝排 | `flat.al.6061` | 2.70 | 25610 | estimate |

#### 圆管类 `roundTube`（按米）
| 一级 | 二级牌号 | id | ρ | 参考吨价 | priceMode |
| --- | --- | --- | --- | --- | --- |
| 碳钢管 | Q235B焊管 | `rtube.carbon.q235b` | 7.85 | 4106 | estimate |
| 碳钢管 | 热镀锌管 | `rtube.carbon.hotgi` | 7.85 | 4106 | estimate |
| 碳钢管 | 冷镀锌管 | `rtube.carbon.coldgi` | 7.85 | 4106 | estimate |
| 不锈钢管 | 201不锈钢管 | `rtube.ss.201` | 7.93 | 10659 | estimate |
| 不锈钢管 | 304不锈钢管 | `rtube.ss.304` | 7.93 | 10659 | estimate |
| 不锈钢管 | 316L不锈钢管 | `rtube.ss.316l` | 7.98 | 10659 | estimate |
| 紫铜管 | T2紫铜管 | `rtube.cu.t2` | 8.93 | 115730 | estimate |
| 紫铜管 | TP2紫铜管 | `rtube.cu.tp2` | 8.93 | 115730 | estimate |
| 黄铜管 | H62黄铜管 | `rtube.brass.h62` | 8.50 | 72963 | estimate |
| 铝管 | 6063铝管 | `rtube.al.6063` | 2.70 | 27110 | estimate |
| 铝管 | 6061铝管 | `rtube.al.6061` | 2.70 | 27110 | estimate |

#### 圆棒类 `roundBar`（按米）
| 一级 | 二级牌号 | id | ρ | 参考吨价 | priceMode |
| --- | --- | --- | --- | --- | --- |
| 碳钢圆钢 | Q235B圆钢 | `rbar.carbon.q235b` | 7.85 | 3606 | estimate |
| 碳钢圆钢 | 45#圆钢 | `rbar.carbon.45` | 7.85 | 3606 | estimate |
| 碳钢圆钢 | 40Cr圆钢 | `rbar.carbon.40cr` | 7.85 | 3606 | estimate |
| 不锈钢棒 | 304不锈钢棒 | `rbar.ss.304` | 7.93 | 14265 | estimate |
| 不锈钢棒 | 316L不锈钢棒 | `rbar.ss.316l` | 7.98 | 14265 | estimate |
| 紫铜棒 | T2紫铜棒 | `rbar.cu.t2` | 8.93 | 112430 | estimate |
| 黄铜棒 | H62黄铜棒 | `rbar.brass.h62` | 8.50 | 70963 | estimate |
| 黄铜棒 | H59黄铜棒 | `rbar.brass.h59` | 8.50 | 70963 | estimate |
| 铝棒 | 6061铝棒 | `rbar.al.6061` | 2.70 | 26110 | estimate |
| 铝棒 | 6063铝棒 | `rbar.al.6063` | 2.70 | 26110 | estimate |
| 铝棒 | 7075铝棒 | `rbar.al.7075` | 2.81 | 26110 | estimate |

> 上表参考吨价采集于 2026-09-30，**仅作种子默认值**。生产环境一律读后台配置（§6.2），不得硬编码在小程序里作为最终价格来源（可留作离线兜底）。

### 4.2 计算公式（**必须写纯函数 + 单测**）

单位约定：尺寸输入 mm（长度字段除外，为 m）；ρ 为 g/cm³；输出 kg。

```ts
// 板材：每张重量
perSheetKg = L_mm * W_mm * T_mm * rho / 1e6

// 扁排：每米重量
perMeterKg = W_mm * T_mm * rho / 1000

// 圆棒：每米重量
perMeterKg = Math.PI * D_mm * D_mm / 4 * rho / 1000

// 圆管：每米重量
perMeterKg = Math.PI * (D_mm - t_mm) * t_mm * rho / 1000

// 方管：每米重量
perMeterKg = (A_mm + B_mm - 2 * t_mm) * 2 * t_mm * rho / 1000

// 型材：查规格表（见 4.3），不使用公式
perMeterKg = specTable.lookup(type, model, actualThickness)
```

**总重量**：`板材 = perSheetKg * 数量`；其余 `= perMeterKg * 长度m`。

**必须通过的单测（已知值，用于防止公式被改错）**：

| 用例 | 期望 |
| --- | --- |
| 角钢 50×5（查表） | 3.77 kg/m |
| 板材 1000×2000×5mm，ρ7.85 | 78.500 kg/张 |
| 扁排 40×5mm，ρ7.85 | 1.570 kg/m |
| 圆棒 Φ20mm，ρ7.85 | 2.466 kg/m |
| 圆管 Φ32×1.5mm，ρ7.85 | 1.128 kg/m |
| 方管 80×40×2.0mm，ρ7.85 | 3.642 kg/m |

（容差 ±0.005，四舍五入到 3 位小数比对。）

### 4.3 型材规格表（**本任务唯一的重活，务必按来源填写**）

型材类不能用公式，必须内置「型号 → 理论线重」规格表。要求：

1. 覆盖下列标准，**至少包含常用规格**：
   - 等边角钢 `GB/T 706`（如 20×3 … 200×24）
   - 槽钢 `GB/T 706`（5# … 40#）
   - 工字钢 `GB/T 706`（10# … 63#）
   - H型钢 `GB/T 11263`（HW/HM/HN 常用系列）
   - C型钢 `GB/T 6723`（C80…C250，按厚度分档）
   - 铝型材 40 系列 / 30 系列 / 20 系列（按截面型号如 `4040`、`3030`、`2020`，按壁厚给线重）
2. 数据结构：

```ts
interface SpecRow {
  model: string          // 归一化后的型号，如 "50*5"、"4040"、"10#"
  aliases: string[]      // 兼容写法，如 ["50x5","50×5","L50*5"]
  thicknessMm?: number   // 型号隐含厚度（用于自动回填"实际厚度"）
  kgPerM: number         // 理论线重 kg/m
  source: string         // 数据来源，如 "GB/T 706-2016 表A.1"
}
```

3. **型号归一化规则**：大小写不敏感；`*`、`x`、`×`、`X` 视为同一分隔符；去掉空格；中文角标（如 `＃`）归一为 `#`；支持输入 `L50*5`、`∠50*5` 自动映射到 `50*5`。
4. **查表行为**：
   - 命中 → 自动回填「实际厚度」为该型号标称厚度（用户可改），`线重` 显示表值。
   - 未命中 → **不得瞎猜**。显示提示「未收录该型号，请手动填写密度或选择相近规格」，并允许用户改用「按尺寸计算」模式（提供等效公式：角钢 `t*(2b-t)`、槽钢/工字钢按简化式，且**明确标注为估算**）。
   - 「实际厚度」与标称厚度不一致时（下差料）：按 `线重 × (实际厚度 / 标称厚度)` 线性修正，并在结果区标注「按实厚修正」。
5. **数据纪律（重要）**：规格表数值**必须来自国标或权威手册**。凡是你无法确认的值，**必须**在 `data/specTable.ts` 中用 `// TODO: 待核实（来源：xxx）` 标注，并**在交付说明里列出所有 TODO 项清单**。**严禁编造数值。**
6. 为规格表写一个 `verify-metal.ts` 校验脚本，至少断言 §4.2 表中的已知值与「型号归一化」的若干组用例。

---

## 5. 价格体系与报价算法

### 5.1 吨价取值优先级

```
实际吨价（用户本次手填）  >  服务端下发的参考吨价  >  本地种子默认值（离线兜底）
```

### 5.2 报价公式

```
总重量kg = Σ(按 §4.2)
吨价(元/吨) = §5.1 取值
参考总价(元) = 总重量kg / 1000 * 吨价 * 报价系数 + 加工费
```

- 报价系数默认 `1.00`，范围 `0.01–100`，保留 2 位小数。
- 加工费默认 `0.00`，单位元，范围 `0–9999999`。
- 结果保留 2 位小数。

### 5.3 数值安全（与仓库既有约定一致）

- 所有金额在**服务端**与**存储**中用**整数分**（`*Fen`）表示，展示层再转元。小程序内计算可用浮点，但落库/传参一律整数分。
- 所有尺寸/数量/系数必须有上限校验（建议：尺寸 ≤ 1,000,000 mm，长度 ≤ 100,000 m，数量 ≤ 100,000，系数 ≤ 100，加工费 ≤ 9,999,999 元），超限直接拒绝并返回 `1001`。
- 内存中不得出现 `NaN` / `Infinity` 传播到 UI：统一在 `fmt()` 层兜底为 `0`。

---

## 6. 后端规格

### 6.1 接口（新增 1 个控制器，挂在既有工具域下）

新建 `packages/server/src/modules/ledger/metal-tool.controller.ts`，路径与既有 `glass-tool.controller.ts` 平级：

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/v1/l/tools/metal/config` | `LedgerJwtGuard`（仅登录） | 一次性返回全部材质配置 + 密度 + 参考吨价 + 报价默认值 + `updatedAt` |
| POST | `/api/v1/l/tools/metal/quote` | `LedgerJwtGuard` + `LedgerMembershipGuard`（需会员） | 保存报价单（P2） |
| GET | `/api/v1/l/tools/metal/quotes` | 同上 | 报价单列表（分页 ≤50） |
| DELETE | `/api/v1/l/tools/metal/quotes/:id` | 同上 | 删除报价单 |

- `GET config` **必须免会员**（对齐现有「三角/圆弧/优化下料计算免费」的策略），让未登录/到期用户也能算 —— 这是引流入口。
- 限流用 `@Throttle({ default: { limit: 60, ttl: 60_000 } })`，**单桶**。
- 响应走统一壳，不手写结构。

### 6.2 配置存储：**不建新表**

复用既有 `LedgerConfig`（`schema.prisma` 中 `key String @unique` 的 KV 表），新增一行 `key = 'metal'`，值为：

```jsonc
{
  "updatedAt": "2026-09-30T10:21:00+08:00",
  "priceMode": { "plate.carbon.hot": "live", "plate.cu.t2": "estimate" },
  "prices": { "plate.carbon.hot": 3306, "plate.cu.t2": 114730 },   // 元/吨，整数
  "densities": { "plate.ss.316": 7.98 },
  "defaults": { "quoteFactor": 1.0, "processingFeeFen": 0 }
}
```

- 读取时用既有的 `normalizeLedgerConfig` 风格写一个 `normalizeMetalConfig(raw)`：逐项收口（数值取整、范围夹取、未知 id 丢弃、缺失回落种子默认值），**上限条数**（材质条目 ≤ 200），**绝不信任后台传入结构**。
- 小程序侧离线兜底用 `data/materials.ts` 的种子值。
- 报价单（P2）如果确实需要持久化，**优先**复用 `LedgerSetting` 的 `costCategories` 同款 JSONB 思路 —— 若必须新建表，则**必须**同时产出 `deploy/ledger-metal-quote-init.sql`（幂等、`IF NOT EXISTS`、级联外键）并在 `deploy/README.md` 登记。

### 6.3 校验与安全

- DTO 全部加 `class-validator`：`@IsInt` / `@Min` / `@Max` / `@IsString` + `@MaxLength`，并对 `items` 数组限长（≤ 200 行）与逐项白名单字段。
- 所有查询强制 `where userId = req.ledgerUser.id`；**DTO 不接受 `userId` 入参**。
- 报价单 JSON 体积上限 20KB（对齐既有 `cut/plans` 的 `assertCutJsonSize` 做法）。
- 吨价一律取服务端配置计算最终金额，**不信任前端传来的金额**（前端只传尺寸与 id，服务端重算）。

### 6.4 会员策略（与现有产品一致）

| 能力 | 门槛 |
| --- | --- |
| 6 类计算、复制结果、查参考价 | **免登录/免会员**（引流） |
| 历史记录（P1） | 登录即可（本地存储，不上云） |
| 报价单保存 / 云端历史 / 导出（P2） | **需有效会员**，服务端 `LedgerMembershipGuard` 兜底 |
| 到期后 | 已保存的报价单**只读可查**（对齐既有「到期后订单/统计只读」策略） |

---

## 7. admin-pc 维护页

新增平台页 `/platform/ledger/metal`（对齐既有 `views/platform/ledger/*` 的写法与 `api/ledger.ts` 封装风格）：

- 表格：材质 id / 一级分类 / 牌号 / 密度 / 参考吨价 / priceMode / 更新时间。
- 支持：批量编辑吨价（行内编辑或弹窗）、单个材质重置为种子默认、一键「全部标记为已更新（写当前时间）」。
- 顶部统计：材质总数、`live` 数量、`estimate` 数量、最近更新时间。
- 保存调用 `PUT /api/v1/p/ledger/config`（复用既有平台接口，**不要新增后台控制器**），写入 `metal` 键。
- 加 zh/en i18n（`locales/langs/zh.json`、`en.json`，参考既有 `ledgerAccounts` 等的写法）。
- **读接口不得静默吞错**：既有 `api/ledger.ts` 有若干 `catch { return 空 }` 导致页面无法区分空态与故障，**新页面不要沿用这个做法**，失败要能提示。

---

## 8. 增强功能（分期，先做 P0–P1，P2 起可分批）

| 期 | 内容 | 要点 |
| --- | --- | --- |
| **P0** | 复刻竞品全部能力 | §3、§4、§5、§6.1 config 接口 |
| **P1** | 历史记录 + 常用规格收藏 | 纯本地（`wx.setStorageSync`，键 `ledger_metal_history_v1` / `ledger_metal_favorites_v1`），按账号 id 分命名空间，最多各 200 条，支持一键重算与删除 |
| **P2** | 多行报价单 + 导出 | 一张报价单可混排 6 类材料，自动汇总总重与总价；导出**图片**（canvas 长图，超 4000px 压缩）与 **CSV**（带 BOM，**必须防公式注入**：以 `= + - @` 开头的单元格前置 `'`）；复用现有 `utils/quote-export.ts` 的分享能力 |
| **P3** | 与优化下料联动 | 「算完料 → 一键带入优化下料」；下料结果页回写「余料重量/金额」到报价单 |
| **P4** | 与订单成本联动 | 报价单 → 一键写入订单成本项（型材/玻璃/配件/人工/纱窗 或自定义成本分类），复用既有 `LedgerOrder.customCosts` 结构 |
| **P5** | 价格能力增强 | 吨价历史曲线（`stats/series` 同款画法）、涨跌提醒、多供应商比价、含税/不含税切换（13% 增值税）、按地区分价 |

**P2 的报价单数据结构（提前定死，避免返工）**：

```ts
interface MetalQuote {
  id: string
  title: string                       // 如「张先生-阳光房」
  customerId?: string                 // 复用 LedgerCustomer
  createdAt: string
  items: Array<{
    materialId: string                // 对应 §4.1 的 id
    category: 'plate' | 'section' | 'squareTube' | 'flatBar' | 'roundTube' | 'roundBar'
    spec: Record<string, number | string>  // 原始输入（尺寸/型号/数量/长度）
    density: number
    tonPriceFen: number               // 吨价，分
    quoteFactor: number
    processingFeeFen: number
    weightKg: number                  // 服务端重算
    amountFen: number                 // 服务端重算
  }>
  totalWeightKg: number
  totalAmountFen: number
}
```

---

## 9. 明确不做（避免范围失控）

- ❌ **不做广告位**（竞品靠 banner 变现，我们走会员制）。
- ❌ 不做单位切换（mm/cm/m/inch 互换）—— 竞品没有，引入换算歧义。
- ❌ 不做材料价格爬虫/外部行情抓取（`live` 模式先只展示"更新时间"，外部对接留到 P5，且必须后台可关）。
- ❌ 不做 3D 图/材料图片库。
- ❌ 不改动商城主域与其它三个前端。
- ❌ 不引入任何第三方 UI 库或 npm 运行时依赖。

---

## 10. 验收与自测（必须全部跑通并贴出结果）

```bash
pnpm --filter @jiujiu/ledger-mp typecheck          # 必须 exit 0
pnpm --filter @jiujiu/ledger-mp lint               # 必须 exit 0
pnpm --filter @jiujiu/ledger-mp test               # 必须全绿（含你新增的 verify-metal）
pnpm --filter @jiujiu/ledger-mp test:routes        # 新增分包后仍须通过（已改为动态推导）
pnpm --filter @jiujiu/server typecheck             # 必须 exit 0
pnpm --filter @jiujiu/server test -- ledger        # 相关单测必须全绿
pnpm --filter @jiujiu/admin-pc exec vue-tsc --noEmit   # exit 0
node scripts/workbook-contract.mjs                 # 契约不得漂移
```

**必交测试**：
1. `packages/ledger-mp/scripts/verify-metal.ts`：§4.2 全部已知值、型号归一化用例、边界（空输入/0/超大值/负数）、单位换算无误。
2. `packages/server/test/ledger-metal-tool.spec.ts`：`config` 接口形状、`normalizeMetalConfig` 的收口（脏数据/超限/未知 id/缺字段）、服务端重算金额、越权与限流。
3. 后端会员闸门测试：`GET config` 免会员可用、`POST quote` 无会员被 `6001` 拒绝。

**手工验收清单**（写进 `docs/金属计算器/ACCEPTANCE_金属计算器.md`，逐条打勾）：
- [ ] 首页 6 张卡片全部可达，无死链
- [ ] 6 个计算页骨架一致，材质 tab 切换正确
- [ ] 每类至少 1 个材质组合算出的重量与手算一致
- [ ] 型材型号 `50*5` 得到 3.77 kg/m，`4040` 能命中铝型材表
- [ ] 手动吨价覆盖参考价，`×` 可恢复
- [ ] 报价系数 / 加工费参与计算且结果正确
- [ ] 3 个单项复制 + 复制完整结果格式符合 §3.3
- [ ] 未登录也能算（免会员策略正确）
- [ ] 会员到期后报价单只读可查
- [ ] 断网时有种子默认值兜底，不白屏
- [ ] 免责提示在每一页都可见

---

## 11. 交付顺序（请按此顺序提交，每步可独立验证）

1. **数据层**：`data/materials.ts`（65 组合全表）+ `data/specTable.ts`（规格表）+ `utils/metal/calc.ts`（纯函数）+ `verify-metal.ts`。**先跑绿单测再写页面。**
2. **计算页**：通用 `calc/index` 配置驱动跑通 6 类（先用种子价格，不依赖后端）。
3. **首页 + 路由**：`metal/index` + `app.json` 注册 + 首页入口 + 修掉 §3.1 的两个硬编码断言。
4. **后端 config 接口** + `normalizeMetalConfig` + 单测；小程序接上服务端价格。
5. **admin-pc 维护页** + i18n。
6. **P1 历史/收藏** → 7. **P2 报价单/导出** → 8. P3–P5 按需。
9. **文档**：`docs/金属计算器/{ALIGNMENT,DESIGN,TASK,ACCEPTANCE}_金属计算器.md`，并在 `docs/README.md` 索引表登记一行。

**交付时必须同时给出**：
- 每个 `verify-*` / 单测的**实际输出**（不是"应该通过"）。
- **规格表 TODO 清单**（所有未核实数值，逐条列出）。
- 你**未验证**的事项清单（不要用"应该没问题"糊过去）。

---

## 附：关键提醒（最容易做错的地方）

1. **型材走查表，不走公式** —— 用公式算角钢会得到 3.73 而不是国标 3.77，会被用户一眼看穿。
2. **规格表严禁编造** —— 不确定就标 TODO，这比填错值安全得多。
3. **价格不硬编码为最终来源** —— 小程序里的种子价只做离线兜底，线上必须读后台配置，否则改价要发版。
4. **服务端重算金额** —— 前端传来的金额一律不信。
5. **计算免费、云端收费** —— 这是本产品的引流设计，别把 config 接口也加上会员闸门。
6. **顺手修掉那个已经红了的断言** —— `scripts/verify-page-transitions.cjs:397` 现在断言 54 而实际 60，根 `pnpm test:unit` 因此是红的；改成动态推导。
