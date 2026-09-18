# Android 正式包云端构建手册

> 范围：商家端 `top.ewsn.jingwei.merchant` 与平台端
> `top.ewsn.jingwei.platform`；DCloud/HBuilderX 5.24；Android APK；不包含 AAB、iOS 和用户端。

## 当前状态

- Java 17、Android SDK 35、build-tools 35.0.0、Gradle 8.14.3 与 AGP 8.12.0
  已在云环境验证。
- 两端 uni-app 编译器已固定为 `3.0.0-5020420260813001`，`build:app`
  均使用 Compiler 5.24 并已构建通过。
- 用户提供的 `/root/最新版.zip` 已安装到
  `/opt/dcloud-offline-sdk/5.24.2026081301`。
- 两套正式 JKS 已生成，是两个不同的证书。
- DCloud 后台已为两个正式 AppID 配置 Android 平台信息并生成离线 AppKey；
  AppKey 仅在构建时注入，没有写入 Git。
- `1.0.0/100` 的两个正式 APK 已构建完成，并通过签名、包信息、权限、ABI
  与 SHA-256 校验。
- `1.0.0/100` 已于 2026-08-27 发布到生产 MinIO，并登记到线上 APP 发布管理；
  两端启动检查接口均已返回对应的正式版本。

## 应用与证书指纹

| 端     | DCloud AppID     | Android 包名                | 正式 SHA-1                                                    |
| ------ | ---------------- | --------------------------- | ------------------------------------------------------------- |
| 商家端 | `__UNI__B06BCB4` | `top.ewsn.jingwei.merchant` | `E7:26:BA:7F:41:8F:D7:60:E7:99:4E:F6:EF:94:40:26:85:A6:F8:F6` |
| 平台端 | `__UNI__E1F72AD` | `top.ewsn.jingwei.platform` | `F6:C7:69:5D:C5:11:80:18:BF:02:29:40:CB:2D:9D:59:37:2A:A9:97` |

完整 SHA-1/SHA-256 清单位于
`/root/secure/jiujiu-android-signing/FINGERPRINTS.txt`。DCloud 后台必须为每个
AppID 分别使用对应的包名和 SHA-1 生成 AppKey。

对应的正式 SHA-256 为：

- 商家端：`E1:A0:64:DD:40:82:FD:51:AE:42:71:9F:A5:B4:28:D8:BE:15:75:9D:A5:77:6E:FF:BB:E1:BD:50:23:29:F9:C2`
- 平台端：`24:94:F8:1B:DF:D5:E2:39:F8:63:D8:7C:88:94:EC:1B:CD:2D:58:53:9E:16:D2:CA:BE:A9:D3:61:EC:E6:C3:8A`

## 一次性准备

1. 从 [DCloud Android 离线 SDK 官方页](https://nativesupport.dcloud.net.cn/AppDocs/download/android.html)
   取得与 HBuilderX 5.24.2026081301 匹配的 Android 离线 SDK。
2. 将 ZIP 上传到本环境，然后安装：

   ```bash
   pnpm android:sdk:install -- /root/最新版.zip
   ```

   安装器会验证文件名、目录结构和磁盘空间，计算原始 ZIP 的
   SHA-256，支持官方外层归档自动解包，并原子移入
   `/opt/dcloud-offline-sdk/5.24.2026081301`。

3. 在 DCloud 开发者后台用上表参数生成两个离线 AppKey，通过云环境机密
   变量注入：

   ```bash
   export DCLOUD_APPKEY_MERCHANT='<商家端 AppKey>'
   export DCLOUD_APPKEY_PLATFORM='<平台端 AppKey>'
   ```

AppKey、JKS 密码和备份口令不得写入 Git、文档或构建日志。

## 正式构建

```bash
pnpm android:release -- --target all --version-name 1.0.0 --version-code 100
```

也可将 `all` 改为 `merchant` 或 `platform`。产物位于：

```text
artifacts/android/jingwei-merchant-1.0.0-100-release.apk
artifacts/android/jingwei-merchant-1.0.0-100-release.apk.sha256
artifacts/android/jingwei-platform-1.0.0-100-release.apk
artifacts/android/jingwei-platform-1.0.0-100-release.apk.sha256
```

统一命令会依次执行：5.24 App 资源编译、DCloud 资源分发、对应 flavor
正式签名、`apksigner` 验签、包名/版本/minSdk/targetSdk/权限/ABI 校验和
APK SHA-256 生成。同时构建两端时，还会强制检查两个证书不同。

本次 `1.0.0/100` 正式产物校验值：

- 商家端 APK：`76cbdbd40e3f32ad6ee8117495deca5b6d9b8208977bdf3b2d9bb59aa013e6c5`
- 平台端 APK：`1a01351435893d12e29a992599cfea9d0523722cfafa6fc5c43b72bc9503b126`

生产公网下载地址：

- 商家端：`https://ewsn.top/oss/jiujiu-mall/apk/2026/08/mzpj03bcskfcm38q.apk`
- 平台端：`https://ewsn.top/oss/jiujiu-mall/apk/2026/08/dz4w000fo17hcpoo.apk`

以上地址已经过公网回源下载验证，响应类型为
`application/vnd.android.package-archive`，下载文件的大小、SHA-256、包名和签名均与
本地正式产物一致。发布记录为非强制更新；已安装 `versionCode=100` 的客户端不会
重复提示，后续发布更高的 `versionCode` 后才会触发应用内更新。

在产物目录验证校验文件：

```bash
cd artifacts/android
sha256sum -c *.sha256
```

## 验收版与覆盖升级

首版真机验收通过后，使用相同密钥构建 1.0.1/101：

```bash
pnpm android:release -- --target all --version-name 1.0.1 --version-code 101
```

将 1.0.1/101 上传到现有「APP 发布」后，从 1.0.0/100 验收下载、系统安装器、
覆盖升级与登录数据保留。真机还需验收登录、首页、商品/订单、图片上传、
位置、后台接口、退出重登和平台管理功能。

商家端 Android 会显示「Android 支付即将开放」；前端不调用小程序支付参数，
后端也会在任何数据库写入之前拒绝 `clientPlatform=android`。

## 正式密钥与备份

- 密钥目录：`/root/secure/jiujiu-android-signing`
- 加密备份：`/root/secure/jiujiu-android-signing-backup-20260826T123702Z.tar.gz.enc`
- 备份口令：`/root/secure/jiujiu-android-backup-passphrase.txt`

加密备份已做过完整解密列表校验。首次公开发布前，必须将加密备份与口令
分开下载到两个离线位置。正式发布后不得重新生成密钥，否则无法覆盖升级。
