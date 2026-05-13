<claude-mem-context>
# Memory Context

# [商城5.0] recent context, 2026-05-13 3:19am GMT+8

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (13,829t read) | 123,651t work | 89% savings

### May 13, 2026
S77 User asked how to publish the WeChat mini program (小程序). Session examined the user-mp project configuration (uni-app + Vue 3 based) to understand build and deployment requirements for the production release. (May 13, 1:48 AM)
S78 Prepare WeChat mini program (user-mp) for publication: resolve blocking platform incompatibilities, implement cross-platform support, and validate the build output (May 13, 1:58 AM)
S79 Fix compilation failures in user-mp uni-app(x) project: resolve JavaScript syntax error and missing debug module dependency (May 13, 2:10 AM)
S80 Fixed "crypto is not defined" error in WeChat mini program (user-mp) build by replacing nanoid dependency with environment-compatible ID generation (May 13, 2:27 AM)
S81 Fix "ReferenceError: crypto is not defined" in WeChat mini-program caused by nanoid dependency attempting to access unavailable crypto API (May 13, 2:35 AM)
S82 Fix URLSearchParams ReferenceError in mini-program and ensure cross-platform browser API compatibility across the codebase (May 13, 2:47 AM)
442 2:48a 🔵 Systematic scan reveals additional Web API usage in mini-program codebase
443 " 🔵 useTencentMap.ts contains same URLSearchParams issue plus unguarded fetch() call
444 2:49a 🔵 Shared package validate.ts uses URL constructor without environment guard
445 " 🔵 isUrl validation function in shared package uses URL constructor in try-catch pattern
446 " ⚖️ Created task to systematically fix mini-program browser API compatibility issues
447 " ✅ Task to fix mini-program browser API compatibility marked as in progress
448 " 🔴 Fixed URLSearchParams in useTencentMap.ts staticImageUrl with manual query string builder
449 2:50a 🔴 Fixed fetch() API usage in useTencentMap.ts searchPlaces with uni.request()
450 " 🔵 useShopPriceRule.ts already implements proper H5/mini-program storage compatibility
451 2:51a 🔵 Mini-program build completes successfully after URLSearchParams and fetch() fixes
452 " ✅ Task to fix mini-program browser API compatibility marked as completed
S83 Fix hideTabBar:fail error in user-mp mini program with custom TabBar enabled (May 13, 2:51 AM)
453 2:57a 🔵 Dart Sass Legacy JS API Deprecation Warnings in uni-app Build
454 " 🔵 AST Compilation Warning in Address Edit Page
455 " 🔵 Module Resolution Failure for Debug Package in socket.io-parser
S84 WeChat mini-program "经纬科技商城" (EWSN Tech Shopping Mall) configuration and launch preparation - identified blocking issues and provided detailed task breakdown (May 13, 2:58 AM)
S85 WeChat mini-program "经纬科技商城" (Jingwei Tech Mall) complete launch preparation: polyfills, optimization, health checks, and submission materials (May 13, 2:58 AM)
456 3:00a ✅ WeChat mini-program polyfills and critical fixes staged for commit
457 " 🟣 Custom nanoid replacement for WeChat mini-program crypto compatibility
458 " ✅ manifest.json reformatted and permissions declared for location access
459 " 🔴 Removed problematic uni.hideTabBar() call from app lifecycle
460 3:01a 🟣 WebSocket polyfill injection for WeChat mini-program real-time chat
461 " 🟣 Platform-aware socket.io configuration for mini-program transport constraints
462 " 🟣 URLSearchParams and fetch API replacements for Tencent map integration
463 " 🟣 globalThis.crypto polyfill with getRandomValues fallback
464 " 🔵 Four polyfill and shim modules totaling 175 lines deployed for mini-program compatibility
465 " ✅ Committed mp-weixin runtime polyfills for production publish
466 3:02a 🔵 Git push rejected: local main branch behind remote (non-fast-forward)
467 " 🔵 Git branch divergence: parallel commits on local and remote main
468 " 🔵 Merge conflicts during rebase: useChatSocket.ts and manifest.json overlap
469 3:03a 🔵 Merge conflict analysis: static vs dynamic socket.io import strategies
470 " ✅ Resolved merge conflict in useChatSocket.ts by merging both approaches
471 " 🔵 manifest.json merge conflict: app-plus native config vs clean polyfill structure
472 " ✅ Resolved manifest.json merge conflict: unified multi-platform configuration
473 3:04a ✅ Rebase completed: mp-weixin polyfills rebased onto app-plus feature
474 " ✅ Pushed mp-weixin polyfills to remote: production code now deployed to GitHub
475 " 🟣 Created preflight-mp.ts health check script for mini-program pre-submission validation
476 3:05a ✅ Started clean rebuild of mp-weixin distribution package with polyfill fixes
477 " 🟣 Created comprehensive mini-program submission guide (SUBMISSION.md)
478 3:07a ✅ mp-weixin build completed successfully with all runtime polyfills
480 " 🔵 Built package app.json validated: 17 pages, custom tabbar, permissions declared
483 " 🔵 Confirmed: WebSocket polyfill bundled in dist, loaded at app initialization
485 3:08a 🔵 Production dist package structure complete: 10 directories, all components present
489 3:09a 🔵 Identified vendor.js optimization: faker.js static import inflating bundle size
490 " 🔵 Root cause identified: main.ts static import of mock module forces faker.js bundling
491 " ✅ Fixed vendor.js bloat: converted mock imports to dynamic, enables tree-shaking of faker.js
492 3:10a 🔵 Found second static import of mock module: request.ts line 10
495 " ✅ Completed vendor.js optimization: all static mock imports converted to dynamic
499 3:12a 🔵 Package size unchanged: 3.3M total, 2.9M vendor.js (faker.js not tree-shaken)
500 " 🔵 Confirmed: faker.js still bundled in vendor.js (567 references)
501 " 🟣 Created mockStub.ts: production stub for @jiujiu/shared/mock to eliminate faker.js bundling
503 3:13a ✅ Updated vite.config.ts: conditional alias for mockStub in mp-weixin production builds
505 " ✅ SUCCESSFUL: Mock stub alias eliminated faker.js, 86% package size reduction
S86 WeChat mini-program launch preparation - Confirming mchid and creating memory documentation for WeChat credentials and credentials setup (May 13, 3:18 AM)
**Investigated**: - WeChat credentials: AppID (wxe8ed8b7d9d154165), mchid (1745510292, clarified from initial ambiguity with 1450532317)
    - Backend environment variable naming: WX_PAY_MCH_ID (not WXPAY_MCH_ID)
    - Public key ID: PUB_KEY_ID_0117455102922026051200211756004802
    - Icon component implementation: 70+ SVG path icons already in place (icon.vue component complete)
    - Memory documentation structure for project knowledge retention

