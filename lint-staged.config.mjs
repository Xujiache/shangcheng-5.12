// lint-staged 配置（提交前对暂存文件做格式化 / lint）
//
// 为什么是函数式 + 单一 glob：
//   - eslint flat config 从「当前工作目录」解析，monorepo 里必须 cd 进对应包才能命中
//     packages/admin-pc/eslint.config.mjs；因此 admin-pc 文件走 `pnpm --filter ... exec eslint`。
//   - 所有代码文件只由这一个 glob 处理，prettier 与 eslint 在同一条目内顺序执行，
//     避免两个 glob 命中同一文件时并发写入冲突。
//   - admin-pc 的 eslint 已含 prettier 规则，eslint --fix 会再对齐一次格式，幂等无害。
//   - server 的 lint 是 prettier --check（无 eslint 工具链）；其余端真实 eslint 待后续接入。

const isAdminPc = (f) => /[/\\]packages[/\\]admin-pc[/\\]/.test(f)
const quote = (files) => files.map((f) => JSON.stringify(f)).join(' ')

export default {
  '*.{js,ts,mjs,mts,cjs,tsx,vue}': (files) => {
    const cmds = [`prettier --write ${quote(files)}`]
    const adminFiles = files.filter(isAdminPc)
    if (adminFiles.length) {
      cmds.push(`pnpm --filter @jiujiu/admin-pc exec eslint --fix ${quote(adminFiles)}`)
    }
    return cmds
  },
  '*.{json,jsonc,md,yml,yaml,scss,css}': ['prettier --write'],
}
