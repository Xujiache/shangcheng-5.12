# 格式转换迁移：许可闸门

- 用户已确认拥有 FlyingMouse Format 源码的商用复用权；源快照 `README.md` 第 130 行仍写有“个人免费、禁止商业转售/重新打包”。对外发布前须留存授权依据并更新最终分发条款，不能仅凭源注释判定许可。
- 源快照的 `docs/privacy-policy.html` 列出 PyMuPDF / AGPL-3.0 且源码链接是占位符。当前 Linux worker **未安装** PyMuPDF/docengine；PDF 结构化链路在明确源码提供及 AGPL 义务之前不得开启。
- 源快照内的 `bin/avs3` 包含 Windows 可执行文件和模型，但缺少其 `.gitignore` 所列的 `THIRD_PARTY_NOTICE.txt`。它只保存在只读源码快照中，Linux worker 构建时排除，不进入小程序包或运行镜像。
- FFmpeg、LibreOffice、Poppler、Tesseract、Pandoc、qpdf、Node/Python 依赖须依据最终 worker 镜像生成 SBOM 与实际许可证清单。许可检查和真实格式质量验收均通过之前，不部署生产 worker。
- 2026-09-26 已从最新候选镜像 `sha256:9827fbefd20be50df63160b5093811798642780ad9ae96b72d90b208f8bf4ffa` 生成 SPDX 2.3 清单，保存在服务器 `/root/deployment-verification/jiujiu-f39ea43-20260925/conversion-worker-453ae71.spdx.json`（1,186 条组件记录，158 条许可证标记为 `NOASSERTION`）。同目录的 `conversion-worker-453ae71-noassertion-review.json` 逐项列出缺失标记和现有证据线索；与上一镜像相比，依赖记录相同，仅镜像自身记录变化。`conversion-worker-package-inventory.json` 列出 461 个去重 Node 包及 443 个 Debian 包。生成清单不等于完成许可审查；源码授权依据和缺失标记仍待人工核对。
