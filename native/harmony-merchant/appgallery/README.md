# AppGallery 上架资料

此目录是 `top.ewsn.jingwei.merchant` `1.0.0/1000000` 的可审计上架资料单一真源：

- `listing.json`：中英文名称、简介、新功能、运营者、隐私链接和审核说明；
- `privacy-labels.json`：按原生源码、服务端契约和权限清单整理的数据处理声明；
- `release-checklist.md`：必须在真实 AppGallery Connect 账号和签名设备完成的项目。

运行 `node scripts/audit-appgallery-compliance.mjs` 会核对包名、版本、设备类型、文案长度、HTTPS 法律链接、系统权限与隐私标签，并拒绝常见占位信息。该审计只能证明本地材料自洽，不能代替 AppGallery 审核、版权资质、内容分级、真机截图或隐私合规法律意见。

当前字段依据华为官方发布流程整理：应用需要配置本地化介绍/特性/素材、隐私说明、隐私声明、隐私标签、版权和审核信息；中国大陆中文简短介绍上限 17 个字符、完整介绍上限 8000 个字符、新功能上限 500 个字符。敏感权限的上架说明应与 `module.json5` 的 `reason` 一致。

官方参考：

- https://developer.huawei.com/consumer/cn/doc/doccenter-submission/agc-help-release-0000002235870050
- https://developer.huawei.com/consumer/cn/doc/doccenter-submission/agc-help-release-app-privacy-desc-0000002313477969
- https://developer.huawei.com/consumer/cn/doc/doccenter-submission/agc-help-privacy-policy-app-0000002282162168

