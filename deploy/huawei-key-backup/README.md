# 华为调试与推送密钥加密备份

本目录只存放加密数据，不存放可直接使用的私钥。仓库当前为公开仓库。

- 加密包：`huawei-development-20260909.enc`。
- 算法：AES-256-GCM，随机 256 位密钥和 96 位 nonce，带完整性验证；载荷先 gzip 再加密。
- 范围：本次创建的推送凭证及其备用密钥、本机公私钥、登记响应和配置，以及本工程关联的 DevEco 调试密钥库、证书、CSR、Profile 和签名配置。
- 不包含手机业务数据、其他项目密钥、服务器既有 `.env`、SSH 密钥或账号凭据。
- 解密密钥仅在本机受限目录，不在仓库，不在服务器部署提示词内。丢失解密密钥后不能仅从本仓库恢复。

本机解密密钥位置：

`D:\DevEcoProjects\jingwei-local-config\github-huawei-backup-20260909.key.json`

校验示例（在仓库根目录运行，路径中含空格时保留引号）：

```powershell
node scripts/security/restore-huawei-key-bundle.mjs deploy/huawei-key-backup/huawei-development-20260909.enc "D:\DevEcoProjects\jingwei-local-config\github-huawei-backup-20260909.key.json" --verify
```

恢复时把最后一个参数改为**尚不存在、位于仓库外**的目录。程序先验证完整包和全部文件，再写出文件；不覆盖已有目录。Linux 创建目录权限 700、文件 600；Windows 目标父目录应事先配置仅当前管理员和 SYSTEM 可读的 ACL。写出时若磁盘失败，可能留下部分新文件，应核对后处理，不将不完整恢复目录作为有效凭证。

DevEco 签名配置带本机绝对路径和 IDE 加密口令，跨机器恢复需重新关联路径、团队和签名配置，尚未验证无交互跨机复用。**这些是调试材料，不是正式发布签名。**

服务器运行只需要推送服务账号 JSON，不需要整份调试签名包。本次通过既有 SSH 连接单独交接该 JSON；部署提示词会指定受限文件位置，不要求从 Git 读取明文私钥。

平台仍登记两把同账号密钥：当前使用本机生成的密钥，第一把作为备用。以后如要撤销，应先核对实际使用方，再在华为后台执行；删除本机文件不等于撤销云端权限。
