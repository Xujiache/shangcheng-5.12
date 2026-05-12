<claude-mem-context>
# Memory Context

# [商城5.0] recent context, 2026-05-12 3:02pm GMT+8

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 1 obs (469t read) | 32,288t work | 99% savings

### May 12, 2026
S16 Backend API specification for multi-platform system (mini-program, merchant app, platform app, admin dashboards) - status check and readiness confirmation (May 12, 3:17 AM)
S15 Create comprehensive backend development prompt for enterprise-grade mall system (商城5.0) that requires no interface omissions, missing fields, or errors when frontend switches from Mock to real backend (May 12, 3:17 AM)
S17 Fixed menu route configuration validation errors in MenuProcessor.ts to allow absolute paths for leaf routes within menu groups (May 12, 11:52 AM)
7 11:58a 🔴 Fixed MenuProcessor path validation for menu-grouped leaf routes
S18 Fix Faker.js locale error in admin backend: "The locale data for 'lorem.word' are missing in this locale" occurring when genRefund() is called (May 12, 11:59 AM)
S19 Brand name migration: Replace all occurrences of "九九" (Jiujiu) brand with "经纬科技" (Jingwei Technology) throughout the project (May 12, 12:04 PM)
S20 Fix timeout error on platform-app stats page (http://localhost:8087/#/pages/tabbar/stats/index) displaying "连接服务器超时" (connection server timeout) (May 12, 12:22 PM)
**Investigated**: Located stats pages in platform-app and merchant-app; traced request flow through dashboard services to `/api/v1/p/dashboard` and `/api/v1/m/stats` endpoints; examined mock route registration in shared package; analyzed USE_MOCK flag logic in request utilities across all three mobile apps (platform-app, merchant-app, user-mp)

**Learned**: Root cause: USE_MOCK check was `(import.meta.env.VITE_USE_MOCK as string) === 'true'`, which only enables mock when explicitly set to 'true'. Without this env var in dev/preview, requests fall through to localhost:3001 (nonexistent backend). Mock routes exist and are fully functional; timeout occurs at transport layer, not API layer. Mock routes for both `/api/v1/p/dashboard` and `/api/v1/m/stats` return well-formed data (dashboard has overview + 30-day trend, stats has 7-day trend + 10 top products)

**Completed**: Modified USE_MOCK logic in 6 files to: `MOCK_FLAG === 'true' || (import.meta.env.DEV && MOCK_FLAG !== 'false')` — making mock the default in dev/preview unless explicitly disabled with VITE_USE_MOCK=false. Updated packages/user-mp, packages/merchant-app, and packages/platform-app (both main.ts and utils/request.ts). Verified mock endpoints respond correctly with mock data. Applied Prettier formatting and passed code style checks. Verified shared package typecheck passes

**Next Steps**: User should refresh http://localhost:8087/#/pages/tabbar/stats/index or restart platform-app dev server to observe the fix. Expect stats page to load with mock data instead of timeout error on next page load. Note: platform-app typecheck still fails on existing project configuration issues (missing @types/node, @dcloudio vue-tsc plugin) unrelated to this fix


Access 32k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>