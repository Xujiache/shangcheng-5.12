import type { LegalAgreements } from './legal.defaults'

export const MERCHANT_HARMONY_LEGAL_KEY = 'legal_agreements_merchant_harmony'
export const MERCHANT_HARMONY_LEGAL_EN_KEY = 'legal_agreements_merchant_harmony_en'

export interface PublicLegalContact {
  phone?: string | null
  email?: string | null
  hours?: string | null
}

const OPERATOR_ZH = '辽宁经纬建筑装饰有限公司'
const OPERATOR_EN = 'Liaoning Jingwei Architectural Decoration Co., Ltd.'
const EFFECTIVE_ZH = '2026 年 8 月 30 日'
const EFFECTIVE_EN = 'August 30, 2026'
const UPDATED_AT = '2026-08-30'

function clean(value?: string | null): string {
  return typeof value === 'string' ? value.trim() : ''
}

function contactZh(contact: PublicLegalContact): string {
  const rows: string[] = []
  if (clean(contact.phone)) rows.push(`- 客服电话：${clean(contact.phone)}`)
  if (clean(contact.email)) rows.push(`- 客服邮箱：${clean(contact.email)}`)
  if (clean(contact.hours)) rows.push(`- 服务时间：${clean(contact.hours)}`)
  if (rows.length === 0) rows.push('- 联系方式：请在应用“我的 → 联系我们”中查看平台当前公开联系方式')
  return rows.join('\n')
}

function contactEn(contact: PublicLegalContact): string {
  const rows: string[] = []
  if (clean(contact.phone)) rows.push(`- Support phone: ${clean(contact.phone)}`)
  if (clean(contact.email)) rows.push(`- Support email: ${clean(contact.email)}`)
  if (clean(contact.hours)) rows.push(`- Service hours: ${clean(contact.hours)}`)
  if (rows.length === 0) rows.push('- Contact: see My > Contact us in the app for the current public contact details')
  return rows.join('\n')
}

export function merchantHarmonyAgreements(
  language: string,
  contact: PublicLegalContact,
): LegalAgreements {
  if (language.toLowerCase().startsWith('en')) return merchantHarmonyEnglish(contact)
  return merchantHarmonyChinese(contact)
}

