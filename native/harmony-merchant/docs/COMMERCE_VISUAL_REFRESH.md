# 商家端低立体图标与订单体验

## 本轮交付

- 34 个共享语义图标：`entry/src/main/resources/base/media/commerce_*_lite.png`。
- 首页、个人中心、设置、手机导航和宽屏导航共用相同资源；导航选择态不再更换轮廓。
- 深色使用中性黑灰；香槟金用于主操作、金额与选择态。启动窗口同步更新。
- 底栏高度 76vp，五个一级页面使用 `PrimaryNavigationMetrics.contentInset(safeBottom)`。
- 订单及售后列表使用横向下划线筛选、受约束的商品摘要、金额和操作区；720vp 起双列。
- 详情限制 960vp 内容宽度；地址操作分两行；发货、地址识别、分享、退款面板有遮罩、返回拦截和可滚动高度上限。
- 请求失败保留已加载列表；图片通过 `ResilientRemoteImage` 显示占位和重试。

## 图像生成说明

生成方式为内置 imagegen，每个语义独立调用一次。原始生成文件 ID 记录在
`scripts/commerce-icon-sources.json`。此清单仅用于来源追踪，APP 运行不依赖生成目录或处理工具。

共同提示词：`HarmonyOS merchant app functional icon; simplified low-relief matte ceramic and soft glass;
near-front view with slight 8-degree perspective; one clear silhouette; at most two main components;
graphite, warm gray and ivory; champagne-gold accent under 8%; subtle top-left light; readable at 24vp;
centered with transparent padding; actual PNG alpha; no words, numbers, logo, background plate, complex
scene, coin stacks, sparkles, halo, chrome, strong reflection, cast shadow, orange or blue.`

逐图主体：

| 资源后缀 | 主体 |
| --- | --- |
| home | 屋顶与简洁经营面板 |
| products | 商品箱与标签 |
| orders | 订单纸与包裹 |
| analytics | 三根递增柱形 |
| profile | 单人身份轮廓 |
| message | 消息收件箱 |
| shipment | 封装包裹与发货箭头 |
| refund | 收据与回转箭头 |
| unread | 聊天气泡与提示点 |
| rejected | 商品箱与拒绝标记 |
| store_apply | 门店与申请单 |
| customers | 两个简洁客户轮廓 |
| service | 客服耳机与气泡 |
| marketing | 扩音器与优惠标签 |
| store | 店铺门面 |
| staff | 员工工牌 |
| agency | 三节点分销网络 |
| pricing | 价格标签与尺寸标记 |
| membership | 会员盾牌 |
| support | 电话与帮助气泡 |
| settings | 简洁齿轮 |
| commission | 分流结算凭证 |
| sourcing | 商品箱与放大镜 |
| decorate | 门面与画笔 |
| share | 文件与分享箭头 |
| update | 下载箭头与托盘 |
| about | 信息册与圆形标记 |
| appearance | 明暗各半的主题圆盘 |
| cache | 存储与清理工具 |
| notifications | 通知铃铛 |
| privacy | 带锁孔的隐私盾牌 |
| security | 闭合挂锁 |
| terms | 折角协议纸 |
| personal_info | 信息核对清单 |

最后九枚使用同一简化提示词格式：`Generate a single app icon: <主体>. Simplified low-relief matte
ceramic, nearly front facing, one clear semantic silhouette, graphite and ivory, tiny champagne gold
accent under 8%, soft top-left lighting. Readable at 24px. Centered with transparent padding. Genuine
transparent PNG alpha background, no checkerboard, no text, no numbers, no logos, no scenery, no floor,
no cast shadow, no decorative frame.`

生成器部分输出是带棋盘背景的 RGB，必须分离前景并检查浅色主体是否完整；不接受仅添加一个全不透明
Alpha 通道。最终资源归一为 256×256 RGBA，保留透明留白；图片审计检查透明和不透明像素、尺寸和 80KB 预算。

## 验证范围

2026-09-05：图标、个人中心/设置、订单 UI、主题、顶部对齐、路由、交互、外观、国际化、
防重复提交、自适应性能、功能覆盖、API 契约、ArkUI 语法共 14 项快速审计通过；
109 个第一方 ArkUI 源文件无语法解析错误。语法审计只解析源码，不代表 ArkTS 类型检查或完整编译通过。
34 个最终图标合计 1,584,438 字节，最大单枚 64,040 字节；已替换的 54 个旧图标从当前树删除，
可通过 Git 历史恢复。浅深背景缩略图已人工检查，24vp 真机辨识度仍需本地验收。

本轮只运行快速 Node 源码/资源审计及 `git diff --check`。未运行 Hvigor、HAP、App Pack，
没有将静态审计视作真机验收。拉取后需本地编译并检查：

- 手机/折叠屏/平板和 200% 字体下的长订单号、商品名称、规格、金额及英文状态。
- 五个一级页往返、列表末项滚动到导航上方、主题实时切换和导航可点击性。
- 发货、地址识别、分享/撤销、售后同意/驳回、重复点击、失败重试及键盘下的面板。
- 图片空值、404、弱网、透明边缘及 24/28/40/46vp 下的辨识度。

订单仓库、模型和后端接口保持原有契约。本轮没有后端源码变更或后端部署产物。
