/**
 * 用户相关类型契约入口
 *
 * 历史原因：核心 `User` 接口最早定义在 `auth.ts`（与登录 DTO 同文件），
 * 但平铺式契约不便维护。这里作为"用户域类型"的命名入口，
 * 后续新增 `UserProfile` / `UserPreference` / `UserDevice` 等扩展类型时挂在此文件，
 * 主入口仍走 `index.ts` 统一 re-export。
 *
 * 当前导出：
 *   - `User`：用户基础信息（含 `roleName?: string | null` —— 后端 auth.toUser 平铺
 *     `User.adminRole.name`，前端 admin-pc 用户中心 / 平台后台账号列表直接消费）
 *   - `UserRole`：账号角色枚举
 */
export type { User, UserRole } from './auth'