function merchantHarmonyChinese(contact: PublicLegalContact): LegalAgreements {
  return {
    user: {
      title: '《经纬科技商家端用户服务协议》',
      updatedAt: UPDATED_AT,
      body: `# 《经纬科技商家端用户服务协议》

**生效日期：${EFFECTIVE_ZH}**

本协议由您与${OPERATOR_ZH}（以下简称“我们”）就“经纬科技-商家端”HarmonyOS 应用及相关服务的使用订立。请在注册、登录或使用前完整阅读；勾选同意、注册、登录或继续使用即表示您理解并接受本协议。

## 一、适用主体与账号

1. 本应用面向依法经营的门窗行业商家及其获得授权的工作人员，不面向未满 14 周岁的儿童独立使用。
2. 您应提供真实、准确、完整并持续有效的手机号、商家主体、资质和联系人信息。
3. 请妥善保管手机号、密码、验证码及登录设备。不得出租、出售、转让账号或允许未授权人员操作。
4. 平台可以依法对商家申请、商品、经营权限及异常风险进行审核；审核中、驳回、停用等状态以平台记录为准。

## 二、服务内容

本应用提供工作台、商品与库存、订单与售后、客户、门店与员工、营销、客服、选品代理、会员、店铺设置、推送通知和应用更新等商家经营能力。支付、推送、地图定位及应用更新分别通过 HarmonyOS 和华为官方能力完成。

## 三、使用规范

您不得发布违法、虚假、侵权或误导性信息，不得刷单、欺诈、恶意退款、非法抓取、攻击系统、绕过权限或处理无权访问的客户信息。您应仅为订单履约、售后和客户服务等合法目的处理平台展示的客户资料，并采取必要的保密措施。

## 四、交易与会员

1. 商品、订单、物流、退款和佣金数据以服务端记录及适用业务规则为准。
2. HarmonyOS 会员购买通过 Huawei IAP Kit 完成。价格、续费、取消、退款和恢复购买遵循购买页说明、华为规则及适用法律。
3. 因您录入错误、违规经营或无权操作造成的损失，由责任方依法承担。

## 五、知识产权

平台软件、品牌、界面、文档及平台提供的内容归平台或相应权利人所有。您上传的商品、资质和经营内容应拥有合法权利，并授权平台在提供服务所必需的范围内存储、展示和处理。

## 六、服务变更与责任

我们会维护服务安全与可用性，但不可抗力、公共网络、系统维护、第三方服务或依法采取的措施可能导致暂时中断。我们将在合理范围内降低影响，不排除或限制法律不得排除或限制的责任。

## 七、终止、法律适用与争议

您可以停止使用并按隐私政策申请处理账号信息。严重违规、资质失效或安全风险可能导致功能限制或账号停用。本协议适用中华人民共和国法律；争议应先协商，协商不成可向运营者所在地有管辖权的人民法院起诉。

## 八、联系我们

${contactZh(contact)}`,
    },
    privacy: {
      title: '《经纬科技商家端隐私政策》',
      updatedAt: UPDATED_AT,
      body: `# 《经纬科技商家端隐私政策》

**生效日期：${EFFECTIVE_ZH}**

${OPERATOR_ZH}是“经纬科技-商家端”HarmonyOS 应用的个人信息处理者。本政策仅说明该鸿蒙商家端如何处理信息，不以 Android、小程序或其他产品的能力代替本应用的实际行为。

## 一、我们处理的信息

1. **账号与认证**：手机号、短信验证码认证结果、密码哈希、登录令牌和登录状态，用于注册、登录、找回访问和保障账号安全。我们不存储明文密码。
2. **商家入驻与资料**：主体名称、统一社会信用代码、法定代表人、联系人、联系电话、邮箱、地区、地址、经营品类、简介、头像和资质图片，用于审核、展示及经营管理。
3. **经营数据**：商品图片、描述、价格、规格、库存，订单、收货人及配送地址，物流、退款和售后凭证，客户分组与授权，门店、员工、营销、佣金、客服消息及您主动上传的图片，用于完成对应商家功能。
4. **位置**：仅当您主动使用“地图选址”或“定位到我”并授权后，处理精确或大致位置、选定坐标及地址，用于商家/门店位置填写、地址解析和地图展示。拒绝不会影响其他功能。
5. **相机与照片**：仅当您主动选择拍照或从系统照片选择器选取图片时，处理您拍摄或选中的文件，用于商品、头像、资质、聊天和售后上传。应用不读取整个相册。
6. **通知与设备标识**：在您允许通知后，处理 Huawei Push Kit 推送令牌、AAID、语言和订单/售后/客服通知偏好，用于发送您选择的业务提醒；不用于广告画像。
7. **会员购买**：当您购买会员时，处理 Huawei IAP 商品 ID、订单号、签名购买凭证、订阅状态、金额及核验结果，用于开通、续费、恢复、取消和退款处理。
8. **网络与安全日志**：服务端可能记录 IP 地址、请求时间、接口结果及必要的安全审计信息，用于防攻击、排错和履行安全义务。应用不读取通讯录、短信内容、通话记录、麦克风、Wi-Fi 列表、IMEI、OAID，也不进行个性化广告追踪。

## 二、权限调用

- **网络访问与网络状态**：连接生产接口、上传文件、接收实时消息及判断弱网；
- **精确/大致位置**：仅在地图选址时动态请求；
- **相机**：仅在您点击拍照上传时动态请求；
- **通知**：由系统授权页管理，仅用于您启用的订单、售后和客服提醒；
- **振动**：在已启用的业务提醒到达前台时提供轻微触感。

系统照片选择器、系统分享和保存图片由 HarmonyOS 在用户操作后提供，应用仅获得本次选择或分享所必要的数据。

## 三、使用、共享与委托处理

我们仅为账号认证、商家审核、经营管理、订单履约、售后、客服、支付核验、通知、安全和法律合规使用信息。根据您选择的功能，必要信息可能由华为 Push Kit、IAP Kit、Map Kit、Site Kit、Location Kit、AppGallery，以及受约束的短信、对象存储和基础云服务提供方处理。我们不出售个人信息，不为第三方广告共享个人信息。

仅在取得单独同意、履行法定义务、处理合并收购，或为您明确请求的物流/交易服务所必要时，我们才会转移或披露相应信息，并依法采取保护措施。

## 四、本地与服务端存储

1. access token、refresh token 和最小会话快照使用 HarmonyOS Asset Store 保护；主题、语言、通知偏好进入 Preferences；工作台离线快照进入应用私有加密 RDB。退出登录会清除会话凭据，清理缓存不会误删登录状态。
2. 服务端数据存储于中华人民共和国境内，并按实现目的及法律要求的最短期限保存。到期后删除或匿名化；交易、税务、争议和安全记录可能依法保留更长时间。

## 五、您的权利

您可以在“我的 → 个人资料/系统设置/账号与安全”访问和更正资料、修改密码或手机号、调整通知，并在 HarmonyOS 系统设置撤回相机、位置和通知权限。您还可以通过下列联系方式申请查询、复制、更正、删除个人信息或注销账号；依法必须留存的信息会在法定期限届满后处理。我们将在核验身份后于 15 个工作日内答复合理请求。

## 六、未成年人

本应用是商家经营工具，不面向未满 14 周岁的儿童。若发现儿童个人信息被误提交，请联系我们处理。

## 七、政策更新

功能、权限或处理目的发生实质变化时，我们会更新本政策，并依法通过应用内显著提示或其他适当方式告知。未经必要告知和同意，不会扩大个人信息处理范围。

## 八、联系我们

个人信息处理者：${OPERATOR_ZH}

${contactZh(contact)}`,
    },
    collect: {
      title: '《经纬科技商家端个人信息收集清单》',
      updatedAt: UPDATED_AT,
      body: `# 《经纬科技商家端个人信息收集清单》

**生效日期：${EFFECTIVE_ZH}**

## 一、账号与商家资质

| 信息 | 用途 | 条件 |
| --- | --- | --- |
| 手机号、短信验证结果、密码哈希、登录令牌 | 注册、登录、会话续期和安全保护 | 使用账号所必要；不保存明文密码 |
| 主体名称、信用代码、法定代表人、联系人、电话、地区、地址、经营品类、资质图片 | 商家申请、审核和持续经营 | 申请商家身份时提供 |
| 头像、店名、邮箱、简介、地图坐标 | 完善商家展示和联系资料 | 您主动填写或选择 |

## 二、经营与客户服务

| 信息 | 用途 | 条件 |
| --- | --- | --- |
| 商品、规格、价格、库存、图片 | 商品发布和履约 | 您管理商品时提供 |
| 订单、收货人、电话、地址、物流、退款、售后凭证 | 履约、售后和争议处理 | 处理相关订单时必要 |
| 客户等级/授权，门店、员工、营销、佣金数据 | 商家经营管理 | 使用对应功能时处理 |
| 客服消息、快捷回复和所选图片 | 客户沟通、已读状态和纠纷追溯 | 使用客服功能时处理 |

## 三、设备能力与华为服务

| 信息/权限 | 用途 | 条件 |
| --- | --- | --- |
| 本次拍摄或系统选择的图片 | 商品、头像、资质、聊天、售后上传 | 用户主动选择；不读取整个相册 |
| 精确/大致位置、坐标、地址 | 地图选址和地址解析 | 用户主动使用并授权 |
| Push token、AAID、语言和通知偏好 | 订单、售后、客服提醒 | 用户允许通知后，可关闭 |
| IAP 商品、订单、签名凭证、订阅状态和金额 | 会员购买核验、恢复、续费和退款 | 发起华为应用内购买时 |
| IP、请求时间、接口结果、安全日志 | 网络通信、攻击防护和排错 | 提供联网服务所必要 |

## 四、第三方处理方

| 服务 | 提供方 | 涉及信息 |
| --- | --- | --- |
| Huawei Push Kit | 华为 | 推送令牌、AAID、语言、消息投递信息 |
| Huawei IAP Kit | 华为 | 商品 ID、订单和签名购买数据 |
| Huawei Map/Site/Location Kit | 华为 | 用户授权的位置、坐标和地址关键词 |
| Huawei AppGallery | 华为 | Bundle、版本及应用分发/更新信息 |
| 短信服务 | 平台签约服务方 | 手机号和验证码投递结果 |
| 对象存储/基础云服务 | 平台签约服务方 | 用户主动上传的文件及业务数据 |

## 五、不收集项目与撤回方式

本鸿蒙商家端不读取通讯录、短信内容、通话记录、麦克风、Wi-Fi 列表、IMEI 或 OAID，不接入微信登录/微信支付/腾讯定位，也不进行个性化广告追踪。您可以在 HarmonyOS 系统设置撤回相机、位置和通知权限，在应用系统设置关闭通知分类，并通过下列联系方式行使个人信息权利。

${contactZh(contact)}`,
    },
  }
}