**Learned**: - mchid value 1745510292 is definitively correct (verified against verify-wxpay.ts and wxpay.service.ts)
    - The first mentioned mchid (1450532317) was user error in initial request, now cleared
    - Icon system uses computed path lookup with SVG viewBox 24×24 and configurable stroke/fill
    - Credentials are project-critical for payment binding and must be documented centrally

**Completed**: - All 11 technical tasks from prior session completion: polyfills (WebSocket, crypto, URLSearchParams), bundle optimization (3.3MB → 541KB), code pushed to origin/main
    - Package size verification: vendor.js reduced from 2.9MB to 125KB by eliminating faker.js via Vite alias
    - Memory documentation: created wx_credentials.md with AppID, mchid, env variable names, and rationale
    - Updated MEMORY.md index to link WX credentials reference

**Next Steps**: 1. Run preflight health check on server: `pnpm tsx scripts/preflight-mp.ts` (verifies HTTPS cert, 5 API endpoints, WebSocket /ws/chat, Tencent map)
    2. Import project to WeChat dev tools (directory: packages/user-mp/dist/build/mp-weixin, AppID auto-fills)
    3. Real device testing per docs/小程序发布/SUBMISSION.md section 8 self-test checklist (10 items)
    4. Configure WeChat backend (mp.weixin.qq.com): domains, privacy directives, payment binding with mchid 1745510292, subscription templates
    5. Upload version 1.0.0 to WeChat with provided version notes (section 7)
    6. Submit for audit review


Access 124k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>