# 正式签名与 AppGallery Connect 交接

仓库不保存私钥、密码、应用证书、Profile 或 `agconnect-services.json`。本机安全目录固定为
`/root/secure/jingwei-harmony-signing`，默认权限为目录 `0700`、文件 `0600`。

## 已生成的密钥与 CSR

- 密钥算法：EC `secp256r1`
- 签名算法：`SHA256withECDSA`
- Key Alias：`jingwei_harmony_release`
- CSR：`/root/secure/jingwei-harmony-signing/jingwei-merchant-release.csr`
- CSR SHA-256：`570d8b16934ae4dbced9fefcd35fa84a0d8f2fcf9382694a02ce39c2839efc60`

私钥只存在于 `release-key.p12`，密码只存在于 `release-signing.env`。首次公开发布前必须把整个
安全目录复制到至少两份加密离线介质；不要通过聊天、Git、工单附件或公开网盘传输。

Hvigor 要求签名配置中的密码使用本机签名材料加密。`material/` 和两个加密密码字段由
`prepare-signing-password-encryption.sh` 生成并在每次构建前验证；仓库不会保存明文、密文或
解密材料。旧安全目录可执行同一脚本完成一次性升级。

## AGC 控制台步骤

1. 在 AppGallery Connect 创建 HarmonyOS 应用，包名必须是
   `top.ewsn.jingwei.merchant`，版本为 `1.0.0/1000000`。
2. 在“证书”中上传上述 CSR，下载签发的 HarmonyOS Application Certificate。
3. 创建 Release Profile，Bundle Name 必须完全相同，并下载 `.p7b`。
4. 下载该应用对应的 `agconnect-services.json`。
5. 开通 Push Kit、IAP Kit、Map Kit、Site Kit 和 Location Kit；配置隐私声明及 IAP 沙箱账号。
6. 在 IAP 服务端配置中取得响应验签公钥，并创建 Server API ES256 密钥；将 Application ID、Issuer ID、Key ID 和私钥通过生产密钥管理注入后端，不得放入工程或 Git。
7. 将三个下载文件放入安全目录外的临时位置，执行：

   ```bash
   bash scripts/import-agc-release-materials.sh \
     /path/to/application.cer \
     /path/to/release-profile.p7b \
     /path/to/agconnect-services.json
   ```

导入脚本会遍历完整证书链，找到与本机 CSR 公钥完全一致的应用叶证书，并检查 AGC 配置属于目标
Bundle；全部通过后才复制到安全目录。它还会使用 Harmony 官方签名工具验证 Profile 签名和
Bundle Name，并检查应用证书有效期。

## 正式构建

材料齐全后执行：

```bash
bash scripts/build-signed-release.sh
```

脚本只在构建期间临时注入签名配置和 AGC 文件，退出时无论成功或失败都会恢复仓库文件；密码不会
进入 Git。构建时会启用 Hvigor 的 `appWithSignedPkg`，并且只接受内嵌 HAP 也通过验签的
`*-all-signed.app`；普通 `*-signed.app` 只代表 App Pack 容器已签名，不会被误当成可分发产物。
构建完成后强制验证主 HAP、Hypium 测试 HAP、App Pack 容器及其内部 HAP 的签名，然后把候选包复制到：

```text
/root/secure/jingwei-harmony-signing/artifacts/1.0.0/
```

只有 `release-evidence.json` 的 `releaseState` 为 `signed-release-candidate`，并且签名真机测试、
31 项设备矩阵、Push/IAP 沙箱和 AppGallery 审核门禁全部通过，才允许提交公开版本。

签名流水线本身可使用 `bash scripts/test-signed-release-pipeline.sh` 做隔离自测。该脚本仅生成短期
一次性 CA、证书和 Profile，验证构建、验签、证据及源码恢复后立即销毁；它不读取、替换或输出
正式私钥，也不会产生可分发的 AppGallery 包。
