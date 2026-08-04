# @jiujiu/shared

经纬科技 · 共享层：Design Tokens、TS 类型、Mock 数据、工具方法、图标。

## 安装

monorepo 内部已自动 link，外部用：

```bash
pnpm add @jiujiu/shared
```

## 使用

### Design Tokens

```ts
import { colors, spacing, typography } from '@jiujiu/shared/tokens'
// 或
import { tokens } from '@jiujiu/shared/tokens'

colors.brand.primary  // '#FF4D2D'
spacing[8]            // '16px'
```

CSS 变量版：

```scss
@import '@jiujiu/shared/tokens.scss';
.btn { background: $brand-primary; }
```

```css
@import '@jiujiu/shared/tokens.css';
.btn { background: var(--brand-primary); }
```

### TS 类型

```ts
import type { Product, Order, Merchant, Withdraw } from '@jiujiu/shared/types'
```

### Mock 数据生成

```ts
import { genProducts, genOrders, mockRoutes, registerMockRoutes, mockMatch } from '@jiujiu/shared/mock'

// 直接生成
const products = genProducts(20)

// 配合拦截器
registerMockRoutes(mockRoutes)
const res = await mockMatch({ method: 'GET', url: '/api/v1/u/products?page=1&pageSize=20' })
```

### 工具

```ts
import { formatPrice, formatDate, parseAddress, resolveDisplayPrice, isInGray } from '@jiujiu/shared/utils'
```

## 目录结构

```
src/
├── tokens/       # Design Tokens（colors / spacing / typography / radius / shadow / z-index）
├── types/        # TS 类型（15 个领域）
├── mock/         # Mock 数据（factory + routes + interceptor）
└── utils/        # 工具方法（format / validate / price / hash / address / id）
```

## 构建

```bash
pnpm build
```

输出到 `dist/`，含 ESM + .d.ts。
