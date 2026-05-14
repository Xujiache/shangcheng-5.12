# `@jiujiu/shared/icons` · 共享图标库（占位）

本目录用于沉淀跨端复用的 SVG / iconfont 图标资源。当前还未开始迁移，
四端（admin-pc / merchant-app / user-mp / platform-app）仍各自维护 icon 组件。

## 现状

- `admin-pc` 使用 Element Plus 自带 + 业务 svg
- `merchant-app` 使用 `src/components/icon/icon.vue`（svg 拼接）
- `user-mp` 使用 `src/components/icon/icon.vue`（svg 拼接）
- `platform-app` 同上

## 后续规划

待 UI 设计稿统一后，按以下步骤逐步迁移：

1. 在本目录沉淀 SVG 源文件（命名规则：`<category>-<name>.svg`）
2. 用脚本生成 iconfont 或导出为 Vue 单文件组件
3. 通过 `@jiujiu/shared/icons` 统一导入

## 不要乱加

- 单端使用的图标 → 留在对应端 `components/icon/`
- 临时业务图标 → 不要进 shared
- 必须先做命名审查 + 设计走查 → 再上 shared

## 当前结构

```
icons/
├── README.md  ← 本文件
└── (空)
```
