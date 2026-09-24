# AppGallery Connect 人工上架门禁

以下内容必须由有权限的华为开发者账号在真实生产应用中完成并保留截图/记录，不能用环境变量或本地文件伪造：

- [ ] 创建 HarmonyOS NEXT 应用，名称和 Bundle 与 `listing.json` 完全一致。
- [ ] 导入正式发布证书、Profile 与 `agconnect-services.json`，三层签名校验通过。
- [ ] 开通 Push、IAP、Map、Site、Location，并核对发布 Profile 中的受限权限。
- [ ] 创建并审核月付、年付订阅和消耗型配额商品，服务端映射与 AGC Product ID 一致。
- [ ] 上传签名 App Pack，并选择手机、平板、2in1 支持范围。
- [ ] 按 `listing.json` 填写中英文介绍、新功能、分类、资费和审核说明。
- [ ] 使用已签名 Release 在通过验收的手机及折叠屏/平板采集真实截图；禁止用设计稿冒充运行截图。
- [ ] 填写敏感权限理由，必须与 `module.json5` 和 `privacy-labels.json` 一致。
- [ ] 关联鸿蒙商家端专用隐私政策、个人信息收集清单及数据主体权利入口。
- [ ] 按 `privacy-labels.json` 如实填写隐私标签，并核对第三方处理方。
- [ ] 完成内容分级、版权/软件著作权或代理资质、备案/核准信息和审核联系人。
- [ ] 通过私密审核渠道提供绑定且启用的商家测试账号；不得把密码、验证码或密钥写入 Git。
- [ ] 完成手机及展开设备的 31 功能面、权限拒绝、Push 深链、IAP 沙箱和更新验收。
- [ ] 审核通过后创建生产 `merchant-harmony` 发布记录，并确认 AppGallery 详情链接可访问。

全部完成后，才可在同一受控发布会话中设置 `HUAWEI_APPGALLERY_LISTING_VERIFIED=1`。该变量只是人工确认的会话标记，不会替代证据文件或华为后台状态。