function merchantHarmonyEnglish(contact: PublicLegalContact): LegalAgreements {
  return {
    user: {
      title: 'Jingwei Merchant Terms of Service',
      updatedAt: UPDATED_AT,
      body: `# Jingwei Merchant Terms of Service

**Effective date: ${EFFECTIVE_EN}**

These Terms are between you and ${OPERATOR_EN} (“we”) for the Jingwei Merchant HarmonyOS application and related services. The app is intended for lawful windows-and-doors merchants and their authorized staff.

You must provide accurate account, merchant and qualification information, protect your phone, password and verification data, and use customer information only for lawful fulfilment, after-sales and support purposes. The app provides merchant workbench, products, orders, customers, stores, staff, marketing, chat, sourcing, membership, notifications and AppGallery updates. HarmonyOS membership purchases use Huawei IAP Kit and remain subject to the purchase page, Huawei rules and applicable law.

You may not publish unlawful or infringing content, manipulate transactions, commit fraud, scrape or attack systems, bypass authorization or process customer information without authority. Platform software, branding and supplied content remain the property of the relevant rights holder; you must hold the rights required for content you upload.

We may restrict features or suspend accounts for material violations, expired qualifications or security risk. These Terms are governed by the laws of the People’s Republic of China. The parties should first consult; unresolved disputes may be brought before a competent court where the operator is located.

## Contact

${contactEn(contact)}`,
    },
    privacy: {
      title: 'Jingwei Merchant Privacy Policy',
      updatedAt: UPDATED_AT,
      body: `# Jingwei Merchant Privacy Policy

**Effective date: ${EFFECTIVE_EN}**

${OPERATOR_EN} is the personal information processor for the Jingwei Merchant HarmonyOS app. This notice describes this native HarmonyOS app only.

We process phone and authentication results, password hashes and protected session tokens; merchant identity, qualifications, contacts and profile; product, order, recipient, logistics, refund, customer, staff, store, marketing and chat data; and media you explicitly select or capture. We do not store plaintext passwords.

Location is processed only after you invoke map selection or current location and grant permission. The system photo picker exposes only selected files; the app does not read the full gallery. Camera access is requested only after you choose to capture an upload. With notification permission, Huawei Push Kit token, AAID, locale and category preferences are used for order, after-sales and chat alerts, not advertising. Huawei IAP product, order, signed purchase and entitlement data is processed only for membership purchases.

The server may retain IP address, request time, result and necessary security logs. The app does not read contacts, SMS content, call history, microphone, Wi-Fi lists, IMEI or OAID and does not perform personalized advertising tracking.

Information is used for authentication, merchant review, operations, fulfilment, after-sales, support, purchase verification, notifications, security and legal compliance. Huawei Push/IAP/Map/Site/Location/AppGallery and contracted SMS, object-storage or infrastructure providers process only information necessary for the requested service. We do not sell personal information.

Session credentials are protected with HarmonyOS Asset Store; preferences use private Preferences; an encrypted private RDB may retain the latest workbench snapshot for an explicitly labelled offline fallback. Server data is stored in the People’s Republic of China for the minimum period required by purpose and law, subject to longer statutory retention for transactions, tax, disputes and security.

You can edit profile, phone, password and notifications in the app and withdraw camera, location and notification permissions in HarmonyOS settings. Contact us to request access, copy, correction, deletion or account cancellation. We aim to respond after identity verification within 15 working days. The app is not directed to children under 14.

## Contact

Processor: ${OPERATOR_EN}

${contactEn(contact)}`,
    },
    collect: {
      title: 'Jingwei Merchant Personal Information Collection List',
      updatedAt: UPDATED_AT,
      body: `# Jingwei Merchant Personal Information Collection List

**Effective date: ${EFFECTIVE_EN}**

- Account: phone, SMS verification result, password hash and protected session tokens for authentication and security.
- Merchant: legal identity, unified credit code, representative, contacts, address, categories, qualifications and optional profile fields for review and operations.
- Commerce: products, SKUs, prices, stock, orders, recipient/contact/address, logistics, refunds, evidence, customers, stores, staff, marketing and commission data for merchant operations.
- Support: chat text, quick replies and user-selected images for customer communication and read state.
- Optional device capabilities: selected/captured images; authorized precise or approximate location; Push token, AAID, locale and notification choices; Huawei IAP product, order, signed purchase and entitlement data.
- Network/security: IP, request time, result and necessary security logs.

Huawei Push Kit, IAP Kit, Map/Site/Location Kit and AppGallery process the minimum data needed for their features. Contracted SMS and infrastructure providers process a phone number, uploaded file or business data only as applicable.

The app does not read contacts, SMS content, call history, microphone, Wi-Fi lists, IMEI or OAID; it does not integrate WeChat login/payment or Tencent location, and it does not perform personalized advertising tracking. Optional permissions can be withdrawn in HarmonyOS settings.

${contactEn(contact)}`,
    },
  }
}
